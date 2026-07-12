# Tasks: Athlete Assignment Consumption (`athlete-assignment-consumption`)

> Implementation work units for wiring read-only athlete consumption of
> `program_assignments`. Each task is a self-contained, PR-slicable unit with
> concrete file paths, dependencies, validations, tests, and done criteria.
> Delivery strategy: **force-chained PRs, 800-line budget** — split into two
> slices (see Review Workload Forecast).

Code anchors used:
- `ProgramAssignmentRow` (`src/types/pocketbase.ts:159`), expanded `template: TemplateRow` via `listAssignments` (`src/lib/pocketbase/services/program-assignments.ts:69`, expands `template`).
- `getAssignment(id)` (`program-assignments.ts:156`, expands `template,athlete`).
- `ProgramSummary` / `ProgramPhaseSummary` (`src/features/programs/hooks/usePrograms.ts:10,18`).
- `useTemplate(id)` (`src/features/routines/hooks/useTemplates.ts:101`) → `TemplatesService.getTemplate` → `TemplateWithExercises { exercises: TemplateExerciseRow[] }` (`src/lib/pocketbase/services/templates.ts:5`). Each `TemplateExerciseRow.exercise_id` needs name via `getExercise(id)` (`src/lib/pocketbase/services/exercises.ts:37`).
- `WorkoutPreviewData` / `WorkoutBlock` (`src/features/programs/components/WorkoutPreview.tsx:7,24`).
- `DEFAULT_PROGRAM_WEEKS = 8` (new constant, see T1).

---

## T1 — `useAthleteAssignments` hook + pure mapping (R1, R7)

- **Objective:** Create `src/features/programs/hooks/useAthleteAssignments.ts`
  exposing a TanStack Query hook plus exported pure helpers so the mapping is
  unit-testable without React/network. Implements R1 (list + null-guard +
  multiple-active-nearest + upcoming classification) and the D1/D2/D3/D4/D6
  decisions from design.md.
- **Files (create):**
  - `src/features/programs/hooks/useAthleteAssignments.ts`
  - `src/features/programs/hooks/__tests__/useAthleteAssignments.test.ts`
- **Dependencies:** — (no other task).
- **Validations:** `npx tsc --noEmit` (typecheck), `npx jest useAthleteAssignments`.
- **Exports/contract (from design.md §Interfaces):**
  - `export type AssignmentWithTemplate = ProgramAssignmentRow & { expand?: { template?: TemplateRow | null } };`
  - `export interface MapOptions { totalWeeks?: number; today?: Date; }`
  - `export function mapAssignmentToProgramSummary(row: AssignmentWithTemplate, opts?: MapOptions): ProgramSummary;` — null-guards missing `expand.template` (returns `name="Untitled Program"`, `phases=[]`, no deref).
  - `export function deriveCurrentAndUpcoming(rows: AssignmentWithTemplate[], today?: Date): { currentProgram: ProgramSummary | null; upcomingPrograms: ProgramSummary[] };` — skip `cancelled`; current = latest `start_date <= today` (status `active`), future → `upcoming`; `completed` with `start_date<=today` NOT surfaced.
  - `export function useAthleteAssignments(): { currentProgram: ProgramSummary | null; upcomingPrograms: ProgramSummary[]; isLoading: boolean; error: unknown; };` — `useQuery(["programs", userId], () => listAssignments(userId))`, `enabled: !!userId`.
  - Add module constant `DEFAULT_PROGRAM_WEEKS = 8`; `endDate = startDate + 7*weeks`; `phases = [{ id:"phase-"+tpl.id, name:tpl.name, weekStart:1, weekEnd:totalWeeks, workoutCount:1 }]` when template present.
  - Add small local helper `addWeeks(startDate: string, weeks: number): string` (pure, no external date lib).
- **Tests needed (jest node env, mock `pb`/`listAssignments`):**
  - happy path: 1 active assignment → `currentProgram` name = template name, `phases.length=1`.
  - 0 assignments → `currentProgram=null`, `upcomingPrograms=[]`, no throw.
  - null `template` (orphaned) → no throw, `phases=[]`, placeholder name.
  - multiple active (A `2026-06-01`, B `2026-07-05`, C `2026-08-01`, today `2026-07-09`) → current = B, upcoming = [C]; A not current (D4).
  - `cancelled` row skipped; `completed` past row not surfaced.
  - `deriveCurrentAndUpcoming` boundary: future-only → current=null, upcoming len 1.
  - ≥80% coverage on the new hook file.
- **Done criteria:** `mapAssignmentToProgramSummary` + `deriveCurrentAndUpcoming` are exported and fully covered; `useAthleteAssignments` calls `listAssignments(user.id)` once and returns `{currentProgram, upcomingPrograms, isLoading, error}`; `npx tsc --noEmit && npx jest` green.

---

## T2 — Rewire `usePrograms` and `useProgramDetail` (R1, R2, R3)

- **Objective:** Delegate `usePrograms()` to `useAthleteAssignments()` (keep
  `ProgramSummary` / `UseProgramsResult` exports + unchanged `computeProgramProgress`),
  and rewire `useProgramDetail(id)` to call `getAssignment(id)` and map to
  `ProgramSummary`. Keeps the public shapes stable so screens need no prop change.
- **Files (modify):**
  - `src/features/programs/hooks/usePrograms.ts` (replace TODO body with delegation; keep `computeProgramProgress`, add `error` to `UseProgramsResult`).
  - `src/features/programs/hooks/useProgramDetail.ts` (real query; map via shared mapper).
  - `src/features/programs/hooks/__tests__/usePrograms.test.ts` (new).
  - `src/features/programs/hooks/__tests__/useProgramDetail.test.ts` (new).
- **Dependencies:** T1.
- **Validations:** `npx tsc --noEmit`, `npx jest usePrograms useProgramDetail`.
- **Implementation notes:**
  - `usePrograms()` returns `{ currentProgram, upcomingPrograms, isLoading, error }` from `useAthleteAssignments()` (keep `ComputeProgramProgress` exported unchanged).
  - `useProgramDetail(id)` → `useQuery(["program-detail", id], () => getAssignment(id))`, map `data` via `mapAssignmentToProgramSummary`; `error` → `program: null`; `isLoading` from query.
- **Tests needed:**
  - `usePrograms`: delegates (mock `useAthleteAssignments` or `listAssignments`); returns same `currentProgram`/`upcomingPrograms`; preserves `ProgramSummary` shape.
  - `useProgramDetail`: `getAssignment(id)` called with the id; maps template name into `program.name`; null-guard when `expand.template` absent (no throw, `program.phases=[]`); error path → `program=null`.
  - ≥80% coverage on both modified files.
- **Done criteria:** Both hooks return real data; existing screens (T3/T4) compile unchanged against the stable `ProgramSummary` shape; typecheck + tests green.

---

## T3 — Wire Programs tab to real data (R2, R6)

- **Objective:** Make `app/(tabs)/programs.tsx` consume the now-real `usePrograms()`
  output and wire pull-to-refresh to the query `refetch`. No shape change to the
  render tree (T-01.2 `programs.tsx` portion). Empty state already correct.
- **Files (modify):**
  - `app/(tabs)/programs.tsx`
  - `app/(tabs)/__tests__/programs.test.tsx` (new)
- **Dependencies:** T2.
- **Validations:** `npx tsc --noEmit`, `npx jest programs`.
- **Implementation notes:**
  - Destructure `refetch` from `usePrograms()`; set `RefreshControl refreshing={isLoading} onRefresh={refetch}`.
  - Render `currentProgram` via `ProgramCard` + `upcomingPrograms` under "Upcoming" (already present); rely on existing `EmptyState` for 0 assignments (R6).
  - Use `@testing-library/react-native` `render` with `jest.mock("@/features/programs/hooks/usePrograms")` returning fixtures.
- **Tests needed (render):**
  - one active assignment → `ProgramCard` "Active" shown; tapping navigates `router.push("/programs/program-detail/<id>")`.
  - upcoming-only → current slot shows `EmptyState` ("No Program Assigned"); upcoming card shown.
  - 0 assignments → only `EmptyState`.
  - multiple active (R1 edge) → exactly one current card (B), not A/C.
  - pull-to-refresh calls `refetch`.
  - ≥80% coverage on `programs.tsx`.
- **Done criteria:** Programs tab shows current + upcoming from real data; `npx tsc --noEmit && npx jest` green; coverage ≥80%.

---

## T4 — ProgramDetailScreen real data + WorkoutPreviewScreen real (R3, R4)  ✅

- **Objective:** Replace the permanent "Program not found." branch in
  `ProgramDetailScreen` with real mapped data from `useProgramDetail`, and replace
  the permanent placeholder in `WorkoutPreviewScreen` with `useTemplate` + mapped
  `WorkoutPreview`. (T-01.2 detail/preview portion.)
- **Files (modify):**
  - `src/features/programs/screens/ProgramDetailScreen.tsx`
  - `src/features/programs/screens/WorkoutPreviewScreen.tsx`
  - `src/features/programs/screens/__tests__/ProgramDetailScreen.test.tsx` (new)
  - `src/features/programs/screens/__tests__/WorkoutPreviewScreen.test.tsx` (new)
- **Dependencies:** T2 (for `useProgramDetail`); T1 (mapper). `useTemplate` already exists in codebase.
- **Validations:** `npx tsc --noEmit`, `npx jest ProgramDetailScreen WorkoutPreviewScreen`.
- **Implementation notes:**
  - `ProgramDetailScreen`: keep `!program` → not-found (now a true not-found when `useProgramDetail` returns null), render real `program.phases` (single derived phase). No structural change.
  - `WorkoutPreviewScreen`: `const { data: tpl, isLoading, error } = useTemplate(workoutId);` resolve exercise names via `Promise.all(tpl.exercises.map(e => getExercise(e.exercise_id)))` into `id→name` map; call exported pure `mapTemplateToWorkoutPreview(tpl, nameMap)` → `WorkoutPreviewData`; render `<WorkoutPreview>`. Error/missing → error state (not silent placeholder); empty exercises → `blocks:[]`.
  - Export `mapTemplateToWorkoutPreview(tpl: TemplateWithExercises, nameMap: Record<string,string>): WorkoutPreviewData` (pure; single block "Workout", `straight_set`, exercises mapped to `WorkoutBlockExercise` with `name = nameMap[id] ?? exercise_id`, `targetSets`, `targetReps`, `restSeconds`).
- **Tests needed:**
  - `mapTemplateToWorkoutPreview` unit: block/exercise/Sets-Reps-Rest mapping; empty exercises → `blocks:[]`; missing name in `nameMap` falls back to `exercise_id`.
  - `WorkoutPreviewScreen` render: mock `useTemplate` returning template → `<WorkoutPreview>` rendered with title + exercise; mock `getExercise` for names.
  - `WorkoutPreviewScreen` error/fetch-404 → error state (no placeholder text "Workout details will appear here").
  - `ProgramDetailScreen` render: real program → title != "Program not found."; null program → not-found state; null template → phases `[]` no throw.
  - ≥80% coverage on both modified screens.
- **Done criteria:** No permanent placeholder / "Program not found." leak; real data renders; tests green; coverage ≥80%.

---

## T5 — Home/Calendar "assigned today" chip (R5, R6)  ✅

- **Objective:** Show a tappable "Entrenamiento asignado hoy" chip on Home
  (`app/(tabs)/index.tsx`) and Calendar (`src/features/calendar/screens/CalendarScreen.tsx`)
  when an assignment `start_date` equals today's local date, deep-linking to
  `programs/program-detail/{assignmentId}`. (T-01.3.)
- **Files (modify):**
  - `app/(tabs)/index.tsx`
  - `src/features/calendar/screens/CalendarScreen.tsx`
  - `app/(tabs)/__tests__/index.test.tsx` (new) and/or `src/features/calendar/screens/__tests__/CalendarScreen.test.tsx` (new)
- **Dependencies:** T1 (reuse `useAthleteAssignments`).
- **Validations:** `npx tsc --noEmit`, `npx jest index CalendarScreen`.
- **Implementation notes:**
  - Add `const { currentProgram, upcomingPrograms, isLoading } = useAthleteAssignments();` (or a derived `assignedToday` computed from `currentProgram`/`upcomingPrograms` where `startDate === todayStr`). Prefer a tiny pure selector `findAssignedToday(rows, today)` (add to `useAthleteAssignments.ts` or inline) so it is testable.
  - Render chip only when an assignment `start_date === todayStr`; `onPress={() => router.push(`/programs/program-detail/${id}`)}`.
  - Calendar: show chip when selected date or today matches an assignment `start_date`.
- **Tests needed:**
  - Home: assigned today → chip visible; tap navigates to `program-detail/<id>`.
  - Home: no assignment today → chip not shown.
  - Home: assignment today but `template=null` → chip still shows + navigates (R5 null-guard).
  - Calendar: same today-match behavior; date mismatch hides chip.
  - ≥80% coverage on touched regions of both files.
- **Done criteria:** Chip appears only on matching day, deep-links correctly, handles null template gracefully; typecheck + tests green; coverage ≥80%.

---

## T6 — Coverage hardening & integration render pass (R7)  ✅

- **Objective:** Ensure **every new/modified file** in this change reaches ≥80%
  line+branch coverage, add the consolidated Programs-tab render test (mocked
  `listAssignments`) called out in design.md §Testing Strategy, and run the full
  suite green. This is the R7 gate before `sdd-verify`.
- **Files (create/modify):**
  - `src/features/programs/hooks/__tests__/useAthleteAssignments.integration.test.ts` (or extend T1 test) — render `useAthleteAssignments` via `@testing-library/react-native` `renderHook` with `QueryClientProvider` + mocked `listAssignments` (happy / 0 / null-template / multiple-active / upcoming-only).
  - `app/(tabs)/__tests__/programs.test.tsx` (consolidate T3 render cases if not yet present).
  - Touch-up any gaps found by `npx jest --coverage` in T1–T5 files.
- **Dependencies:** T1, T2, T3, T4, T5 (runs after all feature code lands).
- **Validations:** `npx tsc --noEmit && npx jest --coverage` — every touched file ≥80%; full suite green.
- **Tests needed:**
  - `renderHook(useAthleteAssignments)` returns correct `currentProgram`/`upcomingPrograms` per R1 scenarios; `isLoading`/`error` propagate.
  - Programs tab render with mocked `listAssignments` (current card + upcoming list + `EmptyState` on `[]`) per design.md.
  - Verify branch coverage for: multiple active → nearest, null template, 0 assignments, upcoming-only.
- **Done criteria:** Coverage report shows ≥80% on all touched files; `npm test` passes in CI gate; R7 satisfied. No production-code change unless required to reach a branch (documented).

---

## Review Workload Forecast

- **Estimated total changed lines:** ~1,300 (T1 ~270, T2 ~160, T3 ~150, T4 ~290, T5 ~240, T6 ~200).
- **Chained PRs recommended:** **YES** (force-chained per delivery strategy, 800-line budget).
- **400-line budget risk:** **Med** (each individual task is <150 LOC of production code; risk is only if a task is shipped as one PR).
- **Decision needed before apply:** **YES** — confirm `DEFAULT_PROGRAM_WEEKS = 8` is acceptable (design.md Open Question) and confirm `workoutCount` should show `1` vs `template.exercises.length` (Open Question). These are documented assumptions; apply can proceed with the documented defaults if no answer yet.
- **Suggested slices (force-chained):**
  - **Slice PR-1 (≈580 LOC):** T1 + T2 + T3 — assignment hook infra + Programs tab (R1, R2, R6).
  - **Slice PR-2 (≈730 LOC):** T4 + T5 + T6 — detail/preview/chip + coverage gate (R3, R4, R5, R7).
  - Each slice under the 800-line budget; PR-2 chains on PR-1 merge.
