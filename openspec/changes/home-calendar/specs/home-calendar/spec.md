# Spec: Home / Calendario — Weekly Calendar in the Athlete Home Tab

## ADDED Requirements

### R1 — Week Strip Display
The home tab SHALL display a horizontal week strip showing seven days (Monday–Sunday) using the existing `useWeekCalendar` hook and `WeekStrip` component. Each day cell MUST show:
- Day abbreviation (M, T, W, T, F, S, S)
- Day number (1–31)
- A dot indicator below the day number when the date has a workout: titanium dot for an incomplete workout, sacred (green) dot for a completed workout
- Today's date MUST be visually distinguished (highlighted border/background)
- The selected date MUST be visually distinct (titanium background circle)

### R2 — Week Navigation
The week strip MUST provide navigation controls:
- A "previous week" button (←) to shift the view 7 days backward
- A "next week" button (→) to shift the view 7 days forward
- A week label showing the date range (e.g. "JUL 14 — 20")
- Selecting a day cell SHALL update the selected date and display that day's workouts below

### R3 — Selected Day Workout List
When a date is selected, the section SHALL display a list of workouts assigned to or completed on that date. Each workout item MUST show:
- Workout/template name
- Status indicator (assigned, in progress, or completed)
- Estimated duration or exercise count
- Tapping a workout SHALL navigate to its detail screen

### R4 — Empty State
When the selected date has no assigned or completed workouts, the section SHALL display an empty state with:
- An informative message (e.g. "Rest day — No workout scheduled")
- A call-to-action button to start an unscheduled workout

### R5 — Today Button
The section SHALL provide a "Today" control that resets the week view to the current week and selects today's date. The button MUST be enabled even when the current week is already showing (idempotent select today).

### R6 — Data Freshness
The calendar section SHALL refresh workout indicators when the user performs a pull-to-refresh on the home screen. The section MUST show a loading/skeleton state while data is being fetched.

### R7 — Navigation Targets
Tapping a workout in the day list SHALL navigate as follows:
- **Completed workout** → `/(tabs)/history/[id]` (workout detail)
- **In-progress (active) workout** → `/(workout)/active` with session ID
- **Assigned (not started) workout** → `/(tabs)/train` (to start the assignment)

### R8 — Offline Support
On native platforms, the calendar section MUST read workout session data from the local SQLite database (same pattern as the existing `useWeekCalendar` hook). On web, it MUST fall back to PocketBase API calls.

### R9 — Integration with Existing Home
The calendar section MUST be positioned as the primary content on the home screen, below the greeting and "Assigned Today" chip, but above Quick Stats and Recent Activity. The existing home content SHALL remain scrollable below the calendar.

## Scenarios

### S1 — Happy path: Week loads with workout indicators
**Given** the athlete has 3 completed workouts this week (Mon, Wed, Fri)
**When** the home tab loads
**Then** the week strip SHALL show Mon, Wed, Fri with sacred (completed) dots
**And** Tue, Thu, Sat, Sun SHALL show no dot
**And** today's date SHALL be visually highlighted

### S2 — Select a day with a completed workout
**Given** the week strip is displayed
**When** the athlete taps on Wednesday (which has a completed workout)
**Then** the Wednesday cell SHALL show the selected state (titanium background)
**And** the day detail area SHALL display the completed workout summary with name, status "Completed", exercise count, duration
**And** tapping "View Details" SHALL navigate to `/history/[id]`

### S3 — Select a day with an assigned (not started) workout
**Given** the week strip is displayed
**When** the athlete taps on Friday (which has an assigned workout that hasn't started)
**Then** the day detail area SHALL display the assigned workout
**And** the status SHALL show "Assigned"
**And** tapping the workout SHALL navigate to `/(tabs)/train`

### S4 — Select a day with no workouts (empty state)
**Given** the week strip is displayed
**When** the athlete taps on a day with no assigned or completed workouts
**Then** the day detail area SHALL display: "Rest day — No workout scheduled"
**And** a button "Start a Workout" SHALL be shown
**And** tapping that button SHALL navigate to `/(tabs)/train`

### S5 — Navigate to previous week
**Given** the athlete is viewing the current week
**When** the athlete taps the "‹" (previous week) button
**Then** the week strip SHALL shift to show the previous 7 days
**And** the week label SHALL update to the new date range
**And** the selected date SHALL remain the same day of week (if still in range) or reset to Monday

### S6 — Navigate to next week
**Given** the athlete is viewing the current week
**When** the athlete taps the "›" (next week) button
**Then** the week strip SHALL shift to show the next 7 days
**And** the week label SHALL update
**And** workout data for the new week SHALL be fetched

### S7 — Go to today
**Given** the athlete has navigated to two weeks ago
**When** the athlete taps the "Today" button
**Then** the week strip SHALL reset to the current week
**And** today's date SHALL be selected
**And** the day detail SHALL show today's workouts (if any)

### S8 — Pull-to-refresh updates calendar
**Given** the home screen is displayed with calendar data
**When** the athlete pulls down to refresh
**Then** the calendar section SHALL refetch both week indicators and the selected day's details
**And** the existing stats and activity sections SHALL also refresh

### S9 — Loading state
**Given** the athlete opens the home tab
**When** the calendar data is still loading
**Then** the calendar section SHALL show skeleton placeholders for the week strip and day detail
**And** the existing static UI (greeting) SHALL remain visible

### S10 — Offline access
**Given** the athlete is on a native platform with no network
**When** the home tab loads
**Then** the calendar SHALL read workout data from the local SQLite database
**And** the workout indicators SHALL reflect locally synced data

## Edge Cases

| Edge Case | Expected Behavior |
|-----------|------------------|
| No date selected on initial load | `selectedDate` defaults to today (handled by `useWeekCalendar`) |
| weekStart is today's Monday | "Today" button is still visible; tapping it re-selects today's date without changing week |
| User has zero workouts ever | All days show no dots; empty state for all selected dates |
| Week boundary (cross-month) | Week label shows both months (e.g. "JUN 29 — JUL 5") — already handled by `formatWeekLabel` |
| Rapid nav (tap prev/next quickly) | React Query's `staleTime: 2min` prevents redundant fetches; subsequent taps wait for current fetch |
| Session data in wrong timezone | All date comparisons use local-time YYYY-MM-DD strings (existing pattern) |
| Workout started before midnight, completed after | Session is attributed to the start date's YYYY-MM-DD |
| Deleted template | Workout detail shows template name as null — fallback to "Free Workout" |
