# Workout History Spec

## Purpose

View past sessions with pagination, filtering, and detail drill-down.

## Requirements

### Session List

MUST display completed sessions reverse chronological with pagination.

- GIVEN 25 sessions WHEN history opens THEN latest 20 shown, more on scroll
- GIVEN no sessions WHEN history opens THEN "no workouts yet" with CTA

### Filter

MUST filter by exercise and date range.

- GIVEN "Deadlift" filter selected WHEN list reloads THEN only Deadlift sessions shown

### Detail

MUST show date, duration, exercises, logged sets, volume per exercise.

- GIVEN session tapped WHEN detail opens THEN all set data and volume displayed
