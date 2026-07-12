# Tasks: Coach-Assigned Only MVP

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550 |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Delivery strategy | main-direct |
| Note | main-direct bypasses PR review; commit work-unit chunks directly |

### Suggested Work Units

| Unit | Goal | Delivery | Notes |
|------|------|----------|-------|
| 1 | Phase 1: Move hook + Train rewrite | direct commit | Foundation |
| 2 | Phase 2: Cleanup Routines + Programs | direct commit | After move completes |
| 3 | Phase 3: Coach nav simplification | direct commit | Independent |
| 4 | Phase 4: Coach calendar | direct commit | Independent |

## Phase 1 — Train redesign (C)

- [x] 1.1 **MOVE** `useAthleteAssignments` + `program-types.ts` + their test files to `src/features/athlete-assignments/hooks/` (CRITICAL: before Phase E deletion). Update import path in `CalendarScreen.tsx` and mock path in `CalendarScreen.test.tsx`.
- [x] 1.2 **RED** Write `app/(tabs)/__tests__/train.test.tsx`: empty-state (no assignment) and loaded-state (assignment card renders) tests.
- [x] 1.3 **REWRITE** `app/(tabs)/train.tsx`: show `findAssignedToday` result only. Remove blank-workout card, browse exercises, routines list. Use `EmptyState` with "No training scheduled for today". Remove `useTemplates` import.
- [x] 1.4 **MODIFY** `app/(tabs)/home.tsx`: delete "Routines" quick-action chip (middle column). Keep "Exercises" and "History".

## Phase 2 — Cleanup: Routines + Programs (D+E)

- [x] 2.1 **MODIFY** `app/(tabs)/_layout.tsx`: remove `programs` Tabs.Screen, `programs/...` hidden routes, `routines/...` hidden routes. Remove `programs` from `tabIcons`.
- [x] 2.2 **MODIFY** `CalendarScreen.tsx`: retarget assignedChip deep-link from `/programs/program-detail/{id}` to `/(tabs)/train`. Update test assertion in `CalendarScreen.test.tsx`.
- [x] 2.3 **DELETE** `app/(tabs)/programs/`, `app/(tabs)/routines/` (full directories). Delete `src/features/programs/`, `src/features/routines/`. Keep `src/features/athlete-assignments/` (moved in 1.1).
- [x] 2.4 **GREP-CONFIRM** zero references to deleted imports (`@/features/programs/`, `@/features/routines/`, routines screen paths, programs screen paths) across `src/`, `app/`, `scripts/`. Update mocks in remaining tests.

## Phase 3 — Coach nav simplification (G-nav)

- [x] 3.1 **REWRITE** `app/(coach)/_layout.tsx`: collapse to 1 primary tab (Athletes). Library, dashboard, teams, workout-templates become `href: null` hidden routes. 1-tab layout with `tabBarStyle: { display: "none" }` or minimal single tab.
- [x] 3.2 **MODIFY** `app/(coach)/athletes.tsx`: add stats banner (total/active/inactive from `useCoachDashboard`) above search bar.
- [x] 3.3 **DELETE** `app/(coach)/dashboard.tsx`. Grep-confirm zero references.
- [x] 3.4 **ADD** hidden route entry for `athlete/[id]/calendar` in coach _layout (route created in Phase 4).

## Phase 4 — Coach calendar assignment (G-feature)

- [x] 4.1 **CREATE** `src/features/coach/hooks/useAthleteCalendar.ts`: fetches `listAssignments(athleteId)`, groups by date, returns `CalendarMonth`-compatible shape. Follows `useAthleteAssignments` pattern.
- [x] 4.2 **RED** Write test for `useAthleteCalendar`: mock `listAssignments`, verify CalendarMonth derivation, date filtering.
- [x] 4.3 **CREATE** `app/(coach)/athlete/[id]/calendar.tsx`: month grid reusing `CalendarGrid` or simple month view. Dates with assignments marked. Tap → `router.push(\`/(coach)/assign?athleteId=X&date=YYYY-MM-DD\`)`.
- [x] 4.4 **MODIFY** `app/(coach)/assign.tsx`: accept optional `date` URL param, pre-fill `startDate` state (overrides default today).
- [x] 4.5 **MODIFY** `app/(coach)/athlete/[id].tsx`: add "Calendar" action button in quick actions row.
- [x] 4.6 **RED** Write test for calendar screen + assign flow with date param: verify date pre-fill, verify navigation on tap.

## Phase 5 — Verify

- [x] 5.1 Run `npx jest`: all tests pass, coverage ≥80% on changed/new files.
- [x] 5.2 Run `npx tsc --noEmit`: no new type errors (6 pre-existing excluded).
- [x] 5.3 Grep-confirm zero references to deleted modules across `src/`, `app/`, `scripts/`, `tests/`.
