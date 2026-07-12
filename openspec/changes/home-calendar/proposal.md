# Proposal: Home / Calendario — Weekly Calendar in the Athlete Home Tab

## Intent

The athlete Home tab currently shows stats (total workouts, sets, this week) and recent activity. There is no way for the athlete to see their weekly training schedule at a glance on the home screen. This change adds a **weekly calendar section** to the Home tab so athletes can see which days have assigned/completed workouts and tap into a day to see details.

This directly addresses the gap documented in `AGENTS.md` under *TheHybridProject*:

> **Home / Calendario** ❌ No existe — Crear calendario semanal/mensual

## Scope

### In
- Add a weekly calendar section to `app/(tabs)/home.tsx` (or `app/(tabs)/index.tsx`) as the primary content
- Reuse existing `useWeekCalendar` hook and `WeekStrip` component from `src/features/calendar/`
- Create a new `WorkoutDayList` component to show the assigned/completed workouts for a selected day
- Create a new hook `useSessionsForDate` (or similar) to fetch sessions for the selected date
- Wire tap on a workout → navigate to the existing workout detail/history routes
- Show empty state when no workouts exist for a selected day
- Pull-to-refresh updates the calendar data
- Keep existing stats and recent activity below the calendar section

### Out
- Month grid view (the existing `CalendarGrid` in `CalendarScreen` is separate)
- Coach calendar views (`app/(coach)/athlete/[id]/calendar.tsx` is separate)
- Coach assignment creation flow
- Adding a new tab — the calendar lives **inside** the existing Home tab
- Session creation/editing — calendar is read-only for navigation

## Capabilities This Adds/Modifies

| Capability | Description |
|-----------|-------------|
| `home/week-calendar` | NEW — weekly calendar strip showing workout indicators on the Home tab |
| `home/day-detail` | NEW — list of workouts for the selected day, with tap-to-navigate |
| `home/calendar-navigation` | NEW — prev/next week navigation, today button |

## Approach

### High-Level Design

```
home.tsx (or index.tsx)
├── Greeting + Assigned Today chip (existing)
├── WeekCalendarSection (NEW)
│   ├── WeekStrip (reuse from src/features/calendar/components/)
│   ├── WorkoutDayList (NEW)
│   └── Empty state (when no workouts for selected day)
├── Quick Stats (existing, below calendar)
├── Quick Actions (existing)
└── Recent Activity (existing)
```

The `useWeekCalendar` hook already provides:
- `weekDays` with `hasWorkout` and `hasCompletedWorkout` flags
- `selectedDate` and `selectDate()`
- `goToPrevWeek()`, `goToNextWeek()`, `goToToday()`
- `weekLabel` and `isLoading`

A new `useSessionsForDate` hook will fetch session summaries for the selected date from PocketBase (online) or SQLite (native), mirroring the pattern in `useCalendar.fetchSessionsForDate`.

### Implementation Steps

1. Create `useSessionsForDate` hook — fetches workout summaries for a given date
2. Create `WorkoutDayList` component — renders list of workout cards for a date
3. Create `WeekCalendarSection` component — composes WeekStrip + WorkoutDayList
4. Integrate into `home.tsx` — position as the primary section below greeting
5. Add tests — unit test for new hook, snapshot test for new components
6. Verify `npx tsc --noEmit` and `npx jest --passWithNoTests` pass

## Risks

| Risk | Mitigation |
|------|-----------|
| Performance: fetching sessions per selected date could be slow | Use TanStack Query with caching; prefetch current week on mount |
| Layout shift: adding calendar on top of existing content could feel crowded | Keep calendar section compact; existing stats/actions remain scrollable below |
| Duplication with existing CalendarScreen | CalendarScreen stays as a dedicated calendar tab; this is a lightweight section in Home — both are valid |
| Offline: sessions for date aren't available offline | `useSessionsForDate` falls back to SQLite (same pattern as `useWeekCalendar`) |

## Rollback Plan

Revert the changes in `home.tsx` by removing the `WeekCalendarSection` import and its JSX. All new components are isolated and can be kept for future use or removed without affecting other screens.
