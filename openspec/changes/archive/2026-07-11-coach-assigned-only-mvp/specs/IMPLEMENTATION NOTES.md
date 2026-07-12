# Implementation Notes — Coach-Assigned Only MVP

These changes are UI/route-level and do not require full spec-level requirements. They are documented here for design completeness.

## C — Train Redesign

- Rewrite `app/(tabs)/train.tsx` to show only `findAssignedToday` result
- Remove blank-workout, browse-exercises, and start-from-routine entry points
- Empty state: illustration + "No training scheduled for today" when no assignment exists
- The Train tab itself stays in the bottom nav — only its content changes

## D — Remove Athlete Routines

- Delete `app/(tabs)/routines/` directory (athlete-side routes only)
- Delete `src/features/routines/` (athlete routine hooks)
- Delete home-screen "Routines" quick-action chip in `app/(tabs)/home.tsx`
- Coach Templates (`app/(coach)/`, `src/features/templates/`) remain untouched

## E — Remove Athlete Programs Tab

- Delete `app/(tabs)/programs.tsx`
- Delete `app/(tabs)/programs/` directory (all sub-routes)
- Delete `app/(tabs)/program-detail/` and `app/(tabs)/workout-preview/` sub-routes
- Remove `Tabs.Screen` for programs in `app/(tabs)/_layout.tsx`
- Delete `src/features/programs/` (athlete feature hooks)
- Coach-side assignment infrastructure (`program_assignments`, assignment hooks) stays

## G-nav — Coach Nav Simplification

- Rewrite `app/(coach)/_layout.tsx` — collapse 5 tabs to 1 primary (Athletes)
- Remove `app/(coach)/dashboard.tsx` — Dashboard stats merged into Athletes list header
- Library and Templates become hidden routes accessed from athlete detail flow, not bottom tabs
- Teams tab absorbed into athlete management (no separate tab)
- Coach bottom nav has 1 main tab (Athletes); Library and Templates are navigated to from athlete screen
