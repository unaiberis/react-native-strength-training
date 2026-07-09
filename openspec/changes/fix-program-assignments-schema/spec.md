# Delta: Fix Program Assignments Schema Mismatch

> Pure code-side alignment. No new behavior, no schema changes.

## Field Name Mapping

| Old (code) | New (server) | Affected In |
|------------|-------------|-------------|
| `athlete` | `athlete_id` | Type, all filters/creates, seed dedup |
| `coach` | `coach_id` | Type, creates, seed creates (already correct) |
| `template` | `template_id` | Type, all filters/creates, seed dedup |
| `start_date` | `started_at` | Type, sort, filters, create/update payload |
| (missing) | `assigned_at` | Type + create payload (REQUIRED) |
| (missing) | `completed_at`, `program_id`, `notes` | Type only (nullable) |
| `expand:"template"` | (remove) | Services + hook mocks (text field, not relation) |

## Type Changes

| Type | Change |
|------|--------|
| `ProgramAssignmentRow` | Rename: `athlete`→`athlete_id`, `coach`→`coach_id`, `template`→`template_id`, `start_date`→`started_at`. Add: `assigned_at:string`, `completed_at:string\|null`, `program_id:string\|null`, `notes:string\|null`. Widen status: `"paused"` added to union. |
| `UpdateAssignmentInput` | `startDate?`→`startedAt?`; status adds `"paused"` |
| `CreateAssignmentInput` | Add `assignedAt:string` (REQUIRED on server) |

## Requirements

| # | Function | What Changes |
|---|----------|-------------|
| R1 | `assignProgram` | Filter: `athlete_id`, `template_id`, `started_at`. Create: `athlete_id`, `coach_id`, `template_id`, `started_at`, `assigned_at`. Upsert: `coach_id`. |
| R2 | `listAssignments` | Filter: `athlete_id`. Sort: `-started_at`. Remove `expand:"template"`. |
| R3 | `listCoachAssignments` | Remove `expand:"template,athlete"`. `team_id` filter unchanged. |
| R4 | `updateAssignment` | Field: `started_at`. Status includes `"paused"`. |
| R5 | `hasActiveAssignment` | Filter: `athlete_id`, `template_id`, `started_at`. |
| R6 | `getAssignment` | Remove `expand:"template,athlete"`. |
| R7 | `mapAssignmentToProgramSummary` | Read `row.started_at`. `expand.template` gone → placeholder name. `deriveCurrentAndUpcoming`, `findAssignedOnDate` use `started_at`. |
| R8 | Seed dedup key (line 297) | `a.athlete_id`, `a.template_id` (not `a.athlete`, `a.template`). |

## Scenario Table

| Scenario | Broken Before | Fixed After |
|----------|--------------|-------------|
| Coach assigns program | 400 — writes bare names | 200 — `_id` fields + `assigned_at` |
| Athlete views assignments | 400 — filter on `athlete` | 200 — filter on `athlete_id` |
| Coach lists team assignments | 400 — expand on text fields | 200 — no expand |
| "Today's program" display | Reads `start_date` → wrong/missing | Reads `started_at` → correct |
| Coach pauses assignment | Type error — `paused` missing | Type-safe |
| Dedup on program assign | 400 — filter on `template` | 200 — filter on `template_id` |
| Seed dedup readback | Skips — reads `a.athlete` | Correct — reads `a.athlete_id` |

## Edge Cases

| Edge | Handling |
|------|----------|
| `paused` status | Additive. Existing `active\|completed\|cancelled` branches unchanged. Display maps new value. |
| Missing `expand.template` | `null`-guarded in `mapAssignmentToProgramSummary` → placeholder + empty phases. No crash. |
| `completed_at`/`program_id`/`notes` | Nullable in type. No write logic — pure type hygiene. |
| `startedAt` undefined in update | Server ignores omitted field. No breaking change. |

## Test Adjustments

| File | Changes Needed |
|------|---------------|
| `program-assignments.test.ts` | `makeAssignment()` + assertions: rename 4 fields, remove expand, add `assigned_at` |
| `useAthleteAssignments.test.ts` | `makeRow()`: rename 4 fields. Keep `expand.template` in mock shape |
| `useProgramDetail.test.ts` | `rowWithTemplate()`: rename 4 fields. Asserts "Untitled Program" |
| `useAthleteDetail.test.ts` | Inline fixture: rename 4 fields |
| `useProgramAssignment.test.ts` | Mock pass-through — no field changes |
| `assignedToday.test.ts` | Mock — no field changes |
| `seed-teams.mjs` | Line 297: `a.athlete`→`a.athlete_id`, `a.template`→`a.template_id` |
