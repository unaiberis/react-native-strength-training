# Proposal: Athlete Assignment Consumption

## Intent

Wire the athlete-facing consumption of coach-created `program_assignments`. Today the coach can assign programs (`assignProgram`, `program-assignments.ts:24`) but the athlete never sees them: `usePrograms` returns an empty `TODO` stub (`usePrograms.ts:82-100`), `useProgramDetail` returns `null` (`useProgramDetail.ts:17`), `Programs` tab shows a "No Program Assigned" card, and `WorkoutPreviewScreen` is a permanent placeholder (`WorkoutPreviewScreen.tsx:59`). This change closes the central gap (audit #1, "El gap central") by reading the already-working `listAssignments(athleteId)` (`program-assignments.ts:69`) and feeding 4 athlete UI surfaces with real data.

## Problem

The coach→athlete loop is write-only. `program_assignments` is a ledger the coach reads (`listCoachAssignments`) but the athlete has zero read paths. Evidence: audit `01-current-flow-map.md:21,30-40` (flow #2); `usePrograms.ts:83` never calls `listAssignments`; `WorkoutPreviewScreen.tsx:48-76` placeholder. Classified **CRÍTICA** in `03-comparison.md:9`.

## Scope — IN

- New `useAthleteAssignments` hook (TanStack Query) calling `listAssignments(user.id)` (`useAuthStore(s => s.user?.id)` from `auth-store.ts:22`), mapping rows → `ProgramSummary` (`usePrograms.ts:18`), deriving `currentProgram` (active, nearest `start_date`) and `upcomingPrograms` (future dates).
- Feed `Programs` tab (`app/(tabs)/programs.tsx:15`) via `useAthleteAssignments`; reuse existing `ProgramCard`/`EmptyState`.
- `ProgramDetailScreen` real data via `useProgramDetail` → `getAssignment(id)` (`program-assignments.ts:156`), expanding `template` to build phases/workouts.
- `WorkoutPreviewScreen` real data via template fetch (existing `useTemplates`).
- Home/Calendar indicator chip ("Entrenamiento asignado hoy") deep-linking to `program-detail/[id]`.
- Unit tests (jest node env + `@testing-library/react-native`) per `AGENTS.md`, ≥80% coverage per file.

## Scope — OUT

- Coach-side assignment creation (already works).
- Notifications push (SPEC-03).
- Bulk/team assignment fan-out (SPEC-08) and null-team visibility (SPEC-09).
- Offline sync integrity (SPEC-05).
- Feedback loop (SPEC-02).

## Proposed approach

Reuse the existing `program-assignments` service (`listAssignments`, `getAssignment`) and the `ProgramCard` / `WorkoutCard` components — no schema change. Add one new hook `useAthleteAssignments` and rewire `usePrograms`/`useProgramDetail` internals to call it, then wire the 3-4 UI surfaces. Edge cases from SPEC-01: multiple active assignments (pick nearest `start_date`), assignment without `template` (null-guard), 0 assignments (existing `EmptyState`).

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Offline not covered (assignments absent from pull set) | Low/Med | Follow-up depends on SPEC-05; online-only first |
| `listAssignments` filter uses string interpolation (`program-assignments.ts:76`) | Low | Tracked by SPEC-12; not changed here |

## Dependencies

- SPEC-05 (offline sync) — for offline athlete visibility.
- SPEC-03 (notifications) — for the assignment ping (not required for display).

## Success criteria

- [ ] Athlete with an active `program_assignments` row sees it as `currentProgram` in the Programs tab.
- [ ] Tapping a program opens `ProgramDetailScreen` with real template/phase data (not "Program not found").
- [ ] Calendar/Home shows an "assigned today" indicator linking to detail.
- [ ] Athlete with 0 assignments still shows correct empty state.
- [ ] `WorkoutPreviewScreen` renders real workout preview (no placeholder).
- [ ] `npm test` passes with ≥80% coverage on new/modified files.
