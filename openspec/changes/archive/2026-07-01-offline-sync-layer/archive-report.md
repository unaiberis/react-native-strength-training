# Archive Report: Offline Sync Layer

**Change**: `offline-sync-layer`
**Archived**: 2026-07-01
**Status**: Success — all 4 phases / 3 PRs implemented and verified

---

## Summary

Added a full offline sync layer to the strength training app: local SQLite database, change queue, sync engine, network monitor, offline-aware services for sessions/templates, React Query cache persistence, offline auth handling, and hook branching. The app now works fully offline and syncs automatically when connectivity returns.

Test results: 380 passed, 25 suites. TypeScript: 0 new errors (10 pre-existing in client.test.ts).

## PRs Implemented

| PR | Description | Status |
|----|-------------|--------|
| PR 1 | Foundation — SQLite DB, schema, network monitor, UUID generation, shared types | ✅ Complete |
| PR 2 | Data Layer — ChangeQueue, SyncEngine, IdMapping, OfflineSessionsService, OfflineTemplatesService | ✅ Complete |
| PR 3 | Integration — React Query persister adapter, startup init, auth hardening, store wiring, hook branching, feature flag | ✅ Complete |

## Phases Executed

| Phase | Description | Tasks | Status |
|-------|-------------|-------|--------|
| 1 | Foundation — DB infra, dependencies, network monitor | 1.1–1.9 (9 tasks) | ✅ All complete |
| 2 | Data Layer — change queue, sync engine, ID mapping, offline services | 2.1–2.8 (8 tasks) | ✅ All complete |
| 3 | Integration — persister, startup, auth, store wiring | 3.1–3.6 (6 tasks) | ✅ All complete |
| 4 | Hook wiring & polish | 4.1–4.5 (5 tasks) | ✅ All complete |

## Files Created

### Core DB Infrastructure
- `src/lib/db/database.ts` — SQLite singleton via expo-sqlite, openDatabaseAsync, closeDb
- `src/lib/db/schema.ts` — 8 CREATE TABLE statements + indexes + runMigrations with schema version tracking
- `src/lib/db/init.ts` — initDatabase(): open DB, run migrations, return ready instance
- `src/lib/db/uuid.ts` — generateId() with crypto.randomUUID + uuid v4 polyfill
- `src/lib/db/types.ts` — shared types (QueueEntry, SyncEvent, SyncEventType, QueueAction, QueueStatus)
- `src/lib/db/network-monitor.ts` — NetworkMonitor singleton wrapping NetInfo, 2s debounce
- `src/lib/db/change-queue.ts` — ChangeQueue: enqueue, peek FIFO, dequeue, markDeadLetter, markAllAuthError, resetAuthErrors, getPendingCount
- `src/lib/db/sync-meta.ts` — SyncMeta store: get/set activeSessionId, authExpired, lastSyncedAt, schemaVersion
- `src/lib/db/id-mapping.ts` — IdMapping: store mapping, lookup, updateChildFKs, patchPendingQueue
- `src/lib/db/sync-engine.ts` — SyncEngine: syncAll (push-then-pull), flushQueue (group atomicity), pullCollection, event emitter, exponential backoff
- `src/lib/db/sqlite-storage.ts` — React Query persister adapter backed by react_query_cache table
- `src/lib/db/index.ts` — barrel exports for all public modules

### Offline Services
- `src/lib/db/services/offline-sessions.ts` — OfflineSessionsService: createSession, logSet, completeSession, cancelSession
- `src/lib/db/services/offline-templates.ts` — OfflineTemplatesService: createTemplate, updateTemplate, deleteTemplate
- `src/lib/db/services/README.md` — pattern docs for offline service wrapper pattern

### Tests
- `src/lib/db/__tests__/schema.test.ts`
- `src/lib/db/__tests__/database.test.ts`
- `src/lib/db/__tests__/network-monitor.test.ts`
- `src/lib/db/__tests__/uuid.test.ts`
- `src/lib/db/__tests__/change-queue.test.ts`
- `src/lib/db/__tests__/sync-engine.test.ts`
- `src/lib/db/__tests__/id-mapping.test.ts`
- `src/lib/db/__tests__/offline-sessions.test.ts`
- `src/lib/db/__tests__/offline-templates.test.ts`
- `src/lib/db/__tests__/integration.test.ts`

## Files Modified

- `package.json` — Added @react-native-community/netinfo, @tanstack/query-async-storage-persister, uuid, @tanstack/react-query-persist-client
- `app/_layout.tsx` — Added offline init flow: initDatabase(), persistQueryClient, NetworkMonitor subscription, sync-on-reconnect, offline-aware auth decision tree, EXPO_PUBLIC_OFFLINE_ENABLED feature flag
- `src/lib/pocketbase/services/auth.ts` — Harden getSession(): network errors (no status/status 0) preserve token; 401 errors clear it
- `src/stores/auth-store.ts` — Added isOnline: boolean, syncStatus field, setIsOnline/setSyncStatus actions
- `src/stores/session-store.ts` — startSession/clearSession persist activeSessionId to SyncMeta
- `src/features/workout/hooks/useWorkoutSession.ts` — Branch on isOnline: offline → OfflineSessionsService, online → SessionsService
- `src/features/routines/hooks/useTemplates.ts` — Branch mutation on isOnline: offline → OfflineTemplatesService, online → TemplatesService
- `src/features/history/hooks/useHistory.ts` — Branch reads on isOnline: offline from SQLite, online from PocketBase
- `src/features/exercises/hooks/useExercises.ts` — Persister integration via shouldDehydrateQuery filter

## Specs Synced (Delta → Main)

| Domain | Action | Details |
|--------|--------|---------|
| `offline-sync` | Created | New domain spec — local SQLite schema, Change Queue, SyncEngine, Network Monitor, React Query persister, Auth offline handling; 8 requirements, 9 scenarios |
| `user-auth` | Updated | Register/Session Persistence (SQLite init before auth); ADDED Sync Auth Error Handling requirement (401 detection + auth_expired flag) |
| `workout-execution` | Updated | Start/Log Sets/Complete (offline service layer routing, SQLite dual write); ADDED Session Rehydration requirement |
| `exercise-library` | Updated | Browse/Filter/Detail (local SQLite reads); ADDED Initial Seed requirement |
| `routine-builder` | Updated | Create/Edit (offline service layer, queue when offline); ADDED Offline Indicator requirement |
| `workout-history` | Updated | Session List/Filter/Detail (local SQLite reads); ADDED Unsynced Session Visibility requirement |

## Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Module structure | `src/lib/db/` with `services/` subdir | Keeps DB infra separate from PocketBase; mirrors existing patterns |
| DB init timing | Before auth in startup sequence | Guarantees DB ready before any auth/data operation |
| Sync trigger | Event-driven via NetInfo | No wasted cycles; instant response on reconnect with 2s debounce |
| Queue ordering | FIFO within group_id, groups sequential | Template atoms (session + sets) must replay in correct order |
| Offline service pattern | Decorator — wraps existing service functions | Keeps PB services unchanged; offline logic composed via isOnline check |
| UUID strategy | `crypto.randomUUID()` with `uuid` v4 polyfill | Native in Hermes 0.76+; polyfill only for older runtimes |
| Persister adapter | SQLite-backed implementing AsyncStorage interface | expo-sqlite already in deps; single write path for cache + app data |
| Auth preservation | Two-pronged: startup isOnline check + getSession network-error detection | Prevents token destruction on transient failures while preserving existing contract |
| ID remapping | 4-step after CREATE: store mapping → update local id → update child FKs → patch pending queue | Ensures referential integrity for dependent operations on queue replay |
| Retry policy | Exponential backoff 1s→2s→4s→8s→max 30s, dead-letter after 10 | Balances recovery speed with server load; prevents infinite retry loops |

## Notable Gotchas & Learnings

- `persistQueryClient` moved from `@tanstack/query-async-storage-persister` to `@tanstack/react-query-persist-client` in TanStack Query v5 — the persister adapter must return `{ persistClient, restoreClient, removeClient }`, not direct `.storage` access
- `createAsyncStoragePersister` in v5 returns a `Persister` object (not the same API as v4) — `restoreClient()` must be awaited and its return value passed to `queryClient.setQueryData()` manually
- `session-store.ts` required `jest.mock("expo-sqlite")` in its test file after adding SyncMeta dependency (SyncMeta calls `getDb()` which imports expo-sqlite)
- `OfflineSessionsService` and `SessionsService` have slightly different `LogSetInput`/`CompleteSessionInput` types — explicit type casts needed at branching boundaries in hooks
- `sync_meta` table uses key-value pairs (not the collection-based schema in the original spec) — simpler API for sync_meta operations
- `initDatabase()` swallows errors in production (feature flag disabled) — graceful degradation when SQLite is unavailable

## Rollback Path

Feature flag `EXPO_PUBLIC_OFFLINE_ENABLED` (default `true`). When `false`: skip SQLite init, bypass all offline services, use existing online-only code paths. Environment toggle only — no runtime switch. Emergency toggle via environment config.

## Known Technical Debt

- 10 pre-existing TS1323 errors in `client.test.ts` from dynamic imports (unchanged by this change)
- `OfflineSessionsService` and `SessionsService` type divergence needs upstream alignment for cleaner branching
- No conflict resolution strategy for concurrent edits — server state wins (acceptable for single-device use case)
- Web fallback (localStorage queue) not yet implemented — `expo-sqlite` v15 WebSQL availability needs testing

## Engram Artifact Traceability

| Artifact | Engram ID | Notes |
|----------|-----------|-------|
| Exploration | #1048 | `sdd/offline-sync-layer/explore` |
| Proposal | #1050 | `sdd/offline-sync-layer/proposal` |
| Spec | #1051 | `sdd/offline-sync-layer/spec` |
| Design | #1052 | `sdd/offline-sync-layer/design` — 2 revisions after gate review |
| Tasks | #1054 | `sdd/offline-sync-layer/tasks` — reconciled at archive: all 28 tasks marked complete |
| Apply Progress | #1055 | `sdd/offline-sync-layer/apply-progress` — Phase 3&4 implementation details |
| Archive Report | this document | `sdd/offline-sync-layer/archive-report` |

## OpenSpec Archive Contents

| Artifact | Path |
|----------|------|
| Exploration | `openspec/changes/archive/2026-07-01-offline-sync-layer/exploration.md` |
| Proposal | `openspec/changes/archive/2026-07-01-offline-sync-layer/proposal.md` |
| Delta Specs | `openspec/changes/archive/2026-07-01-offline-sync-layer/specs/` (6 domains) |
| Design | `openspec/changes/archive/2026-07-01-offline-sync-layer/design.md` |
| Tasks | `openspec/changes/archive/2026-07-01-offline-sync-layer/tasks.md` (28/28 tasks complete) |
| Archive Report | `openspec/changes/archive/2026-07-01-offline-sync-layer/archive-report.md` |
