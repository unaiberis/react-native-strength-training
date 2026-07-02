# Offline Sync Specification

## Purpose

Local SQLite database, change queue, and sync engine that allow the app to function fully without network. Mutations queue locally and replay when connectivity returns. Reads serve from local SQLite with PocketBase as upstream source of truth.

## Requirements

### Data Model — Local SQLite Schema

The system MUST maintain local SQLite tables mirroring PocketBase collections with `dirty` flags and `synced_at` timestamps.

| Table                        | Primary Columns                                                                                                                                                                                                                                                                                                                                                                         | Indexes                                                                                        | FK                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `exercises`                  | `id TEXT PK`, `name TEXT`, `category TEXT`, `equipment TEXT`, `body_region TEXT`, `default_sets INT`, `default_reps INT`, `description TEXT`, `synced_at TEXT`                                                                                                                                                                                                                          | `idx_exercises_category ON category`, `idx_exercises_synced ON synced_at`                      | None                                           |
| `workout_templates`          | `id TEXT PK`, `local_id TEXT UNIQUE`, `name TEXT`, `notes TEXT`, `dirty INT DEFAULT 1`, `synced_at TEXT`, `created_at TEXT`, `updated_at TEXT`                                                                                                                                                                                                                                          | `idx_templates_dirty ON dirty`                                                                 | None                                           |
| `workout_template_exercises` | `id TEXT PK`, `local_id TEXT UNIQUE`, `template_id TEXT`, `exercise_id TEXT`, `sort_order INT`, `target_sets INT`, `target_reps INT`, `rest_seconds INT`, `dirty INT DEFAULT 1`, `synced_at TEXT`                                                                                                                                                                                       | `idx_wte_template ON template_id`, `idx_wte_dirty ON dirty`                                    | `template_id REFERENCES workout_templates(id)` |
| `workout_sessions`           | `id TEXT PK`, `local_id TEXT UNIQUE`, `template_id TEXT`, `started_at TEXT`, `completed_at TEXT`, `duration_seconds INT`, `status TEXT CHECK(status IN ('active','completed','cancelled'))`, `dirty INT DEFAULT 1`, `synced_at TEXT`                                                                                                                                                    | `idx_sessions_status ON status`, `idx_sessions_dirty ON dirty`                                 | `template_id REFERENCES workout_templates(id)` |
| `exercise_sets`              | `id TEXT PK`, `local_id TEXT UNIQUE`, `session_id TEXT`, `exercise_id TEXT`, `set_number INT`, `weight_kg REAL`, `reps INT`, `rpe REAL`, `rir INT`, `dirty INT DEFAULT 1`, `synced_at TEXT`                                                                                                                                                                                             | `idx_sets_session ON session_id`, `idx_sets_dirty ON dirty`                                    | `session_id REFERENCES workout_sessions(id)`   |
| `change_queue`               | `id INTEGER PK AUTOINCREMENT`, `action TEXT CHECK(action IN ('create','update','delete'))`, `collection TEXT`, `local_id TEXT`, `record_id TEXT`, `data TEXT` (JSON), `group_id TEXT`, `status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_flight','dead_letter','auth_error'))`, `retry_count INT DEFAULT 0`, `last_error TEXT`, `created_at TEXT DEFAULT CURRENT_TIMESTAMP` | `idx_queue_status ON status`, `idx_queue_created ON created_at`, `idx_queue_group ON group_id` | None                                           |
| `sync_meta`                  | `collection_name TEXT PK`, `last_synced_at TEXT`, `last_server_id TEXT`, `row_count INT`                                                                                                                                                                                                                                                                                                | None                                                                                           | None                                           |

### Change Queue

#### Requirement: Enqueue

The system MUST enqueue mutations with `enqueue(action, collection, data, recordId?, groupId?)`.

- GIVEN a CREATE on `workout_sessions` WHEN offline THEN queue entry written with `local_id`, `record_id=null`, `status='pending'`, and `action='create'`
- GIVEN an UPDATE on `workout_templates` WHEN offline THEN queue entry written with `record_id`, updated `data` JSON
- GIVEN a DELETE on `exercise_sets` WHEN offline THEN queue entry written with `record_id`, `action='delete'`

#### Requirement: Dequeue and Peek

The system MUST dequeue by ID after successful sync and peek in order.

- GIVEN entries A (earlier) and B (later) WHEN `peek()` called THEN A returned first
- GIVEN entry completed and `dequeue(id)` called THEN row removed from `change_queue`
- GIVEN max retries exceeded THEN entry marked `dead_letter`, skipped on subsequent syncs

### SyncEngine

#### Requirement: flushQueue

The system MUST read `change_queue` ordered by `created_at ASC`, group by `group_id`, and replay each mutation to PocketBase.

- GIVEN 10 pending queue entries WHEN `flushQueue()` runs THEN each mutation executed against PocketBase in FIFO order, entries dequeued on 2xx
- GIVEN entry with `group_id='g1'` containing session + 3 sets WHEN any fails THEN none in group dequeued, entire group retried
- GIVEN entry returns 401 WHEN `flushQueue()` runs THEN all entries marked `auth_error`, sync paused, `AUTH_EXPIRED` event emitted

#### Requirement: pullCollection

The system MUST fetch fresh data from PocketBase, upsert into SQLite, and update `sync_meta`.

- GIVEN `pullCollection('exercises')` WHEN PocketBase returns 50 rows THEN SQLite `exercises` table upserted, `sync_meta.exercises.last_synced_at` updated
- GIVEN PocketBase unreachable WHEN `pullCollection()` called THEN no data changed, error logged, sync continues after retry

#### Requirement: syncAll

The system MUST orchestrate push-then-pull: flush queue first, then pull all dirty collections.

- GIVEN pending queue entries AND stale PocketBase data WHEN `syncAll()` runs THEN queue flushed first, then collections pulled in dependency order
- GIVEN `flushQueue` fails with non-auth error WHEN `syncAll()` runs THEN pull skipped, retry with exponential backoff 1s→2s→4s→8s→max 30s
- GIVEN sync completes successfully WHEN `syncAll()` finishes THEN `AUTH_EXPIRED` cleared, `SYNC_COMPLETE` event emitted

#### Requirement: Retry Policy

The system MUST implement exponential backoff and dead-letter after 10 failed attempts.

- GIVEN entry fails on attempt 1 WHEN retried THEN wait 1s before retry
- GIVEN entry fails on attempt 2 WHEN retried THEN wait 2s before retry
- GIVEN entry fails on attempt 10 WHEN retried THEN entry marked `dead_letter`, not retried again

### React Query Persister Integration

#### Requirement: Cache Persistence

The system MUST persist React Query read cache to SQLite via `@tanstack/query-async-storage-persister`.

- GIVEN app goes offline WHEN exercise list is already cached THEN list renders from persisted cache without network
- GIVEN app starts fresh WHEN no persisted cache exists THEN normal online fetch occurs
- GIVEN persisted cache older than 5 min staleTime WHEN app starts THEN cache used immediately, background refetch triggered

#### Requirement: Key Filtering

The system MUST persist only read query keys: `['exercises']`, `['templates']`, `['history']`. MUST NOT persist `['workout-session']` or `['exercise-sets']`.

- GIVEN mutation on `['workout-session']` key WHEN cache persists THEN that key excluded from storage
- GIVEN query key `['exercises']` resolved WHEN cache persists THEN key written to SQLite

### Network Monitor

#### Requirement: Connectivity Detection

The system MUST wrap `@react-native-community/netinfo` and emit `online`, `offline`, and `status_change` events.

- GIVEN device loses WiFi WHEN NetInfo reports disconnected THEN `offline` event emitted, `isOnline` flag set `false`
- GIVEN device reconnects WHEN NetInfo reports connected THEN `online` event emitted after 2s debounce, `syncEngine.syncAll()` triggered

#### Requirement: Sync on Reconnect

The system MUST trigger sync on connectivity restore with 2s debounce to avoid flapping.

- GIVEN connection blips on→off→on within 1s WHEN debounce timer active THEN sync fires once after stable 2s online
- GIVEN connection restored and authenticated WHEN debounce expires THEN `syncEngine.syncAll()` invoked

### Auth Offline

#### Requirement: Offline Startup

The system MUST init SQLite before auth refresh. On network error with existing token, proceed offline.

- GIVEN app starts offline with valid stored token WHEN auth refresh fails with network error THEN user proceeds to main app with offline banner
- GIVEN app starts offline with no stored token WHEN auth refresh skipped THEN login screen shown

#### Requirement: Auth Expired During Sync

The system MUST pause all sync on 401, save `auth_expired` flag, and resume after re-login.

- GIVEN sync in progress WHEN PocketBase returns 401 THEN all pending entries marked `auth_error`, sync halted, `auth_expired=true`
- GIVEN `auth_expired=true` WHEN user re-logs in THEN queued entries replayed from where they stopped, `auth_expired` cleared
- GIVEN `auth_expired=true` WHEN UI renders THEN top banner shown: "Session expired. Please log in again to sync your data."

## Scenarios

### Scenario: Starting a workout offline

- GIVEN device is offline AND no `active_session_id` stored
- WHEN user taps "Start Workout" from routine
- THEN session created in local SQLite with `status='active'`, `dirty=1`, local UUID
- AND `change_queue` entry written with `action='create'`, `collection='workout_sessions'`
- AND exercises with targets rendered from local cache
- AND `active_session_id` persisted to SQLite `sync_meta`

### Scenario: Logging sets offline

- GIVEN active workout session exists in local SQLite
- WHEN user logs set (100kg x 8, RPE 8)
- THEN `exercise_sets` row created with `dirty=1`, local UUID
- AND `change_queue` entry written with `action='create'`, `collection='exercise_sets'`, `group_id` matching parent session
- AND set appears immediately in UI

### Scenario: Completing a session offline

- GIVEN active session with 12 logged sets locally
- WHEN user taps "Finish"
- THEN session `status` set to `completed`, `duration_seconds` computed, `completed_at` timestamped
- AND `change_queue` UPDATE entry written for session
- AND `active_session_id` cleared
- AND session appears in local workout history immediately

### Scenario: Creating a template offline

- GIVEN device is offline AND no pending template create
- WHEN user creates template with 4 exercises
- THEN `workout_templates` row created with `dirty=1`, local UUID
- AND 4 `workout_template_exercises` rows created with same `group_id`, `dirty=1`
- AND template appears in list immediately with offline indicator

### Scenario: Browsing exercises offline

- GIVEN device is offline AND exercises previously synced to SQLite
- WHEN user opens exercise library
- THEN exercise list renders from `exercises` table
- AND pagination and category filter operate on local data
- AND no network request attempted

### Scenario: Viewing history offline

- GIVEN device is offline AND sessions previously synced to SQLite
- WHEN user opens workout history
- THEN completed sessions loaded from `workout_sessions` WHERE `status='completed'`
- AND exercise sets loaded from `exercise_sets`
- AND detail drill-down shows all set data

### Scenario: Online → offline → online transition during workout

- GIVEN active session with 6 logged sets (3 synced, 3 dirty)
- WHEN device goes offline AND user logs 3 more sets
- THEN new sets queued with `dirty=1`, no network errors
- WHEN device reconnects AND 2s debounce expires
- THEN `syncEngine.flushQueue()` replays all dirty entries: session UPDATE first, then 3 new sets
- AND server IDs mapped back to local records
- THEN `pullCollection()` refreshes local data

### Scenario: Sync fails due to expired token

- GIVEN 5 pending queue entries AND auth token expired while offline
- WHEN `syncEngine.flushQueue()` attempts first mutation
- THEN PocketBase returns 401
- AND all pending entries marked `auth_error`
- AND `AUTH_EXPIRED` event emitted
- AND UI shows "Session expired" banner
- AND no further sync attempts until re-login

### Scenario: Sync fails due to server error (retry)

- GIVEN 3 pending queue entries AND PocketBase returns 503
- WHEN `syncEngine.flushQueue()` runs
- THEN entry retry_count incremented, 1s backoff started
- AND retry after backoff
- AND after 10 failures entry marked `dead_letter`, remaining queue continues
- AND `SYNC_PARTIAL` event emitted with dead-letter count

### Scenario: First launch with existing PocketBase data (initial sync)

- GIVEN fresh install with no SQLite tables AND user signed in
- WHEN app starts for first time
- THEN SQLite schema created
- AND `syncAll()` triggers `pullCollection` for `exercises`, `workout_templates`, `workout_history`
- AND `sync_meta` populated with timestamps
- AND React Query cache hydrated from SQLite
