# Tasks: Offline Sync Layer

## Review Workload Forecast

| Field                   | Value                                                   |
| ----------------------- | ------------------------------------------------------- |
| Estimated changed lines | 1000-1500                                               |
| 400-line budget risk    | High                                                    |
| Chained PRs recommended | Yes                                                     |
| Suggested split         | PR 1: Foundation → PR 2: Data Layer → PR 3: Integration |
| Delivery strategy       | force-chained                                           |
| Chain strategy          | stacked-to-main                                         |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                                    | Likely PR | Base |
| ---- | ------------------------------------------------------- | --------- | ---- |
| 1    | Core DB infra + deps + network monitor                  | PR 1      | main |
| 2    | Change queue, sync engine, ID mapping, offline services | PR 2      | main |
| 3    | Persister, app init, store wiring, auth hardening       | PR 3      | main |

## Phase 1: Foundation — DB Infra, Dependencies, Network Monitor

- [x] 1.1 Add `@react-native-community/netinfo`, `@tanstack/query-async-storage-persister`, `uuid` to package.json
- [x] 1.2 Create `src/lib/db/types.ts` — all shared types (QueueEntry, SyncEvent, SyncEventType, QueueAction, QueueStatus)
- [x] 1.3 Create `src/lib/db/uuid.ts` — `generateId()` with crypto.randomUUID + uuid v4 polyfill
- [x] 1.4 Create `src/lib/db/database.ts` — SQLite singleton via expo-sqlite, openDatabaseAsync, export db, closeDb
- [x] 1.5 Create `src/lib/db/schema.ts` — 8 CREATE TABLE + indexes + runMigrations(db) with schema version tracking
- [x] 1.6 Create `src/lib/db/init.ts` — `initDatabase()`: open DB, run migrations, return ready instance
- [x] 1.7 Create `src/lib/db/network-monitor.ts` — NetworkMonitor singleton wrapping NetInfo, 2s debounce, subscribe/unsubscribe
- [x] 1.8 Create `src/lib/db/index.ts` — barrel exports for all public modules
- [x] 1.9 Write unit tests for schema.ts, database.ts, network-monitor.ts, uuid.ts

## Phase 2: Data Layer — Change Queue, Sync Engine, ID Mapping, Offline Services

- [x] 2.1 Create `src/lib/db/change-queue.ts` — ChangeQueue: enqueue, peek FIFO, dequeue, markDeadLetter, markAllAuthError, resetAuthErrors, getPendingCount, incrementRetry
- [x] 2.2 Create `src/lib/db/sync-meta.ts` — SyncMeta store: get/set activeSessionId, authExpired, lastSyncedAt, schemaVersion
- [x] 2.3 Create `src/lib/db/id-mapping.ts` — IdMapping: store mapping, lookup, updateChildFKs, patchPendingQueue per design
- [x] 2.4 Create `src/lib/db/sync-engine.ts` — SyncEngine: syncAll (push-then-pull), flushQueue (group atomicity), pullCollection, event emitter, exponential backoff 1s→2s→4s→8s→max 30s
- [x] 2.5 Create `src/lib/db/services/offline-sessions.ts` — OfflineSessionsService: createSession, logSet, completeSession, cancelSession; dual write SQLite + change queue
- [x] 2.6 Create `src/lib/db/services/offline-templates.ts` — OfflineTemplatesService: createTemplate, updateTemplate, deleteTemplate; dual write SQLite + change queue
- [x] 2.7 Create `src/lib/db/services/README.md` — pattern docs for offline service wrapper pattern
- [x] 2.8 Write unit tests for ChangeQueue, SyncEngine, IdMapping, OfflineSessions, OfflineTemplates

## Phase 3: Integration — React Query Persister, Startup, Auth, Store Wiring

- [x] 3.1 Create `src/lib/db/sqlite-storage.ts` — React Query persister adapter (getItem/setItem/removeItem) backed by react_query_cache table
- [x] 3.2 Modify `app/_layout.tsx` — call initDatabase() before auth in AuthGate, wire persistQueryClient with sqlite-storage adapter
- [x] 3.3 Modify `src/lib/pocketbase/services/auth.ts` — harden getSession to preserve token on network errors (no status / status 0)
- [x] 3.4 Modify `src/stores/auth-store.ts` — add `isOnline: boolean`, `syncStatus` field
- [x] 3.5 Modify `src/stores/session-store.ts` — persist activeSessionId to SyncMeta on startSession/clearSession
- [x] 3.6 Write integration tests: startup init → auth → syncAll flow, persister cache roundtrip, auth offline preservation

## Phase 4: Hook Wiring & Polish

- [x] 4.1 Modify `useWorkoutSession.ts` — branch on isOnline: offline → OfflineSessionsService, online → existing SessionsService
- [x] 4.2 Modify `useExercises.ts` — add 5min staleTime, persister reads from SQLite when offline (staleTime already present; persister integrated via shouldDehydrateQuery in _layout.tsx)
- [x] 4.3 Modify `useTemplates.ts` — route mutations through OfflineTemplatesService when offline
- [x] 4.4 Modify `useHistory.ts` — read SQLite workout_sessions WHERE status=completed when offline
- [x] 4.5 Add EXPO_PUBLIC_OFFLINE_ENABLED feature flag guard in startup init
