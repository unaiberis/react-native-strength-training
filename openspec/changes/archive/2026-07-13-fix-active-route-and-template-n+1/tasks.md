# Tasks: Fix active route and template N+1

## Delivery Strategy

```
strategy: force-chained
chain-strategy: stacked-to-main
review-budget: 400 lines
```

Two independent bugs → two stacked PRs. PR #1 is a 1-line deletion + verification. PR #2 extracts a batch helper, migrates 5 call sites, and updates tests.

---

## PR #1 — Remove orphaned route declaration

| Field | Value |
|-------|-------|
| **Branch** | `fix/remove-orphan-active-route` |
| **Lines** | ~5 (1 deletion + 4 in test) |
| **Order** | First — no dependencies |
| **Dependency diagram** | `📍 PR #1 → PR #2 (parallel: PR #2 is independent in code, but stacked after PR #1 on main)` |

### Task 1.1: Remove orphaned `Stack.Screen name="active"` from root layout

| Field | Value |
|-------|-------|
| **Task ID** | `1.1` |
| **Title** | Remove orphaned `Stack.Screen name="active"` from root layout |
| **File(s)** | `app/_layout.tsx` |
| **Action** | Delete `<Stack.Screen name="active" options={{ headerShown: false, presentation: "fullScreenModal" }} />` (line 266) |
| **Acceptance criteria** | 1. Line 266 is removed from `app/_layout.tsx`<br>2. `npx tsc --noEmit` passes<br>3. No duplicate route warning for `active` at runtime |
| **Dependencies** | None |
| **Difficulty** | Easy |
| **TDD** | RED: write a test that imports the layout and confirms no `name="active"` screen is registered in root stack. GREEN: delete the line. REFACTOR: N/A. |

### Task 1.2: Verify routing still works

| Field | Value |
|-------|-------|
| **Task ID** | `1.2` |
| **Title** | Verify navigation to `/(workout)/active` still resolves |
| **File(s)** | None — manual verification + existing routability |
| **Action** | Confirm `(workout)/_layout.tsx` already declares `<Stack.Screen name="active" />`. Verify no test checks for the root-level `active` screen. |
| **Acceptance criteria** | 1. `(workout)/_layout.tsx` has the `active` screen declaration<br>2. All navigation targets `/(workout)/active` (not `/(root)/active`)<br>3. No test breaks from removing the root-level screen |
| **Dependencies** | Task 1.1 |
| **Difficulty** | Easy |

> **PR #1 Boundary**: After Task 1.2, commit and open PR #1. Rollback: revert the single commit.

---

## PR #2 — Batch template fetch helper + migration

| Field | Value |
|-------|-------|
| **Branch** | `fix/migrate-template-nplus1` |
| **Lines** | ~200-250 (35 helper + 60 call sites + 120 tests) |
| **Order** | Second — after PR #1 merges to main |
| **Dependency diagram** | `main → PR #1 → PR #2 (📍)` |

### Task 2.1: Create batch helper `fetchTemplateNames` ✅

| Field | Value |
|-------|-------|
| **Task ID** | `2.1` |
| **Title** | Create `src/lib/pocketbase/services/fetch-template-names.ts` with batch helper |
| **File(s)** | `src/lib/pocketbase/services/fetch-template-names.ts` **(NEW)** |
| **Action** | Implement `fetchTemplateNames(ids: string[]): Promise<Map<string, string>>` per design.md interface. Collect unique truthy IDs → `Set` dedup → filter→`getFullList({ filter, fields: "id,name" })` → `Map`. Empty input → empty Map, zero network. Error → empty Map, no throw. |
| **Acceptance criteria** | 1. Function exists with correct signature<br>2. Uses `pb.collection("workout_templates").getFullList` (not `getOne`)<br>3. Dedupes via `Set`<br>4. Empty/null/undefined input → empty Map, zero network calls<br>5. Error returns empty Map (caught, not thrown) |
| **Dependencies** | None |
| **Difficulty** | Easy |
| **TDD (RED)** | Write `fetch-template-names.test.ts` first with all unit tests (Task 2.2 tests), then implement the helper. |

### Task 2.2: Write unit tests for batch helper ✅

| Field | Value |
|-------|-------|
| **Task ID** | `2.2` |
| **Title** | Write unit tests for `fetchTemplateNames` |
| **File(s)** | `src/lib/pocketbase/services/__tests__/fetch-template-names.test.ts` **(NEW)** |
| **Action** | 5 test cases per spec. Mock strategy: `jest.mock("@/lib/pocketbase/client")` with `pb.collection → mockGetFullList`. |
| **Test cases** | 1. **Valid IDs** — mock returns `[{id:"a", name:"Push"},{id:"b", name:"Pull"}]` → Map with 2 entries, 1 `getFullList` call<br>2. **Empty input** — `[]` → empty Map, zero calls<br>3. **All null/undefined** — `[null, undefined]` → empty Map, zero calls<br>4. **PB filter error** — `mockGetFullList.mockRejectedValueOnce(new Error(...))` → empty Map, no throw<br>5. **Dedup** — `["a","a","b"]` → Map size 2, 1 call |
| **Acceptance criteria** | All 5 tests pass: `npx jest fetch-template-names` |
| **Dependencies** | Task 2.1 (test-before-code: these tests ARE the RED phase) |
| **Difficulty** | Easy |

### Task 2.3: Migrate `getSessionDetail` in `sessions.ts` ✅

| Field | Value |
|-------|-------|
| **Task ID** | `2.3` |
| **Title** | Migrate `getSessionDetail` (line 261-271) to use batch helper |
| **File(s)** | `src/lib/pocketbase/services/sessions.ts` |
| **Action** | Replace the per-session `getOne("workout_templates", id, ...)` try/catch with: collect IDs → `fetchTemplateNames(ids)` → `nameMap.get(id)`. For `getSessionDetail`, it's a single session so `ids = [session.workout_template_id]` or `[]`. |
| **Acceptance criteria** | 1. No `getOne("workout_templates")` in `getSessionDetail`<br>2. `templateName` resolves from `nameMap.get()`<br>3. Existing fallback (undefined when missing/error) preserved<br>4. `npx tsc --noEmit` passes for this file |
| **Dependencies** | Task 2.1 |
| **Difficulty** | Easy |

### Task 2.4: Migrate `listSessions` in `sessions.ts` ✅

| Field | Value |
|-------|-------|
| **Task ID** | `2.4` |
| **Title** | Migrate `listSessions` (lines 399-410) to use batch helper |
| **File(s)** | `src/lib/pocketbase/services/sessions.ts` |
| **Action** | 1. Collect unique `workout_template_id` from all rows (before the `Promise.all` map): `const templateIds = [...new Set(rows.map(r => r.workout_template_id).filter(Boolean))]`<br>2. Call `fetchTemplateNames(templateIds)` once before the map<br>3. Inside the map, replace the `getOne` try/catch with `nameMap.get(row.workout_template_id ?? "")` |
| **Acceptance criteria** | 1. No `getOne("workout_templates")` in `listSessions`<br>2. Exactly 1 `getFullList("workout_templates")` per request (via helper)<br>3. `templateName` = `nameMap.get(...)` (undefined for missing IDs)<br>4. `npx tsc --noEmit` passes |
| **Dependencies** | Task 2.1 |
| **Difficulty** | Easy |

### Task 2.5: Migrate `fetchSessionsFromPB` in `useSessionsForDate.ts` ✅

| Field | Value |
|-------|-------|
| **Task ID** | `2.5` |
| **Title** | Migrate `fetchSessionsFromPB` (lines 124-138) to use batch helper |
| **File(s)** | `src/features/calendar/hooks/useSessionsForDate.ts` |
| **Action** | 1. Import `fetchTemplateNames` from `@/lib/pocketbase/services/fetch-template-names`<br>2. Collect unique IDs before the `Promise.all`: `const templateIds = [...new Set(rows.map(r => r.workout_template_id).filter(Boolean))]`<br>3. Call `fetchTemplateNames(templateIds)` once<br>4. Replace the `getOne` try/catch with `nameMap.get(s.workout_template_id ?? "") ?? null` |
| **Acceptance criteria** | 1. No inline `pb.collection("workout_templates").getOne(...)` in this hook<br>2. Exactly 1 batch call per hook invocation<br>3. Fallback `null` for missing IDs preserved<br>4. `npx tsc --noEmit` passes |
| **Dependencies** | Task 2.1 |
| **Difficulty** | Medium (must handle the hook's offline/online branching correctly) |

### Task 2.6: Migrate `fetchSessionsForDate` in `useCalendar.ts` ✅

| Field | Value |
|-------|-------|
| **Task ID** | `2.6` |
| **Title** | Migrate `fetchSessionsForDate` (lines 183-193) to use batch helper |
| **File(s)** | `src/features/calendar/hooks/useCalendar.ts` |
| **Action** | 1. Import `fetchTemplateNames`<br>2. Collect unique IDs before `Promise.all`<br>3. Call `fetchTemplateNames(ids)` once<br>4. Replace `getOne` try/catch with `nameMap.get(s.workout_template_id ?? "") ?? null` |
| **Acceptance criteria** | 1. No inline `getOne("workout_templates")` in this hook<br>2. 1 batch call per invocation<br>3. Fallback `null` preserved<br>4. `npx tsc --noEmit` passes |
| **Dependencies** | Task 2.1 |
| **Difficulty** | Medium |

### Task 2.7: Migrate `fetchHomeStats` in `useHomeStats.ts` ✅

| Field | Value |
|-------|-------|
| **Task ID** | `2.7` |
| **Title** | Migrate `fetchHomeStats` (lines 139-152) to use batch helper |
| **File(s)** | `src/features/home/hooks/useHomeStats.ts` |
| **Action** | 1. Import `fetchTemplateNames`<br>2. Collect unique IDs before `Promise.all`<br>3. Call `fetchTemplateNames(ids)` once<br>4. Replace `getOne` try/catch with `nameMap.get(session.workout_template_id ?? "") ?? "Custom Workout"` |
| **Acceptance criteria** | 1. No inline `getOne("workout_templates")` in this hook<br>2. 1 batch call per invocation<br>3. Fallback `"Custom Workout"` for missing IDs preserved<br>4. `npx tsc --noEmit` passes |
| **Dependencies** | Task 2.1 |
| **Difficulty** | Medium |

### Task 2.8: Update existing mock expectations in test files ✅

| Field | Value |
|-------|-------|
| **Task ID** | `2.8` |
| **Title** | Update mock expectations in `sessions.test.ts` and `useSessionsForDate.test.ts` |
| **File(s)** | `src/lib/pocketbase/services/__tests__/sessions.test.ts`, `src/features/calendar/hooks/__tests__/useSessionsForDate.test.ts` |
| **Action** | **`sessions.test.ts`**:<br>- Line 498-499: Remove `mockGetOne.mockResolvedValueOnce({ id: "tmpl-1", name: "Push Day" })`<br>- Add `mockGetFullList.mockResolvedValueOnce([{ id: "tmpl-1", name: "Push Day" }])` before the template lookup (at the right position in the mock sequence — the helper's `getFullList` call)<br>- Adjust `mockGetFullList` sequence for the `listSessions` test (since `fetchTemplateNames` consumes one `getFullList` call before the exercise sets ones)<br><br>**`useSessionsForDate.test.ts`**:<br>- Line 361: Remove `(pb.getOne as jest.Mock).mockResolvedValueOnce({ name: "Leg Day" })`<br>- Add `(pb.getFullList as jest.Mock).mockResolvedValueOnce([{ id: "tmpl-1", name: "Leg Day" }])` at the appropriate position in the mock chain<br>- Line 405: Remove `(pb.getOne as jest.Mock).mockRejectedValueOnce(new Error("not found"))` (error test)<br>- Since the helper catches errors internally and returns empty Map, the test must verify `templateName` is `null` via the empty Map path, not via a thrown error. Update the expect sequence accordingly.<br><br>**No changes needed for**: `useCalendar.test.ts` (only tests pure `buildCalendarMonth`), `useHomeStats.test.ts` (no test file exists) |
| **Acceptance criteria** | 1. All existing tests pass with `npx jest`<br>2. Zero `mockGetOne` / `pb.getOne` calls remain for `workout_templates` collection<br>3. `templateName` assertions still pass with data coming through `getFullList` mock path |
| **Dependencies** | Tasks 2.3, 2.4, 2.5 (tests must match the new implementation) |
| **Difficulty** | Medium |

### Task 2.9: Run full test suite and type check ✅

| Field | Value |
|-------|-------|
| **Task ID** | `2.9` |
| **Title** | Run `npx jest` and `npx tsc --noEmit` |
| **File(s)** | None |
| **Action** | 1. Run `npx tsc --noEmit` — must pass with zero errors<br>2. Run `npx jest --coverage` — must pass, 80% threshold per modified/new file<br>3. Run `npx jest fetch-template-names` — all 5 new tests pass<br>4. Run `npx jest sessions` — existing + migrated tests pass<br>5. Run `npx jest useSessionsForDate` — migrated tests pass<br>6. Verify no `getOne("workout_templates")` calls remain in production code via grep |
| **Acceptance criteria** | All commands pass. Zero coverage regressions. |
| **Dependencies** | Tasks 2.1 through 2.8 |
| **Difficulty** | Easy |

---

## Dependency Graph

```
PR #1
  ├── Task 1.1: Remove route line
  └── Task 1.2: Verify routing
       └── PR #1 merge → main

PR #2
  ├── Task 2.1: Create batch helper ← Task 2.2: Tests for helper (TDD: 2.2 written first)
  ├── Task 2.3: Migrate getSessionDetail ← depends on 2.1
  ├── Task 2.4: Migrate listSessions ← depends on 2.1
  ├── Task 2.5: Migrate fetchSessionsFromPB ← depends on 2.1
  ├── Task 2.6: Migrate fetchSessionsForDate ← depends on 2.1
  ├── Task 2.7: Migrate fetchHomeStats ← depends on 2.1
  ├── Task 2.8: Update mock tests ← depends on 2.3, 2.4, 2.5
  └── Task 2.9: Full suite ← depends on ALL above
       └── PR #2 merge → main
```

Tasks 2.3 through 2.7 are independent of each other (parallelizable in theory), but Task 2.8 must come after them since it needs the final mock sequence.

---

## Review Workload Forecast

| PR | Additions | Deletions | Total | Verdict |
|----|-----------|-----------|-------|---------|
| PR #1 | ~1 | ~1 | ~2 | ✅ Well under 400 |
| PR #2 | ~200 | ~80 | ~280 | ✅ Under 400 |

Both fit the 400-line budget. The user explicitly chose force-chained → two stacked PRs anyway.

---

## Verification Checklist (all tasks)

- [x] `npx tsc --noEmit` passes
- [x] `npx jest` passes (full suite) — 95 suites, 1105 tests
- [x] `npx jest --coverage` shows ≥80% on all modified/new files
- [x] No `getOne("workout_templates")` calls remain in `src/` outside `services/templates.ts`
- [ ] Navigation to `/(workout)/active` works (manual check)
- [ ] No duplicate route warnings at startup
