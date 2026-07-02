# Proposal: Offline Sync Layer

## Intent

All app operations currently fail when offline. Users at the gym with no signal cannot start a workout, log a set, browse exercises, or view history. This change adds a local SQLite database + sync engine so the app works fully offline and syncs automatically when connectivity returns.

## Scope

### In Scope

- Offline workout execution (create session, log sets, complete/cancel) with local UUIDs
- Offline exercise library browsing via persisted React Query cache
- Offline template CRUD with deferred sync
- Offline workout history viewing from local SQLite
- Automatic sync on connectivity restore via NetInfo
- Change queue with ordered replay, dependency grouping, and retry backoff
- In-progress session rehydration on app restart

### Out of Scope

- Multi-device sync or conflict resolution UI
- Real-time collaboration
- P2P / mesh networking
- Selective sync per collection (all or nothing)
- Offline PR computation (PRs compute on-read from `exercise_sets` — works automatically once sets are local)

## Capabilities

### New Capabilities

- `offline-sync`: Local database init, change queue, sync engine, network monitoring

### Modified Capabilities

- `workout-execution`: Session + set writes go through offline service layer; ongoing session ID persisted to SQLite
- `exercise-library`: React Query cache persisted to SQLite for offline reads
- `routine-builder`: Template mutations queue when offline, sync when online
- `workout-history`: Session list + detail reads from SQLite with PocketBase fallback
- `user-auth`: Startup sequence inits SQLite before auth refresh; expired-token detection during sync surfaces re-login prompt

## Approach

Hybrid: dedicated offline write services for mutations, persisted React Query cache for reads.

```
Writes: UI → Hook → OfflineWriteService → SQLite + Queue → SyncEngine → PocketBase
 Reads: UI → React Query (persisted via createAsyncStoragePersister) → SQLite mirror
```

## Affected Areas

| Area                            | Impact        | Files                                                                                                  |
| ------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| `src/lib/db/`                   | New (6 files) | `schema.ts`, `init.ts`, `network-monitor.ts`, `change-queue.ts`, `sync-engine.ts`, `sqlite-storage.ts` |
| `src/lib/pocketbase/services/`  | Modified      | `exercises.ts`, `prs.ts`; new `offline-sessions.ts`, `offline-templates.ts`                            |
| `src/features/workout/hooks/`   | Modified      | `useWorkoutSession.ts` — branch on online/offline                                                      |
| `src/features/exercises/hooks/` | Modified      | `useExercises.ts` — add cache persister                                                                |
| `src/features/routines/hooks/`  | Modified      | `useTemplates.ts` — route mutations through offline service                                            |
| `src/stores/auth-store.ts`      | Modified      | Add `isOnline` flag                                                                                    |
| `src/stores/session-store.ts`   | Modified      | Persist `activeSessionId` to SQLite                                                                    |

## Sync Strategy

1. **Trigger**: NetInfo `isConnected` transition `false → true`
2. **Ordering**: Group queue by collection — `workout_sessions` creates first, then `exercise_sets`, then `workout_templates` + `workout_template_exercises`
3. **ID remapping**: On CREATE success, update local record with server-assigned `id`; subsequent queue entries reference server ID
4. **Retry**: Exponential backoff (1s→2s→4s→8s→max 30s). Dead-letter after 10 attempts
5. **Lock**: `BEGIN EXCLUSIVE` transaction to prevent concurrent flush + user write
6. **Progress**: Event emitter for UI (toast/banner while syncing)

## Edge Cases

| Case                          | Handling                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Token expires offline         | Sync fails 401 → entries marked `auth_error`, banner prompts re-login; queue replayed after re-auth                       |
| Concurrent sync + user action | SQLite exclusive lock; sync writes queue, user appends after release                                                      |
| Template atomicity            | `change_queue` entries share `group_id`; sync engine processes all-or-none within same transaction                        |
| In-progress session sync      | Session created first (blocking), then sets sequentially under same `group_id`                                            |
| App killed mid-sync           | Idempotent — entries dequeued only after server acknowledges. Server-side duplicate check on CREATE via unique constraint |
| Web fallback                  | expo-sqlite v15 uses `op-sqlite` (WebSQL). If unavailable → `localStorage`-based queue, read-only exercise cache          |

## Risks

| Risk                                    | Likelihood | Mitigation                                                 |
| --------------------------------------- | ---------- | ---------------------------------------------------------- |
| expo-sqlite web support gaps            | Med        | Feature-detect; fallback to Read-Only + localStorage queue |
| `crypto.randomUUID()` missing in Hermes | Low        | Polyfill via `uuid` v4 package                             |
| Large queue on slow reconnect           | Low        | Flush in batches of 50, emit progress events               |
| PocketBase schema drift                 | Low        | SyncEngine validates response shape before dequeue         |

## Rollback Plan

Feature flag `EXPO_PUBLIC_OFFLINE_ENABLED` (default `true`). When `false`: skip SQLite init, bypass all offline services, use existing online-only code paths. Emergency toggle via environment config.

## Dependencies

| Package                                   | Reason                                               |
| ----------------------------------------- | ---------------------------------------------------- |
| `@react-native-community/netinfo`         | Network state monitoring                             |
| `@tanstack/query-async-storage-persister` | React Query cache persistence to SQLite              |
| `uuid` (v4)                               | Backup polyfill if `crypto.randomUUID()` unavailable |

## Success Criteria

- [ ] User starts, executes, and completes a full workout with NO network — all sets logged locally
- [ ] Exercise library renders from local cache when offline
- [ ] Templates created offline appear in list immediately, auto-sync when online
- [ ] Workout history loads from SQLite when offline
- [ ] SyncEngine replays 50+ queued mutations in correct order on reconnect
- [ ] Token expiry detected offline — user prompted to re-login, queue replayed after
- [ ] App restart rehydrates in-progress session from SQLite
- [ ] Existing Jest suite stays green; new tests for offline services, change queue, sync engine
