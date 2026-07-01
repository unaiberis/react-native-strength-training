# Workout Execution Spec

## Purpose

Start session from routine or blank. Log sets (weight, reps, RPE/RIR). Rest timer between sets.

## Requirements

### Start

MUST allow starting from routine or free. Session writes MUST route through the offline service layer — when online, write to PocketBase + local SQLite; when offline, write to local SQLite + change queue.
(Previously: Session writes go only to PocketBase)

- GIVEN routine WHEN "start" AND online THEN session created in PocketBase, mirrored to SQLite
- GIVEN routine WHEN "start" AND offline THEN session created in local SQLite with `dirty=1`, queued for sync
- GIVEN free workout WHEN offline THEN empty session created locally

### Log Sets

MUST log weight, reps, RPE (1-10), RIR (0-5), and optionally tempo (string `^\d{3,4}$`). Set writes MUST go through the offline service layer.
(Previously: Sets written directly to PocketBase)

- GIVEN Squat active WHEN 100kg x 8, RPE 8 logged AND online THEN set recorded in PocketBase, mirrored to SQLite
- GIVEN Squat active WHEN 100kg x 8, RPE 8 logged AND offline THEN set recorded in SQLite with `dirty=1`, queued for sync
- GIVEN RPE 11 THEN "must be 1-10" error, set not recorded (unchanged)
- GIVEN tempo "2020" WHEN logged THEN stored as-is, no validation beyond regex pattern
- GIVEN tempo "abc" WHEN submitted THEN schema validation error, set not recorded

### Complete

MUST allow finishing or cancelling. On finish, `active_session_id` MUST be cleared from SQLite sync_meta.
(Previously: `active_session_id` stored in Zustand only)

- GIVEN all sets logged WHEN "finish" AND online THEN completed in PocketBase, mirrored to SQLite
- GIVEN all sets logged WHEN "finish" AND offline THEN session marked completed locally, `dirty=1`, queued for sync
- GIVEN partial session WHEN cancel confirmed AND offline THEN marked cancelled locally, `dirty=1`, `active_session_id` cleared
- GIVEN app restart during active session WHEN rehydrated THEN `active_session_id` restored from SQLite, session continues

### Session Rehydration

The system MUST persist `active_session_id` to SQLite `sync_meta` and restore it on app restart.

- GIVEN app killed during active workout WHEN relaunched THEN `active_session_id` loaded from SQLite, workout screen restored
- GIVEN session completed OR cancelled before app kill WHEN relaunched THEN no active session rehydrated
