# Design: Coach-Assigned Only MVP

## Technical Approach

Remove athlete self-service entry points (blank workouts, routines, programs tab, exercise browsing from Train) and refocus on coach-assigned training. Four independent phases: (C) Train rewired to `findAssignedToday`, (D) delete athlete Routines, (E) delete athlete Programs tab, (G) coach nav simplification + per-athlete calendar assignment. No schema changes. Reuse existing `CalendarGrid`, `EmptyState`, and `useAthleteAssignments`/assign flow.

## Architecture Decisions

| Option | Tradeoffs | Decision |
|--------|-----------|----------|
| **Where to put `useAthleteAssignments`** | Stays in `features/programs/` (deleted in Phase E) vs. moved before deletion | **Move to `src/features/athlete-assignments/hooks/`** — kept alive for Train (C) + athlete Calendar. Also move `program-types.ts` as dependency. Update imports in CalendarScreen. |
| **Coach calendar grid** | Build custom vs. reuse `CalendarGrid` | **Reuse `CalendarGrid`** — same visual contract (`CalendarMonth` → grid). Coach needs assignment data source instead of workout data; wire new `useAthleteCalendar(athleteId)` hook returning the same shape. |
| **Assign flow integration** | Rebuild vs. param-hijack existing `assign.tsx` | **Add `date` param to `assign.tsx`** — pre-fills `startDate` state. Calendar tap → `router.push("/(coach)/assign?athleteId=X&date=YYYY-MM-DD")`. Minimal diff. |
| **Coach bottom nav** | 5 tabs vs. 1 tab + hidden routes | **1 primary tab: Athletes**. Library/Templates/Assign as hidden routes. Dashboard stats (`totalAthletes`/`activeCount`/`inactiveCount`) absorbed into Athletes list header. Teams accessible from athlete detail. |
| **Train empty state** | Custom illustration vs. reuse | **Reuse `EmptyState`** component with `barbell-outline` icon + "No training scheduled for today" subtitle. |
| **Home "Routines" chip** | Keep vs. remove | **Remove** — Phase D deletes the routines feature it navigates to. Also remove the `from "@/features/routines/hooks/useTemplates"` import from Train (Phase C replaces that section entirely). |
| **Coach stat cards** | Keep as separate screen vs. merge into Athletes | **Merge into Athletes list header** — render 3 stat cards (total, active, inactive) above the search bar in `athletes.tsx`, sourced from existing `useCoachDashboard`. |

## Data Flow

```ascii
Coach assigns workout
  ↓
program_assignments (PocketBase)
  ↓
useAthleteAssignments → findAssignedToday(date)
  ↓
Train screen shows assignment card with "Start Workout"
  ↓
(workout)/active?mode=assignment&assignmentId=X
```

```ascii
Coach taps athlete → Calendar screen
  ↓
useAthleteCalendar(athleteId) → listAssignments(athleteId)
  ↓
CalendarGrid shows dates with assignments as dots
  ↓
Tap date (no assignment) → assign.tsx?athleteId=X&date=YYYY-MM-DD
Tap date (has assignment) → assignment/{id} detail/edit/remove
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/programs/hooks/useAthleteAssignments.ts` | Move | → `src/features/athlete-assignments/hooks/useAthleteAssignments.ts` |
| `src/features/programs/hooks/__tests__/useAthleteAssignments.test.ts` | Move | → `src/features/athlete-assignments/hooks/__tests__/` |
| `src/features/programs/hooks/__tests__/assignedToday.test.ts` | Move | → `src/features/athlete-assignments/hooks/__tests__/` |
| `src/features/programs/program-types.ts` | Move | → `src/features/athlete-assignments/` |
| `src/features/calendar/screens/CalendarScreen.tsx` | Modify | Update import path to new `useAthleteAssignments` location |
| `app/(tabs)/train.tsx` | Rewrite | Show `findAssignedToday` result only. Empty state when none. No blank workout/browse/routines. |
| `app/(tabs)/_layout.tsx` | Modify | Remove `programs` `Tabs.Screen`. Remove routines hidden route entries. |
| `app/(tabs)/home.tsx` | Modify | Remove "Routines" quick-action chip (middle chip row) |
| `app/(tabs)/programs.tsx` | Delete | Entire file |
| `app/(tabs)/programs/` | Delete | Full directory incl. sub-routes |
| `src/features/programs/` | Delete | Everything EXCEPT files moved above + `__tests__` files for deleted hooks |
| `app/(tabs)/routines/` | Delete | Full athlete-side directory |
| `src/features/routines/` | Delete | Full directory (athlete routine hooks) |
| `app/(coach)/_layout.tsx` | Rewrite | 1 tab (Athletes) + hidden routes for library/templates/assign/teams |
| `app/(coach)/dashboard.tsx` | Delete | Merged into athletes.tsx |
| `app/(coach)/athletes.tsx` | Modify | Add stats banner header above search bar |
| `app/(coach)/assign.tsx` | Modify | Accept optional `date` URL param to pre-fill `startDate` |
| `app/(coach)/athlete/[id].tsx` | Modify | Add "Calendar" action button in quick actions row |
| `app/(coach)/athlete/[id]/calendar.tsx` | **Create** | Coach per-athlete calendar screen |
| `src/features/coach/hooks/useAthleteCalendar.ts` | **Create** | Hook: fetch athlete assignments, build CalendarMonth shape |

## Interfaces

### useAthleteCalendar hook
```typescript
// Returns data shaped for CalendarGrid consumption
interface UseAthleteCalendarResult {
  calendarMonth: CalendarMonth | null;  // same type as src/features/calendar
  isLoading: boolean;
  assignments: ProgramAssignmentRow[];  // raw for detail lookup
  refetch: () => void;
}
```

### Assign screen param addition
```typescript
// Existing params + new optional date
type AssignParams = {
  athleteId?: string;
  athleteName?: string;
  teamId?: string;
  date?: string;  // NEW: YYYY-MM-DD, pre-fills startDate
};
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `useAthleteCalendar` hook | Mock `listAssignments`, verify CalendarMonth derivation, date filtering |
| Unit | `TrainScreen` empty state | Render with no assignment, verify `EmptyState` text |
| Unit | `TrainScreen` with assignment | Mock `useAthleteAssignments` + `findAssignedToday`, verify assignment card renders |
| Unit | Coach nav — athletes header stats | Verify stat cards render with mock data |
| Unit | Assign screen date param | Render with `date=2026-07-15`, verify startDate pre-filled |
| Deletion | Programs/routines hooks | Delete associated test files. Verify no import breakage. |

## Migration / Rollout

No data migration. Phases are sequential and independent. Each phase commit is revertible. Phase E (programs tab deletion) is the riskiest — run `npx jest` before merge. Phase G-nav may need `git revert` if coach workflow is disrupted.

## Open Questions

- [ ] Does the Home "Routines" chip removal leave 2 chips that look odd? Proposal: keep "Exercises" and "History" chips only, or add a new chip ("Today's Workout"? — redundant with Train).
- [ ] Coach nav: should Library remain as a bottom tab (2 tabs: Athletes + Library) for coach power users, or hidden as proposed? Recommendation: start with 1 tab, users can request Library tab.
- [ ] Athlete CalendarScreen currently imports `useAthleteAssignments` — after the move, should it keep the assignment chip (`assignedChip` in CalendarScreen)? Currently deep-links to a `programs/program-detail` route that will be deleted. The chip should be removed, or deep-link to Train instead.
