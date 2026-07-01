# Routine Builder Spec

## Purpose

Create/manage workout templates with ordered exercises, target sets/reps, rest intervals.

## Requirements

### Create

MUST allow creating a routine with exercises and set config. Mutations MUST route through the offline service layer — when online, write to PocketBase + local SQLite; when offline, write to local SQLite + change queue.
(Previously: Template writes go only to PocketBase)

- GIVEN 3 exercises with targets WHEN saved AND online THEN routine created in PocketBase, mirrored to SQLite
- GIVEN 3 exercises with targets WHEN saved AND offline THEN routine created in SQLite with `dirty=1`, template + exercises queued under shared `group_id`
- GIVEN no exercises WHEN saving THEN "add at least one" error shown (unchanged)

### Edit

MUST allow reordering and modifying exercises. Edits MUST queue when offline.
(Previously: Edits written directly to PocketBase)

- GIVEN 4 exercises WHEN #4 moved to #2 and saved AND offline THEN UPDATE entry written to change_queue, local SQLite updated immediately
- GIVEN routine linked to incomplete sessions WHEN deleted AND offline THEN DELETE entry queued, local routine marked dirty, sessions kept

### Offline Indicator

The system SHOULD show an offline indicator on templates that have pending unsynced changes.

- GIVEN template created offline WHEN rendered in list THEN subtle sync-pending icon shown
- GIVEN template synced successfully WHEN list refreshes THEN sync-pending icon removed
