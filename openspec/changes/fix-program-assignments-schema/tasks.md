# Tasks: Fix Program Assignments Schema Mismatch

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~130 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Types + services (core refactor) | PR 1 | Types and service functions — everything downstream depends on this |
| 2 | Hooks + screens (consumers) | PR 1 | Depends on unit 1 |
| 3 | Tests + seed (verification) | PR 1 | Depends on units 1+2 |

All units in 1 PR (~130 lines, well under 400-line budget).

## Phase 1: Core Types & Services

- [x] 1.1 `src/types/pocketbase.ts` — Rename `ProgramAssignmentRow` fields: `athlete` → `athlete_id`, `coach` → `coach_id`, `template` → `template_id`, `start_date` → `started_at`. Add missing fields: `assigned_at: string`, `completed_at: string | null`, `program_id: string | null`, `notes: string | null`. Extend `status` union: add `"paused"`.
- [x] 1.2 `src/lib/pocketbase/services/program-assignments.ts` — Rename all filter/payload field refs in `assignProgram` (3 filters + create payload + update payload), widen `CreateAssignmentInput.status` (already typed), add `assigned_at` to create payload.
- [x] 1.3 `src/lib/pocketbase/services/program-assignments.ts` — Rename filter/sort in `listAssignments` (`athlete` → `athlete_id`, `-start_date` → `-started_at`), remove `expand: "template"`.
- [x] 1.4 `src/lib/pocketbase/services/program-assignments.ts` — Remove `expand: "template,athlete"` from `listCoachAssignments`.
- [x] 1.5 `src/lib/pocketbase/services/program-assignments.ts` — Rename `start_date:` → `started_at:` in `updateAssignment` update payload. Widen `UpdateAssignmentInput.status` to include `"paused"`.
- [x] 1.6 `src/lib/pocketbase/services/program-assignments.ts` — Remove `expand: "template,athlete"` from `getAssignment`.
- [x] 1.7 `src/lib/pocketbase/services/program-assignments.ts` — Rename filter refs in `hasActiveAssignment` (`athlete` → `athlete_id`, `template` → `template_id`, `start_date` → `started_at`).

## Phase 2: Hook & Screen Consumers

- [x] 2.1 `src/features/programs/hooks/useAthleteAssignments.ts` — Remove `TemplateRow` from import. Remove `AssignmentWithTemplate` type (or simplify — no `expand`). Rename all `row.start_date` → `row.started_at` (lines 120, 122, 185, 189, 193, 196).
- [x] 2.2 `src/features/coach/screens/AssignedProgramsScreen.tsx` — Rename `assignment.start_date` → `assignment.started_at` at lines 77 and 116.
- [x] 2.3 `src/features/coach/screens/AssignmentDetailScreen.tsx` — Rename `assignment.start_date` → `assignment.started_at` at lines 93 and 221.
- [x] 2.4 `src/features/coach/screens/UnassignedProgramsScreen.tsx` — Rename `a.template` → `a.template_id` at line 379.

## Phase 3: Tests & Seed

- [x] 3.1 `src/lib/pocketbase/services/__tests__/program-assignments.test.ts` — Update `makeAssignment()` fixture: rename fields + add missing fields (`assigned_at`, `completed_at`, `program_id`, `notes`). Update all assertion strings (`"athlete ="` → `"athlete_id ="`, `"template ="` → `"template_id ="`, `"start_date ="` → `"started_at ="`). Update sort assertion and remove `expand` expectations.
- [x] 3.2 `src/features/programs/hooks/__tests__/useAthleteAssignments.test.ts` — Update `makeRow()` fixture and all inline override objects: rename `athlete` → `athlete_id`, `coach` → `coach_id`, `template` → `template_id`, `start_date` → `started_at`.
- [x] 3.3 `src/features/programs/hooks/__tests__/useProgramDetail.test.ts` — Rename `start_date` → `started_at` in `rowWithTemplate()` fixture.
- [x] 3.4 `src/features/coach/hooks/__tests__/useAthleteDetail.test.ts` — Rename `start_date` → `started_at` in inline fixture data.
- [x] 3.5 `src/features/coach/screens/__tests__/AssignedProgramsScreen.test.tsx` — Rename `start_date` → `started_at` in test data at lines 140 and 155.
- [x] 3.6 `src/features/coach/screens/__tests__/UnassignedProgramsScreen.test.tsx` — Rename `start_date` → `started_at` and `template` → `template_id` in test data at lines 203 and 281.
- [x] 3.7 `scripts/seed-teams.mjs` — Rename dedup key at line 297: `` `${a.athlete}:${a.template}` `` → `` `${a.athlete_id}:${a.template_id}` ``.

## Phase 4: Verification

- [x] 4.1 Run `npx tsc --noEmit` — type check catches any missed renames (no errors in project files; pre-existing jest.setup.ts issue unrelated).
- [x] 4.2 Run `npx jest` — 89 suites, 1043 tests, all pass.
