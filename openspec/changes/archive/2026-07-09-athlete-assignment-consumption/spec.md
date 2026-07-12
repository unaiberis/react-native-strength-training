# Spec: Athlete Assignment Consumption (`athlete-assignment-consumption`)

> Delta specification for consuming coach-created `program_assignments` on the
> athlete side. Source of intent: `proposal.md`; grounding: SPEC-01 of
> `docs/audit-coach-athlete/05-specifications.md`; real code anchors cited inline.

## Scope Note — Online Only

All functional requirements **R1–R6 are ONLINE-ONLY**. The athlete read path
calls `listAssignments(user.id)` (`src/lib/pocketbase/services/program-assignments.ts:69`)
and `getAssignment(id)` (`program-assignments.ts:156`), both of which hit
PocketBase. Offline athlete visibility depends on SPEC-05 (sync) and is
explicitly **OUT** of this change. R7 (tests) applies to whatever is
implemented here.

## Data Model Anchors

- `ProgramAssignmentRow` (`src/types/pocketbase.ts:159`): `id`, `athlete`,
  `coach`, `template` (string id), `start_date`, `team_id`, `status`
  (`"active" | "completed" | "cancelled"`), `created`, `updated`.
- `listAssignments` returns rows sorted by `-start_date` and expands `template`
  (`program-assignments.ts:76-78`). Expanded `template` is a `TemplateRow`
  (`src/types/pocketbase.ts:27`): `id`, `user_id`, `name`, `description`,
  `program_block_id`, `is_public`.
- `ProgramSummary` (`src/features/programs/hooks/usePrograms.ts:18`):
  `id`, `name`, `description`, `startDate`, `endDate`, `totalWeeks`,
  `weeksCompleted`, `progressPercent`, `phases: ProgramPhaseSummary[]`,
  `status: "active" | "completed" | "upcoming"`.
- `useAuthStore` exposes `user?.id` (athlete id) (`src/stores/auth-store.ts:22`).
- Programs tab uses `usePrograms()` (`app/(tabs)/programs.tsx:15`) and renders
  `ProgramCard` / `EmptyState`. Detail route is `program-detail/[id]`
  (`app/(tabs)/_layout.tsx:156`), backed by `ProgramDetailScreen`
  (`src/features/programs/screens/ProgramDetailScreen.tsx`) via
  `useProgramDetail(programId)` (`useProgramDetail.ts:17`).
- `WorkoutPreviewScreen` (`src/features/programs/screens/WorkoutPreviewScreen.tsx`)
  consumes `WorkoutPreviewData` (`components/WorkoutPreview.tsx:24`).
- Template read hook: `useTemplate(id)` (`src/features/routines/hooks/useTemplates.ts:101`)
  → `TemplatesService.getTemplate`.

---

## R1 — Athlete can list their assignments (ONLINE-ONLY)

**WHEN** an authenticated athlete (with `user.id` present) opens any screen that
consumes assignments **THEN** the system calls `listAssignments(user.id)`
(`program-assignments.ts:69`) **AND** returns the resulting
`ProgramAssignmentRow[]` (expanded `template` included) to the consuming hook
**AND** surfaces loading/error states via the query lifecycle.

### Scenario: Happy path — athlete with one active assignment

- **Given** an authenticated athlete with `user.id = "ath_1"`
- **And** `program_assignments` contains one row `{ athlete:"ath_1",
  template:"tpl_a", start_date:"2026-07-01", status:"active" }` with expanded
  `template { name:"Hypertrophy Block", description:"..." }`
- **When** a consuming hook (e.g. `useAthleteAssignments`) runs
- **Then** `listAssignments("ath_1")` is called exactly once
- **And** the returned list has length 1
- **And** the row carries the expanded template name `"Hypertrophy Block"`

### Scenario: Edge case — 0 assignments

- **Given** an authenticated athlete `user.id = "ath_2"` with no
  `program_assignments` rows
- **When** the consuming hook runs
- **Then** `listAssignments("ath_2")` is called
- **And** an empty array is returned (no error thrown)

### Scenario: Edge case — assignment without `template` (null-guard)

- **Given** an athlete row where `expand.template` is `null` or absent (e.g.
  orphaned assignment after template deletion)
- **When** the mapping row → `ProgramSummary` runs
- **Then** the system does NOT throw and does NOT dereference `template.name`
- **And** the assignment is either skipped from the derived program list or
  rendered with an empty/placeholder name and empty `phases` (null-guarded),
  without crashing the list

### Scenario: Edge case — multiple active assignments (pick nearest start_date)

- **Given** athlete `user.id = "ath_3"` with rows:
  - A `{ start_date:"2026-06-01", status:"active" }`
  - B `{ start_date:"2026-07-05", status:"active" }`
  - C `{ start_date:"2026-08-01", status:"active" }` (future)
- **And** `today = 2026-07-09`
- **When** `currentProgram` is derived
- **Then** B is selected as `currentProgram` (the active assignment with the
  `start_date` nearest to and not after today — i.e. the latest `start_date`
  `<= today`)
- **And** C is classified as `upcoming` (start_date in the future)

---

## R2 — Programs tab shows `currentProgram` + `upcomingPrograms` (ONLINE-ONLY)

**WHEN** the Programs tab renders (`app/(tabs)/programs.tsx`) **THEN** the
system feeds it `currentProgram` and `upcomingPrograms` derived from the
athlete's assignments **AND** renders `currentProgram` via `ProgramCard`
(routing to `program-detail/[id]`) **AND** renders the `upcomingPrograms` list
under an "Upcoming" section **AND** when no `currentProgram` exists shows the
existing `EmptyState` ("No Program Assigned") card.

### Scenario: Happy path — athlete sees current + upcoming

- **Given** an athlete with `currentProgram` = B (R1 edge case) and
  `upcomingPrograms` = [C]
- **When** the Programs tab renders
- **Then** a `ProgramCard` for B is shown with status badge `Active`
- **And** an "Upcoming" section renders a `ProgramCard` for C with status
  `Upcoming`
- **And** tapping either card navigates to `program-detail/{id}` where `id` is
  the assignment id (so `getAssignment(id)` resolves)

### Scenario: Edge case — 0 assignments (empty state)

- **Given** an athlete with empty assignment list
- **When** the Programs tab renders
- **Then** no `ProgramCard` is shown
- **And** the `EmptyState` with title "No Program Assigned" is displayed

### Scenario: Edge case — only upcoming, no current

- **Given** an athlete whose only assignment has `start_date` in the future
- **When** the Programs tab renders
- **Then** the "Current/Active Program" slot shows the `EmptyState`
- **And** the assignment appears only under the "Upcoming" section

### Scenario: Edge case — multiple active (R1) reflected here

- **Given** athlete `ath_3` from R1 (current=B, upcoming=[C])
- **When** the Programs tab renders
- **Then** exactly one card appears in the current slot (B, not A or C)
- **And** previously-assigned-but-earlier active assignment A is NOT shown as
  current

---

## R3 — ProgramDetailScreen shows real template/phase data (ONLINE-ONLY)

**WHEN** `ProgramDetailScreen` mounts with a `programId` that equals an
assignment id **THEN** the system calls `getAssignment(programId)`
(`program-assignments.ts:156`, expand `template,athlete`) **AND** maps the
result into a `ProgramSummary` (real name, description, date range, progress,
and `phases` derived from the expanded template) **AND** renders it — replacing
the current permanent "Program not found." branch (`ProgramDetailScreen.tsx:36-39`).

### Scenario: Happy path — real detail

- **Given** `programId = "asg_b"` resolves to assignment B with expanded
  template `{ name:"Hypertrophy Block", description:"8-week plan" }`
- **When** `ProgramDetailScreen` renders after load
- **Then** the title shows `"Hypertrophy Block"` (not "Program not found.")
- **And** the description and progress section render with real values
- **And** the Phases section renders non-empty `program.phases` derived from the
  template (or a single derived phase when the template has no explicit phase
  structure)

### Scenario: Edge case — assignment without `template` (null-guard)

- **Given** `programId = "asg_x"` resolves to a row whose `expand.template` is
  `null`
- **When** `ProgramDetailScreen` renders after load
- **Then** the system does NOT throw
- **And** it renders a null-guarded detail (name falls back to placeholder;
  `phases = []`) without the permanent "Program not found." crash path

> Note: `program.phases` (`ProgramPhaseSummary[]`) is derived from the expanded
> template. The precise template→phases algorithm (weeks, workout grouping) is
> reserved for the design phase, constrained to **no schema change** per the
> proposal. Fallback when no phase/block structure exists: a single phase
> containing all template exercises, `weekStart=1`, `weekEnd=totalWeeks`.

---

## R4 — WorkoutPreviewScreen renders real preview (ONLINE-ONLY)

**WHEN** `WorkoutPreviewScreen` mounts with a `workoutId` (a template id or
assignment-derived workout id) **THEN** the system fetches the real template
via `useTemplate(workoutId)` (`useTemplates.ts:101`) **AND** maps it to
`WorkoutPreviewData` (`WorkoutPreview.tsx:24`: `id`, `name`, `description`,
`blocks[]` with exercises/sets/reps/rest) **AND** renders `<WorkoutPreview>`
**AND** the permanent placeholder (`WorkoutPreviewScreen.tsx:22,59`) is removed.

### Scenario: Happy path — real workout preview

- **Given** `workoutId = "tpl_a"` resolves to a template with
  `name:"Day A"`, `description:"...", exercises:[{name:"Squat", targetSets:4,
  targetReps:8, restSeconds:120}]`
- **When** `WorkoutPreviewScreen` renders after load
- **Then** the screen shows title `"Day A"` and a block/exercise
  `"Squat"` with Sets 4 / Reps 8 / Rest 2:00
- **And** the placeholder "Workout details will appear here…" is NOT shown

### Scenario: Edge case — template without `template_exercises`

- **Given** `workoutId = "tpl_empty"` resolves to a template with zero
  exercises
- **When** `WorkoutPreviewScreen` renders
- **Then** the system renders the preview with `blocks = []` (or an
  empty-state within the preview) without throwing

### Scenario: Edge case — fetch error / missing template

- **Given** `workoutId = "tpl_missing"` cannot be fetched (404/network)
- **When** `WorkoutPreviewScreen` renders
- **Then** the system shows an error/empty state (not the silent placeholder,
  not a crash)

---

## R5 — Home/Calendar shows "assigned today" indicator deep-linking to detail (ONLINE-ONLY)

**WHEN** the Home screen (`app/(tabs)/index.tsx`) or Calendar screen
(`src/features/calendar/screens/CalendarScreen.tsx`) renders for an athlete who
has an assignment whose `start_date` equals today (local day) **THEN** the
system shows an indicator chip (e.g. "Entrenamiento asignado hoy") **AND** the
chip is tappable and deep-links to `program-detail/{assignmentId}` (matching
the `programId` contract from R2/R3).

### Scenario: Happy path — assigned today

- **Given** `today = 2026-07-09` and an athlete with assignment
  `{ id:"asg_b", start_date:"2026-07-09" }`
- **When** Home (or Calendar) renders
- **Then** an "assigned today" indicator is visible
- **And** tapping it navigates to `program-detail/asg_b`
- **And** that route opens `ProgramDetailScreen` with real data (R3)

### Scenario: Edge case — no assignment today

- **Given** an athlete whose assignments all have `start_date != today` (past or
  future)
- **When** Home/Calendar renders
- **Then** the "assigned today" indicator is NOT shown

### Scenario: Edge case — assignment without template (null-guard)

- **Given** an assignment with `start_date = today` but `expand.template = null`
- **When** the indicator renders and is tapped
- **Then** navigation still succeeds to `program-detail/{id}` and R3's
  null-guard handles the missing template gracefully

---

## R6 — Empty state when 0 assignments (ONLINE-ONLY)

**WHEN** the athlete has zero `program_assignments` rows **THEN** every
assignment-consuming surface renders its existing empty state **AND** no
"Program not found." or placeholder leak appears.

### Scenario: Happy path — consistent empty state

- **Given** an authenticated athlete with no assignments
- **When** Programs tab, ProgramDetailScreen (via invalid id), and
  Home/Calendar render
- **Then** Programs tab shows the `EmptyState` ("No Program Assigned") card
  (`programs.tsx:62`)
- **And** ProgramDetailScreen for a non-existent id shows its not-found/empty
  state (not a crash)
- **And** Home/Calendar shows no "assigned today" chip

---

## R7 — Tests exist with ≥80% coverage per file

**WHEN** the change is implemented **THEN** unit tests exist (Jest node env +
`@testing-library/react-native` per `AGENTS.md`) **AND** every new or modified
file reaches **≥80% coverage** (lines/branches per `openspec/config.yaml`
threshold) **AND** `npm test` passes in CI (`npx tsc --noEmit && npx jest
--passWithNoTests`).

### Scenario: Happy path — coverage gate

- **Given** new files `useAthleteAssignments.ts`, rewired `usePrograms.ts`,
  `useProgramDetail.ts`, and modified UI screens
- **When** `npx jest --coverage` runs
- **Then** each new/modified file reports coverage ≥ 80%
- **And** the full suite is green

### Scenario: Edge case — edge-case branches covered

- **Given** tests must cover the SPEC-01 edge cases
- **When** the test suite is reviewed
- **Then** branches for: multiple active (nearest `start_date`),
  null `template`, 0 assignments, and upcoming-only are all exercised by tests
  (not left as uncovered happy-path-only code)

---

## Cross-Cutting Acceptance (from proposal success criteria)

- [ ] Athlete with an active `program_assignments` row sees it as
      `currentProgram` in the Programs tab (R2).
- [ ] Tapping a program opens `ProgramDetailScreen` with real template/phase
      data (R3), not "Program not found."
- [ ] Calendar/Home shows an "assigned today" indicator linking to detail (R5).
- [ ] Athlete with 0 assignments still shows correct empty state (R6).
- [ ] `WorkoutPreviewScreen` renders real workout preview, no placeholder (R4).
- [ ] `npm test` passes with ≥80% coverage on new/modified files (R7).

## Explicitly Out of Scope (no scope creep beyond SPEC-01)

- Coach-side assignment creation (already works via `assignProgram`).
- Notifications ping (SPEC-03), feedback loop (SPEC-02).
- Bulk/team fan-out (SPEC-08), null-team visibility (SPEC-09).
- Offline athlete visibility / sync integrity (SPEC-05) — R1–R6 online-only.
- Schema changes — none; reuses `program-assignments` service + `ProgramCard`/
  `WorkoutPreview` components.
