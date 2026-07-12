# Design: Fix Program Assignments Schema Mismatch

## Technical Approach

Pure string/reference refactor aligning 5 files with the PocketBase server truth. No behavioral changes, no schema migrations, no new features. Each field rename is a mechanical find-and-replace across the type definition, service functions, hook mappers, test fixtures, and seed script.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| **Text fields over relations** | `athlete_id`, `coach_id`, `template_id` as plain text | PB relation fields with expand | Server stores them as text. Adding relations would require schema migration + expand plumbing for zero query benefit — these are read-only foreign refs. |
| **`assigned_at` on create** | `new Date().toISOString()` | Let server default, skip field | Server REQUIRES `assigned_at` on create. Client sets current timestamp at creation time. |
| **Remove `expand` params** | Drop `expand: "template"` / `expand: "template,athlete"` | Keep expand and ignore response | Template is now a text field — expand silently returns nothing. Removing avoids confusing future readers. |
| **Widen status union** | `"paused"` added to TS union | Keep existing union | Server already accepts `"paused"`. Missing union member causes type errors at call sites. |

## `assigned_at` Handling

Set once at creation time and never updated:

```typescript
// In assignProgram() create payload
{
  ...,
  assigned_at: new Date().toISOString(),
}
```

No read-side changes — `assigned_at` flows through `ProgramAssignmentRow` as a plain string. No consumer currently reads it.

## File Changes (Execution Order)

**Total: 11 files** (5 core + 3 coach screens + 4 test fixtures)

### 1. `src/types/pocketbase.ts` — Type alignment

**`ProgramAssignmentRow`** — rename fields + add missing server fields:

| Field | Before | After |
|-------|--------|-------|
| `athlete` | `athlete: string` | `athlete_id: string` |
| `coach` | `coach: string` | `coach_id: string` |
| `template` | `template: string` | `template_id: string` |
| `start_date` | `start_date: string` | `started_at: string` |
| (new) | missing | `assigned_at: string` |
| (new) | missing | `completed_at: string \| null` |
| (new) | missing | `program_id: string \| null` |
| (new) | missing | `notes: string \| null` |
| `status` | `"active" \| "completed" \| "cancelled"` | `"active" \| "completed" \| "paused" \| "cancelled"` |

### 2. `src/lib/pocketbase/services/program-assignments.ts` — Service functions

All 7 functions:

| Function | Change |
|----------|--------|
| `assignProgram` filter | `athlete` → `athlete_id`, `template` → `template_id`, `start_date` → `started_at` |
| `assignProgram` create payload | Same rename + add `assigned_at: new Date().toISOString()` |
| `assignProgram` update payload | `coach:` → `coach_id:` |
| `listAssignments` filter/sort | filter `athlete` → `athlete_id`, sort `-start_date` → `-started_at` |
| `listAssignments` options | Remove `expand: "template"` |
| `listCoachAssignments` options | Remove `expand: "template,athlete"` |
| `updateAssignment` payload | `start_date:` → `started_at:` |
| `getAssignment` options | Remove `expand: "template,athlete"` |
| `hasActiveAssignment` filter | `athlete` → `athlete_id`, `template` → `template_id`, `start_date` → `started_at` |
| `unassignProgram` | No field reference changes |

**Also**: Widen `UpdateAssignmentInput.status` to include `"paused"`.

### 3. `src/features/programs/hooks/useAthleteAssignments.ts` — Hook mappers

| Location | Before | After |
|----------|--------|-------|
| `mapAssignmentToProgramSummary` | `row.start_date` | `row.started_at` |
| `AssignmentWithTemplate` | `expand?: { template?: TemplateRow \| null }` | Remove the type entirely (no expand) |
| `deriveCurrentAndUpcoming` | `r.start_date` (4 occurrences) | `r.started_at` |
| `addWeeks` param name | `startDate` | `startDate` (stays, it's the local param) |

**Import change**: Remove `TemplateRow` from import (no longer needed).

### 4. `src/lib/pocketbase/services/__tests__/program-assignments.test.ts` — Test fixture

`makeAssignment()` fixture:

| Field | Before | After |
|-------|--------|-------|
| `athlete` | `athlete: "athlete-1"` | `athlete_id: "athlete-1"` |
| `coach` | `coach: "coach-1"` | `coach_id: "coach-1"` |
| `template` | `template: "tmpl-1"` | `template_id: "tmpl-1"` |
| `start_date` | `start_date: "2026-07-15"` | `started_at: "2026-07-15"` |
| (new) | missing | `assigned_at: "2026-07-01T00:00:00Z"` |
| (new) | missing | `completed_at: null` |
| (new) | missing | `program_id: null` |
| (new) | missing | `notes: null` |

All assertion strings updated: `"athlete ="` → `"athlete_id ="`, `"template ="` → `"template_id ="`, `"start_date ="` → `"started_at ="`.

### 5. `scripts/seed-teams.mjs` — Seed script

Line 297: `` `${a.athlete}:${a.template}` `` → `` `${a.athlete_id}:${a.template_id}` ``.

### 6. Coach screens — `start_date` → `started_at`, `template` → `template_id`

| File | Line | Before | After |
|------|------|--------|-------|
| `AssignedProgramsScreen.tsx` | 77 | `assignment.start_date` | `assignment.started_at` |
| `AssignedProgramsScreen.tsx` | 116 | `start_date` display string | `started_at` display string |
| `AssignmentDetailScreen.tsx` | 93 | `assignment.start_date` | `assignment.started_at` |
| `AssignmentDetailScreen.tsx` | 221 | `start_date` display string | `started_at` display string |
| `UnassignedProgramsScreen.tsx` | 379 | `a.template` | `a.template_id` |

**Note**: `expand?.athlete` / `expand?.template` in coach screens are pre-existing dead code (text fields, not relations — expand has always silently returned `null`). Our type rename doesn't change this. These remain as-is — cleanup is out of scope.

### 7. Test fixtures — `start_date` → `started_at`

| File | Lines | Change |
|------|-------|--------|
| `__tests__/useAthleteAssignments.test.ts` | 34, 57, 78, 109, 115, 129, 132, 148, 174, 180, 190, 201, 216, 280, 281 | `start_date:` → `started_at:` in `makeRow()` fixture + all inline overrides |
| `__tests__/useProgramDetail.test.ts` | 28 | `start_date:` → `started_at:` in `rowWithTemplate()` fixture |
| `__tests__/useAthleteDetail.test.ts` | 48 | `start_date:` → `started_at:` in inline fixture |
| `__tests__/AssignedProgramsScreen.test.tsx` | 140, 155 | `start_date:` → `started_at:` in test data |
| `__tests__/UnassignedProgramsScreen.test.tsx` | 203, 281 | `start_date:` → `started_at:` in test data |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Service functions | Same mock tests pass — assertions updated to match new server field names |
| Unit | Hook mappers | `mapAssignmentToProgramSummary` / `deriveCurrentAndUpcoming` read `started_at` instead of `start_date` |
| CI | Type check | `npx tsc --noEmit` catches any missed rename |
| CI | Existing test suite | `npx jest` — all field refs are mechanical renames; no logic change means zero behavioral regressions |

Tests are mocking the PB client, so the rename only affects string-literals in filter/create payload assertions. The mock doesn't validate field names against a real server — the rename is invisible to the test runtime.

Additional test files (useAthleteAssignments, useProgramDetail, useAthleteDetail, AssignedProgramsScreen, UnassignedProgramsScreen) need fixture field renames only — no logic changes.

## Migration / Rollout

No migration required. The seed script (`seed-teams.mjs`) is updated in the same PR. Existing `program_assignments` rows in PocketBase already use the correct server field names — the code was simply referencing them wrong. No data transformation needed.

## Open Questions

None.
