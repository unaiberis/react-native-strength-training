# Delta for Workout History

## MODIFIED Requirements

### Requirement: Session List

MUST display completed sessions reverse chronological with pagination. Reads MUST serve from local SQLite with PocketBase fallback — when online, sync engine pulls latest data first, then reads from SQLite.
(Previously: Sessions fetched directly from PocketBase on every list load)

- GIVEN 25 sessions AND online WHEN history opens THEN sync pulls fresh data, then latest 20 shown from SQLite, more on scroll
- GIVEN 25 sessions AND offline WHEN history opens THEN latest 20 shown from `workout_sessions WHERE status='completed'`, more on scroll
- GIVEN no sessions WHEN history opens THEN "no workouts yet" with CTA (unchanged)

### Requirement: Filter

MUST filter by exercise and date range. Filtering MUST operate on local SQLite.

- GIVEN "Deadlift" filter selected AND offline WHEN list reloads THEN only Deadlift sessions shown from local join of `workout_sessions` + `exercise_sets`

### Requirement: Detail

MUST show date, duration, exercises, logged sets, volume per exercise. Detail MUST load from local SQLite.

- GIVEN session tapped AND offline WHEN detail opens THEN all set data and volume displayed from local `exercise_sets`

## ADDED Requirements

### Requirement: Unsynced Session Visibility

The system MUST include locally-created sessions (dirty) in history list even before sync.

- GIVEN session completed offline AND not yet synced WHEN history opens THEN session appears in list with offline indicator
- GIVEN session synced successfully WHEN next history load THEN offline indicator removed
