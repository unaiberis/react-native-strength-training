# Design: Fix active route and template N+1

## Technical Approach

Two independent fixes in one change: (1) delete one orphaned route declaration; (2) extract a shared batch-query helper replacing 5 per-row `getOne("workout_templates")` call sites with a single `getFullList` per logical request.

## Architecture Decisions

### Decision: New module placement

**Choice**: `src/lib/pocketbase/services/fetch-template-names.ts` — sibling to `sessions.ts`, `templates.ts`, etc. Keeps PocketBase service boundary clean.
**Alternatives**: Inline in each hook file, or add to `templates.ts`. Rejected — inline duplicates logic, `templates.ts` is for CRUD, not batch lookups.
**Rationale**: Existing pattern — `exercises.ts`, `prs.ts`, `wellness.ts` each own their query surface. A dedicated module is discoverable and independently testable.

### Decision: Return type `Map<string, string>`

**Choice**: `Promise<Map<string, string>>` — empty Map on failure or empty input.
**Alternatives**: `Record<string, string | undefined>`, or throwing on error. Rejected — Map offers `.get()` with `undefined` for missing keys, same ergonomics as current try/catch but without per-row overhead.
**Rationale**: Callers already do `templateName = map.get(id)`, identical ergonomics to current `.name` access. Empty Map on error preserves existing "silently skip" behavior.

### Decision: Callers collect IDs first, batch once

**Choice**: Extract `workout_template_id` collection from the loop before the `Promise.all`, call `fetchTemplateNames(ids)` once, resolve from the Map inside the loop.
**Alternatives**: Pass the session array to the helper and let it map. Rejected — tightly couples the helper to session shapes. A `string[] → Map` interface is maximally reusable.
**Rationale**: O(N) → O(1) network calls per request. The collection pass is O(N) in memory only — negligible.

## Data Flow

```
Call site (5 sites)
  │
  ├─ Collect unique workout_template_ids from session rows
  │     (filter(Boolean) + Set dedupe)
  │
  ├─ fetchTemplateNames(ids)
  │     │
  │     ├─ ids.length === 0 → return empty Map (zero network)
  │     │
  │     └─ pb.collection("workout_templates").getFullList({
  │            filter: "id='a' || id='b' || id='c'",
  │            fields: "id,name"
  │          })
  │          → Map<string, string> {"a" → "Push Day", "b" → "Pull Day"}
  │
  └─ Resolve templateName = map.get(session.workout_template_id)
        ✓ Found → templateName
        ✗ Missing → undefined/null (preserved fallback)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/_layout.tsx` | Modify | Remove `<Stack.Screen name="active" />` (line 266) |
| `src/lib/pocketbase/services/fetch-template-names.ts` | **Create** | Shared batch helper |
| `src/lib/pocketbase/services/sessions.ts` | Modify | `getSessionDetail` + `listSessions` use helper |
| `src/features/calendar/hooks/useSessionsForDate.ts` | Modify | `fetchSessionsFromPB` uses helper |
| `src/features/calendar/hooks/useCalendar.ts` | Modify | `fetchSessionsForDate` uses helper |
| `src/features/home/hooks/useHomeStats.ts` | Modify | `fetchHomeStats` uses helper |
| `src/lib/pocketbase/services/__tests__/fetch-template-names.test.ts` | **Create** | Unit tests for helper |
| `src/lib/pocketbase/services/__tests__/sessions.test.ts` | Modify | Update existing mock expectations |

## Interfaces

```typescript
// ─── src/lib/pocketbase/services/fetch-template-names.ts ───

import { pb } from "../client";

/**
 * Batch-fetch template names by IDs.
 * Deduplicates, skips empty/truthy filter, returns Map.
 * On error (filter too long, network) returns empty Map — callers degrade gracefully.
 */
export async function fetchTemplateNames(
  ids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();

  try {
    const records = await pb.collection("workout_templates").getFullList({
      filter: unique.map((id) => `id='${id}'`).join("||"),
      fields: "id,name",
      requestKey: null,
    });
    const map = new Map<string, string>();
    for (const r of (records ?? []) as unknown as Array<{ id: string; name: string }>) {
      map.set(r.id, r.name);
    }
    return map;
  } catch {
    return new Map();
  }
}
```

## Before/After — 5 Call Sites

### 1. `getSessionDetail` (sessions.ts:261-271)

```typescript
// BEFORE
if (session.workout_template_id) {
  try {
    const tmpl = await pb.collection("workout_templates").getOne(
      session.workout_template_id, { fields: "name" },
    );
    templateName = (tmpl as unknown as { name: string }).name;
  } catch { /* skip */ }
}

// AFTER
const ids = session.workout_template_id ? [session.workout_template_id] : [];
const nameMap = await fetchTemplateNames(ids);
templateName = nameMap.get(session.workout_template_id!);
```

### 2. `listSessions` (sessions.ts:399-410)

```typescript
// BEFORE — per-row getOne inside Promise.all
rows.map(async (row) => {
  let templateName: string | undefined;
  if (row.workout_template_id) {
    const tmpl = await pb.collection("workout_templates").getOne(…);
    templateName = (tmpl as unknown as { name: string }).name;
  }
  // …
});

// AFTER — collect IDs first, batch once
const templateIds = [...new Set(rows.map(r => r.workout_template_id).filter(Boolean))];
const nameMap = await fetchTemplateNames(templateIds);

rows.map((row) => {
  const templateName = nameMap.get(row.workout_template_id ?? "");
  // …
});
```

### 3. `fetchSessionsFromPB` (useSessionsForDate.ts:125-138)

```typescript
// BEFORE — per-row getOne inside Promise.all
rows.map(async (s) => {
  let templateName: string | null = null;
  if (s.workout_template_id) {
    const tmpl = await pb.collection("workout_templates").getOne(…);
    templateName = (tmpl as unknown as { name: string }).name;
  }
  // …
});

// AFTER
const templateIds = [...new Set(rows.map(r => r.workout_template_id).filter(Boolean))];
const nameMap = await fetchTemplateNames(templateIds);
rows.map((s) => {
  const templateName = nameMap.get(s.workout_template_id ?? "") ?? null;
  // …
});
```

### 4. `fetchSessionsForDate` (useCalendar.ts:183-193)

Same pattern as #3 — identical `getOne` per-row loop replaced by collecting IDs → `fetchTemplateNames(ids)` → `nameMap.get(id)`.

### 5. `fetchHomeStats` (useHomeStats.ts:140-152)

```typescript
// BEFORE
recentRaw.map(async (session) => {
  let templateName = "Custom Workout";
  if (session.workout_template_id) {
    const tmpl = await pb.collection("workout_templates").getOne(…);
    templateName = (tmpl as unknown as { name: string }).name;
  }
  // …
});

// AFTER
const templateIds = [...new Set(recentRaw.map(r => r.workout_template_id).filter(Boolean))];
const nameMap = await fetchTemplateNames(templateIds);
recentRaw.map((session) => {
  const templateName = nameMap.get(session.workout_template_id ?? "") ?? "Custom Workout";
  // …
});
```

## Testing Strategy

### Helper unit tests (`fetch-template-names.test.ts`)

Mock strategy — same pattern as `sessions.test.ts`:

```typescript
const mockGetFullList = jest.fn();
jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn(() => ({ getFullList: mockGetFullList })),
  },
}));
```

| Test | Mock Setup | Assertion |
|------|-----------|-----------|
| Returns correct Map for valid IDs | `mockGetFullList.mockResolvedValueOnce([{ id: "a", name: "Push" }, { id: "b", name: "Pull" }])` | 1 `getFullList` call, Map has 2 entries |
| Empty input → empty Map | No mock needed | Zero `getFullList`, Map size 0 |
| All null/undefined IDs | No mock | Zero calls, empty Map |
| PB filter error → empty Map | `mockGetFullList.mockRejectedValueOnce(new Error("filter too long"))` | Empty Map, no throw |
| Dedupes duplicates | Input `["a","a","b"]` — mock returns 2 records | Map size 2, 1 `getFullList` |

### Call site tests (existing files)

- **`sessions.test.ts`**: Remove `mockGetOne` expectations for template lookups. Add `mockGetFullList` expectation for `fetchTemplateNames`. Assert `templateName` still resolves correctly — push the mock through `getFullList` instead of `getOne`.
- **`useSessionsForDate.test.ts`** (lines 345-425): Replace `pb.getOne` mock with `pb.getFullList` returning `[{ id: "tmpl-1", name: "Leg Day" }]`.
- **`useCalendar.test.ts`**: Only tests `buildCalendarMonth` (pure function) — `fetchSessionsForDate` is not called in existing tests. No change needed unless we add new tests.
- **`useHomeStats.test.ts`**: No test file exists. Out of scope — leave as-is.

### Integration guarantee

No existing test calls `mockGetOne` for `"workout_templates"` except `sessions.test.ts:498` and `useSessionsForDate.test.ts:361`. Both migrate to `mockGetFullList` → the total `mockGetOne` calls in the project should verify zero `workout_templates` lookups remain.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Pure code change — existing PocketBase data and schema unchanged. Rollback: revert the commit(s).

## Diff Estimate

~200-250 lines total (`git diff --stat`):
- Helper: ~35 lines (create)
- Bug 1: -1 line (delete)
- 5 call sites: ~60 lines changed
- Tests: ~120 lines (new + modified)

Under 400-line PR budget. Single PR.

## Open Questions

None.
