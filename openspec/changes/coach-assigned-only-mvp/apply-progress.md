# Apply Progress — Coach-Assigned Only MVP

## Commits

| Phase | Commit | Description |
|-------|--------|-------------|
| 1 | `12069d9` | feat(train): rewrite to show only today's assigned workout |
| 2 | `3f206e6` | refactor: remove athlete Routines and Programs features |
| 3 | `8e56c81` | refactor(coach): simplify nav to single Athletes tab |
| 4 | `aeb2b0b` | feat(coach): per-athlete calendar with date-based assignment flow |

## What Shipped

### Phase 1 — Train redesign (C)
- Moved `useAthleteAssignments.ts` + `program-types.ts` + tests to `src/features/athlete-assignments/hooks/`
- Updated import paths in CalendarScreen, index.tsx, home.tsx, and their tests
- Rewrote `app/(tabs)/train.tsx`: shows only `findAssignedToday` result; empty state with "No training scheduled for today"
- Removed blank-workout card, browse exercises, routines list, and `useTemplates` import from Train
- Removed "Routines" quick-action chip from home.tsx and index.tsx
- Retargeted assigned-today chip deep-link from `/programs/program-detail/{id}` to `/(tabs)/train` in both index.tsx and CalendarScreen
- Wrote 9 RED→GREEN tests for Train (empty + loaded + loading states)

### Phase 2 — Cleanup: Routines + Programs (D+E)
- Removed `programs` Tabs.Screen + `tabIcons.programs` + programs/routines hidden routes from `_layout.tsx`
- Retargeted CalendarScreen assignedChip deep-link from `/programs/program-detail/{id}` to `/(tabs)/train`; updated CalendarScreen test
- Deleted: `app/(tabs)/programs.tsx`, `app/(tabs)/programs/`, `app/(tabs)/routines/`, `src/features/programs/`, `src/features/routines/screens/`, `programs.test.tsx`
- Kept `src/features/routines/hooks/` — `useTemplates.ts` is shared with coach assign flow
- Grep-confirmed zero leftover references

### Phase 3 — Coach nav simplification (G-nav)
- Rewrote coach `_layout.tsx`: 1 primary tab (Athletes); library, assign, workout-builder, assigned-programs, teams as hidden routes
- Added stats banner (total/active/inactive from `useCoachDashboard`) to athletes.tsx header
- Deleted `app/(coach)/dashboard.tsx`; redirected coach entry from `/dashboard` to `/athletes`
- Added hidden route entry for `athlete/[id]/calendar`

### Phase 4 — Coach calendar assignment (G-feature)
- Created `useAthleteCalendar` hook: fetches `listAssignments(athleteId)`, builds `CalendarMonth`-compatible shape for grid
- Created `app/(coach)/athlete/[id]/calendar.tsx`: month grid reusing CalendarGrid; tap empty date → assign with athleteId+date; tap assigned date → assignment detail
- Added optional `date` URL param to assign.tsx to pre-fill startDate
- Added "Calendar" button to athlete detail screen quick actions
- Wrote 10 RED→GREEN tests (6 hook + 4 calendar screen)

## Test Results
- **Suite**: 87 passed, 1 failed (pre-existing analytics-calc failures — 3 tests)
- **Tests**: 1047 passed, 3 failed (pre-existing)
- **Coverage**: ≥80% on all changed/new files
- **tsc**: 0 new type errors (1 pre-existing in jest.setup.ts)

## Remaining Items
- None — all tasks complete. Ready for sdd-verify.

## Risks
- Coach assign.tsx still imports `useTemplates` from `@/features/routines/hooks/useTemplates` — this is fine as the hooks directory was kept
- The `src/features/routines/hooks/` directory remains (with `useTemplates.ts`) for coach use
- Pre-existing analytics-calc.test.ts failures (3 tests) remain unchanged
