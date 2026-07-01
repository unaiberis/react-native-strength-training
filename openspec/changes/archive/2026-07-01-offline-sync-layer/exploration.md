# Exploration: Offline Sync Layer

## Current State

The app is **fully online** — every data operation goes directly to PocketBase via `src/lib/pocketbase/services/`. There is no local database, no offline queue, and no network-awareness logic.

### Architecture today

```
UI Components
  ↕ React Query hooks (useExercises, useTemplates, useWorkoutSession, etc.)
    ↕ PocketBase service layer (direct pb.collection() calls)
      ↕ PocketBase HTTP client → remote API
```

### Collections on PocketBase

| Collection | Type | Mutation pattern | Read pattern |
|-----------|------|-----------------|-------------|
| `exercises` | Reference data (static) | Admin-only | `getList`, `getOne`, `getFullList` |
| `workout_templates` | User data | User CRUD | `getFullList`, `getOne` |
| `workout_template_exercises` | User data | Created/deleted with template | `getFullList` (by template) |
| `workout_sessions` | User data | Create → log → complete/cancel | `getList`, `getOne` |
| `exercise_sets` | User data | Create only (append-only) | `getFullList` (by session) |

### Key observations

- **exercises** is mostly static reference data seeded by admin — ideal for caching locally with long TTL
- **workout_templates** and **workout_template_exercises** are user-owned and change infrequently — good candidates for offline-first with sync
- **workout_sessions** and **exercise_sets** are created frequently during workouts and are the HIGHEST priority for offline support — users must be able to log sets without connectivity
- All rows use PocketBase UUIDs (`id`), snake_case columns, and have `created` / `updated` timestamps
- The app is **single-device** — no multi-device conflict scenario, so last-write-wins is safe
- Writes happen through `pb.collection().create()` / `.update()` / `.delete()` — no transactions, no batch operations

### Dependencies installed

| Package | Version | Status |
|---------|---------|--------|
| `expo-sqlite` | ~15.1.4 | Installed, unused |
| `@tanstack/react-query` | ^5.56.0 | Active, server state only |
| `zustand` | ^5.0.0 | Active, UI state only |
| `@react-native-community/netinfo` | **not installed** | Missing |

### Auth persistence

- Token stored in `expo-secure-store` (native) / `localStorage` (web) via custom `ExpoSecureStoreAuth` extending PocketBase's `BaseAuthStore`
- On app startup, `getSession()` calls `authRefresh()` to validate the stored token

## Affected Areas

### Service layer — `src/lib/pocketbase/services/`
- `exercises.ts` — all reads → need local fallback
- `sessions.ts` — all reads + writes → highest priority for offline
- `templates.ts` — all reads + writes → need offline support
- `auth.ts` — token storage already local; sync check needed
- `prs.ts` — computed from `exercise_sets` → can be computed locally from SQLite

### Hook layer — `src/features/*/hooks/`
- `useExercises.ts` — React Query → needs offline-aware data source
- `useWorkoutSession.ts` — mutations → needs offline queue
- `useTemplates.ts` — queries + mutations → needs both
- `useAuth.ts` — initialization → needs to init local DB

### Store layer — `src/stores/`
- `auth-store.ts` — may need `isOnline` flag
- `session-store.ts` — workout state is already in-memory; may need persistence hook

### New files needed
- `src/lib/db/` — database initialization, schema, migrations
- `src/lib/db/schema.ts` — table definitions
- `src/lib/db/sync-engine.ts` — sync orchestrator
- `src/lib/db/change-queue.ts` — offline write queue
- `src/lib/db/network-monitor.ts` — NetInfo wrapper
- `src/lib/pocketbase/services/offline-*/` — offline-aware service wrappers

## Approaches

### Approach A: Service Layer Wrapper (Repository Pattern)

Wrap each PocketBase service with an offline-aware counterpart that writes to both SQLite + PocketBase.

**Architecture:**
```
UI → React Query hooks → OfflineServiceWrapper → SQLite + PocketBase
                                        ↕
                              SyncEngine (background sync)
```

**Implementation sketch:**
```typescript
// src/lib/db/services/offline-sessions.ts
export async function logSet(input: LogSetInput): Promise<ExerciseSetRow> {
  const localId = generateId();
  await db.runAsync(
    `INSERT INTO exercise_sets (id, local_id, ...) VALUES (?, ?, ...)`,
    [localId, ...]
  );
  await changeQueue.enqueue({
    action: 'create',
    collection: 'exercise_sets',
    data: input,
    localId,
  });
  // Attempt immediate sync if online
  if (isOnline && !pendingChanges) {
    await syncEngine.flush();
  }
  return { ...input, id: localId };
}
```

**Pros:**
- No changes to existing hooks — swap imports at the service level
- Clean separation of concerns — sync logic is isolated
- Easy to test — services are pure functions
- Works with existing React Query invalidation patterns

**Cons:**
- Need to refactor all service exports to go through wrappers
- PocketBase service functions use `pb` client directly — hard to abstract cleanly
- Two code paths (online vs offline) per service function
- Effort: **High** (5 services × several functions each)

---

### Approach B: React Query Persister + Middleware Layer

Keep PocketBase services as-is for network calls. Add a React Query persister (expo-sqlite adapter) for query cache persistence, plus a mutation queue middleware at the React Query layer.

**Architecture:**
```
UI → React Query (persisted to SQLite) → PocketBase services
                           ↕
                MutationQueue (offline mutations)
                           ↕
                SyncEngine (replay when online)
```

**Implementation sketch:**
```typescript
// React Query persister saves query cache to SQLite
const persister = createAsyncStoragePersister({
  storage: sqliteStorage, // adapter for expo-sqlite
});

// Mutation queue intercepts failed mutations
const offlineMutationMiddleware: Middleware = (queryClient) => (next) => (action) => {
  if (action.type === 'mutation' && !isOnline) {
    // Save to offline queue instead
    return saveToQueue(action);
  }
  return next(action);
};
```

**Pros:**
- Minimal changes to existing code — hooks don't change
- React Query handles cache dedup and invalidation
- Query cache persistence is automatic
- Leverages existing React Query patterns

**Cons:**
- React Query's `persistQueryClient` wasn't designed for offline-first writes — it persists cache, not user mutations
- Complex to handle mutation replay with side effects (invalidation, UI updates)
- Conflict resolution is harder outside the service layer
- No offline-generated IDs (need UUIDs before server responds)
- Effort: **Medium** but riskier for write-heavy flows

---

### Approach C: Hybrid — Repository for Writes + Persisted Query Cache for Reads

Use a dedicated offline service layer for **write operations** (sessions, sets, template mutations) that writes to SQLite + queues sync. Use React Query's `persistQueryClient` to persist **read cache** (exercises, templates list, history) to SQLite for offline browsing.

**Architecture:**
```
Writes: UI → Hook → OfflineWriteService → SQLite + Queue → SyncEngine
 Reads: UI → React Query (persisted cache) → PocketBase services
                                  ↕
                        Cache Hydrator (SQLite ← Query Cache)
```

**Pros:**
- Writes have explicit offline handling with proper ID generation
- Reads benefit from React Query's existing cache/refetch/staleness logic
- Exercises (static data) can be seeded to SQLite on first sync
- Less refactoring than pure repository pattern
- Each concern uses the right tool

**Cons:**
- Two data paths to understand and maintain
- Cache persister for reads + SQLite for writes = dual storage
- Need to keep both in sync during transitions
- Effort: **Medium-High**

---

## Recommendation

**Approach C (Hybrid) is recommended** because:

1. **Writes need real offline behavior** — generating local IDs, queueing mutations, replaying on reconnect. The service layer must handle this explicitly. React Query's mutation queue is not designed for this.

2. **Reads already work well with React Query** — exercises are cached with `staleTime: 5min`, templates with `2min`. Adding a persister gives free offline read capability without changing hook code.

3. **Exercises are static reference data** — they can be fully seeded to SQLite on first sync (via `getFullList`) and refreshed periodically. No conflict risk.

4. **Single-device + last-write-wins** simplifies the write path significantly — no merge logic, no vector clocks, just ordered replay.

5. **Testability** — the offline write services are pure data-access functions that can be tested against a real SQLite database (which expo-sqlite supports via `:memory:` databases).

### Recommended architecture

```
┌──────────────────────────────────────────────────────┐
│                    UI Layers                          │
├──────────────────────────────────────────────────────┤
│   React Query Hooks (useExercises, useTemplates)      │
│   Direct Hook (useWorkoutSession via offline service) │
├──────────────────────────────────────────────────────┤
│  React Query Persister (reads) │ Offline Service (writes) │
│  ┌──────────────────────┐    │ ┌──────────────────────┐ │
│  │ Query Cache ↔ SQLite │    │ │ SQLite Write + Queue  │ │
│  │ (read-only mirror)   │    │ │ SyncEngine replay     │ │
│  └──────────────────────┘    │ └──────────────────────┘ │
├──────────────────────────────┼──────────────────────────┤
│         expo-sqlite v15 (single database)                │
├──────────────────────────────────────────────────────────┤
│  NetInfo (@react-native-community/netinfo)               │
│  Expo SecureStore (existing auth persistence)            │
└──────────────────────────────────────────────────────────┘
```

### Local SQLite schema

```sql
-- Sync metadata per table
CREATE TABLE IF NOT EXISTS sync_meta (
  table_name TEXT PRIMARY KEY,
  last_synced_at TEXT,
  sync_status TEXT DEFAULT 'pending' -- 'synced' | 'partial' | 'pending'
);

-- Change queue
CREATE TABLE IF NOT EXISTS change_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id TEXT NOT NULL, -- UUID generated locally
  collection TEXT NOT NULL, -- e.g. 'exercise_sets'
  action TEXT NOT NULL, -- 'create' | 'update' | 'delete'
  record_id TEXT, -- server ID (null for creates)
  data TEXT NOT NULL, -- JSON payload
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);

-- Mirrors exercises collection (read-only local copy)
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  equipment TEXT,
  body_region TEXT,
  description TEXT,
  default_sets INTEGER DEFAULT 3,
  default_reps INTEGER DEFAULT 10,
  default_rest_seconds INTEGER DEFAULT 90,
  is_public INTEGER DEFAULT 0
);

-- Workout templates (user-owned, sync bidirectionally)
CREATE TABLE IF NOT EXISTS workout_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  program_block_id TEXT,
  is_public INTEGER DEFAULT 0,
  created TEXT,
  updated TEXT,
  dirty INTEGER DEFAULT 0, -- 1 = has unsaved changes
  synced_at TEXT
);

-- Template exercises
CREATE TABLE IF NOT EXISTS workout_template_exercises (
  id TEXT PRIMARY KEY,
  workout_template_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  target_sets INTEGER DEFAULT 3,
  target_reps INTEGER DEFAULT 10,
  target_rpe_low REAL,
  target_rpe_high REAL,
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT,
  dirty INTEGER DEFAULT 0,
  synced_at TEXT,
  FOREIGN KEY (workout_template_id) REFERENCES workout_templates(id)
);

-- Workout sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workout_template_id TEXT,
  program_block_id TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_minutes INTEGER,
  notes TEXT,
  created TEXT,
  updated TEXT,
  dirty INTEGER DEFAULT 0,
  synced_at TEXT
);

-- Exercise sets (the most frequent write — append-only)
CREATE TABLE IF NOT EXISTS exercise_sets (
  id TEXT PRIMARY KEY,
  workout_session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg REAL NOT NULL,
  reps INTEGER NOT NULL,
  rpe REAL,
  rir INTEGER,
  is_warmup INTEGER DEFAULT 0,
  logged_at TEXT NOT NULL,
  created TEXT,
  updated TEXT,
  dirty INTEGER DEFAULT 0,
  synced_at TEXT,
  FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id)
);
```

### Sync flow

```
STARTUP:
  1. Init SQLite database (run migrations, PRAGMA settings)
  2. Load persisted auth token from SecureStore (existing)
  3. Auth refresh (existing — will fail if offline, but token is valid)
  4. Attempt sync: flush change_queue (replay queued mutations)
  5. Refresh exercise cache from PocketBase if stale
  6. Mark as ready (with or without network)

SYNC ON RECONNECT:
  1. NetInfo detects connectivity restored
  2. SyncEngine.flush() called:
     a. Read change_queue ordered by created_at ASC
     b. For each entry:
        - CREATE → pb.collection.create(data) → update local record_id
        - UPDATE → pb.collection.update(record_id, data) → clear dirty
        - DELETE → pb.collection.delete(record_id) → remove local
     c. On success → delete queue entry
     d. On failure → increment retry_count, log error (retry later)
  3. After flush → pull fresh data for changed collections

DURING WORKOUT (offline):
  1. User creates session → insert into SQLite with local UUID
  2. User logs set → insert into SQLite + change_queue
  3. User completes session → update SQLite + change_queue
  4. All operations are LOCAL — no network calls
  5. UI reacts to SQLite changes via React Query invalidation
```

### ID generation strategy

- Use `crypto.randomUUID()` (available in Hermes/Expo) or `uuid` v4 package for local IDs
- On sync: `change_queue` entries for `create` actions get the server-assigned ID back and update the local record
- Sessions reference local IDs until synced; after sync, server IDs are used

## Risks

1. **`@react-native-community/netinfo` is not installed** — needs to be added (and its `@expo` compatible version checked). Expo SDK 52 may bundle a compatible fork.

2. **expo-sqlite v15 web support** — the app supports web (`react-native-web`). expo-sqlite v15 has limited web support (uses `op-sqlite`). Need to verify web fallback or scope web to read-only.

3. **UUID generation in Hermes** — `crypto.randomUUID()` may not be available in all Hermes versions. A polyfill or `uuid` v4 package may be needed.

4. **PocketBase token validity offline** — PocketBase tokens have expiry. If the token expires while offline, all sync writes will fail with 401. Need to detect this and prompt re-login.

5. **Reconciliation for in-progress sessions** — If a user starts a session offline, logs 3 sets, then goes online, the session must first be created on the server, then the sets created. The queue must handle dependency ordering (session create → set creates).

6. **React Query cache mismatch** — If the persisted query cache has stale exercise data but SQLite has fresher data (or vice versa), UI could show inconsistent state. Need a single source of truth for cached data.

7. **Concurrent sync and user action** — User could create a new set while the sync engine is flushing. Need a mutex or queue lock to prevent race conditions.

8. **Sync order for template updates** — A template update replaces all exercises (delete old + create new). The queue must preserve this atomicity or risk orphaned records.

## Ready for Proposal

**Yes.** The exploration is comprehensive enough to proceed to the proposal phase. The key architectural decision (Approach C — Hybrid) is well-supported by the evidence gathered.

### What the proposal should cover

1. **SQLite schema design** (detailed CREATE TABLE statements with indexes)
2. **Module structure** (files to create, their responsibilities)
3. **SyncEngine design** (flush strategy, retry with exponential backoff, dependency ordering)
4. **Service refactoring plan** (which functions become offline-aware, which stay as-is)
5. **React Query persister integration** (using `@tanstack/query-async-storage-persister` + custom SQLite adapter)
6. **Auth offline handling** (token persistence is already solved; need to handle expired-token detection)
7. **Web fallback strategy** (browser LocalStorage + IndexedDB vs SQLite-wasm)
8. **Migration plan** (existing users with remote-only data get full sync on first launch)
9. **Rollback plan** (toggle to disable offline layer)
