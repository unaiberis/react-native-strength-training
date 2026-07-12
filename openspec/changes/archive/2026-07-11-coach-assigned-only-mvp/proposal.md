# Proposal: Coach-Assigned Only MVP

## Intent

Eliminate athlete self-service workflows (blank workouts, routines, programs tab, exercise browsing) and refocus the athlete experience on **coach-assigned training only**. The athlete sees what their coach assigned on the right date — no more, no less. On the coach side, simplify navigation and add a calendar-based assignment surface per athlete.

## Scope

### In Scope
- **C — Train redesign**: show only today's assigned workout (via `findAssignedToday`). Remove blank workout, browse exercises, start-from-routine. Empty state when nothing assigned.
- **D — Remove athlete Routines**: delete `app/(tabs)/routines/`, home quick-action "Routines", and Train "Start from Routine". Coach Templates (`app/(coach)/`) untouched.
- **E — Remove athlete Programs tab**: delete `programs.tsx` + `Tabs.Screen`, `program-detail/`, `workout-preview/`. Coach assignment backend stays.
- **G — Coach nav simplification**: collapse to Athletes (primary), Library + Templates absorbed into hidden routes. Remove Dashboard tab. Teams absorbed into athlete management.
- **G — Coach calendar assignment**: per-athlete calendar view (similar to athlete Calendar) → tap date → pick template → assign. Reuses existing `assign` flow + `workout-builder`.

### Out of Scope
- Schema/persistence changes (assignment model exists).
- Pre-existing tsc errors (6 on main) — not ours.
- e1RM in Home (done in prior change).
- Progress tab (merged into Analytics — prior change).
- Athlete Routines feature code deletion (only route/hooks cleanup).
- Coach **Templates** tab — kept unchanged; accessible from athlete detail flow.

## Capabilities

### New Capabilities
- `coach-athlete-calendar`: per-athlete calendar screen within coach flow, with date-tap → assignment picker reusing existing `assign` + `workout-builder`.

### Modified Capabilities
- `exercise-library`: athlete no longer accesses exercise browsing from Train tab; exercises remain accessible from Home "Exercises" quick-action (if that chip is kept) and from coach Library tab.

## Approach

1. **Phase 1 — Train redesign (C)**: Rewrite `app/(tabs)/train.tsx` to show `findAssignedToday` only. Empty state if none. Keep or remove Home "today" chip (recommend: remove — Train tab is the dedicated surface).
2. **Phase 2 — Cleanup (D+E)**: Delete athlete Routines routes (`app/(tabs)/routines/`) and Programs tab (`app/(tabs)/programs.tsx` + sub-routes + `Tabs.Screen` in `_layout.tsx`). Remove home "Routines" quick-action.
3. **Phase 3 — Coach nav (G-nav)**: Rewrite `app/(coach)/_layout.tsx`. Collapse 5 tabs → Athletes primary. Dashboard → merged into Athletes list. Library/Templates → hidden routes accessed from athlete detail.
4. **Phase 4 — Coach calendar (G-feature)**: New `app/(coach)/athlete/[id]/calendar.tsx` route with month/week picker. Tap date → opens existing `assign?athleteId=X&date=Y` flow. Builds on existing `program_assignments` data model.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/(tabs)/train.tsx` | Rewrite | Show assigned workout only |
| `app/(tabs)/_layout.tsx` | Modified | Remove programs Tabs.Screen, routines hidden routes |
| `app/(tabs)/programs.tsx` | Deleted | Entire file + sub-routes |
| `app/(tabs)/programs/` | Deleted | Full directory |
| `app/(tabs)/routines/` | Deleted | Full directory (athlete side) |
| `app/(tabs)/home.tsx` | Modified | Remove "Routines" quick-action chip |
| `src/features/routines/` | Deleted | Athlete routine hooks (coach templates separate) |
| `src/features/programs/` | Deleted | Athlete programs feature (coach + assignment hooks kept) |
| `app/(coach)/_layout.tsx` | Rewrite | Simplify tabs |
| `app/(coach)/dashboard.tsx` | Deleted | Absorbed into Athletes list |
| `app/(coach)/athlete/[id].tsx` | Modified | Add calendar assignment entry point |
| `app/(coach)/athlete/[id]/calendar.tsx` | New | Calendar + date-based assignment |
| `src/features/coach/` | Modified | New hooks for calendar-assignment flow |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Programs tab removal breaks existing tests | High | Update/delete tests; coverage threshold applies |
| Coach nav change disorients existing coach users | Med | Keep same iconography; Dashboard stats shown on Athletes list header |
| Calendar assignment duplicates existing assign flow | Low | Wrap existing `assign` screen as modal, don't rebuild |
| Routines feature removal affects workout execution | Low | Workout execution from template still works via assign → calendar → Train today |

## Rollback Plan

Per phase: `git revert <phase-commit>`. Phases are sequential with no cross-dependencies (C, D+E, G-nav, G-feature). Programs tab removal is the riskiest — test coverage on `programs.test.tsx` must be verified before merge.

## Dependencies

- `findAssignedToday` and `useAthleteAssignments` hooks remain unchanged.
- Coach assignment flow (`assign`, `assignment/[id]`, `workout-builder`) unchanged.
- Coach Templates tab unchanged.

## Success Criteria

- [ ] Athlete Train tab shows only today's assigned workout (or empty state).
- [ ] No athlete access to Routines or Programs tabs/routes.
- [ ] Coach bottom nav has ≤3 primary tabs (Athletes, plus hidden Library/Templates).
- [ ] Coach can view athlete calendar and assign workouts by date.
- [ ] All modified/new files pass `npx jest` with ≥80% coverage.
- [ ] `npx tsc --noEmit` passes (excluding 6 pre-existing errors).
