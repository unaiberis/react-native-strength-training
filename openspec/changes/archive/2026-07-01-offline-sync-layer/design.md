# Design: Offline Sync Layer

## Technical Approach

Hybrid: dedicated offline write services route mutations to SQLite + change queue when offline; React Query persister serves reads from local SQLite mirror. SyncEngine orchestrates push-then-pull on connectivity restore with FIFO ordering, group-level atomicity, and exponential backoff.

---

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Module structure | Flattened vs nested by concern | `src/lib/db/` with `services/` subdir | Keeps DB infra separate from PocketBase; `services/` mirrors existing `src/lib/pocketbase/services/` pattern |
| DB init location | Standalone module vs app startup hook | `init.ts` module, called from `_layout.tsx` `AuthGate` before `getSession()` | Guarantees DB ready before any auth or data operation; matches spec "SQLite init MUST complete BEFORE auth actions" |
| Sync trigger | Poll (setInterval) vs event-driven | Event-driven via NetInfo | No wasted cycles; instant response on reconnect with 2s debounce to prevent flapping |
| Queue ordering | FIFO vs priority | FIFO within `group_id`, groups processed sequentially | Template atoms (session + sets) must replay in order; within a group, creation order determines sequence |
| Offline service pattern | Decorator vs subclass vs wrapper | Decorator — `OfflineWriteService` wraps existing service functions | Keeps PB services unchanged; offline logic composed via `isOnline` check + dual write; single responsibility |
| UUID generation | `crypto.randomUUID()` vs `uuid` v4 | `crypto.randomUUID()` with `uuid` v4 polyfill in `uuid.ts` | Native in Hermes 0.76+; polyfill only needed for older runtimes; avoids extra native dependency on iOS/Android |
| Web fallback | Polyfill expo-sqlite vs localStorage | Feature-detect; localStorage queue + in-memory cache on web | expo-sqlite v15 uses op-sqlite (WebSQL) — not universal. When unavailable, degrade gracefully |
| Persister adapter | SQLite-backed vs AsyncStorage | `sqlite-storage.ts` adapter implementing `AsyncStorage` interface | expo-sqlite already in deps; no need for AsyncStorage. Single write path for both cache and app data |

---

## Module Tree

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/db/database.ts` | Create | SQLite singleton — `openDatabaseAsync`, export `db` instance, `closeDb()` |
| `src/lib/db/schema.ts` | Create | `CREATE TABLE IF NOT EXISTS` statements, migration version tracking, `runMigrations(db)` |
| `src/lib/db/init.ts` | Create | `initDatabase()` — opens DB, runs migrations, returns ready instance. Called once at startup |
| `src/lib/db/uuid.ts` | Create | `generateId()` — `crypto.randomUUID()` with `uuid` v4 fallback |
| `src/lib/db/types.ts` | Create | QueueEntry, SyncEvent, SyncMeta, offline service input types |
| `src/lib/db/change-queue.ts` | Create | `ChangeQueue` class — `enqueue()`, `peek()`, `dequeue()`, `markDeadLetter()`, `markAuthError()`, `getPendingCount()` |
| `src/lib/db/network-monitor.ts` | Create | `NetworkMonitor` singleton — wraps NetInfo, emits `online`/`offline` events with 2s debounce |
| `src/lib/db/sync-engine.ts` | Create | `SyncEngine` class — `syncAll()`, `flushQueue()`, `pullCollection(collection)`, event emitter for progress/auth-expired |
| `src/lib/db/sync-meta.ts` | Create | `SyncMeta` store — `getActiveSessionId()`, `setActiveSessionId()`, `getAuthExpired()`, `setAuthExpired()`, `getLastSyncedAt()` |
| `src/lib/db/sqlite-storage.ts` | Create | React Query persister adapter — `getItem`, `setItem`, `removeItem` backed by SQLite `react_query_cache` table |
| `src/lib/db/services/offline-sessions.ts` | Create | Offline session operations — `createSession()`, `logSet()`, `completeSession()`, `cancelSession()` — writes to SQLite + enqueues |
| `src/lib/db/services/offline-templates.ts` | Create | Offline template operations — `createTemplate()`, `updateTemplate()`, `deleteTemplate()` — writes to SQLite + enqueues |
| `src/lib/db/index.ts` | Create | Barrel export for all DB modules |
| `app/_layout.tsx` | Modify | Add `initDatabase()` before `getSession()` in `AuthGate`; wrap `QueryClientProvider` with `persistQueryClient` |
| `src/stores/auth-store.ts` | Modify | Add `isOnline: boolean` field |
| `src/features/workout/hooks/useWorkoutSession.ts` | Modify | Branch on `isOnline`: offline → call `OfflineSessions`, online → call existing `SessionsService` |
| `src/features/exercises/hooks/useExercises.ts` | Modify | Add `staleTime: 5min`, persister reads from SQLite when offline |
| `src/features/routines/hooks/useTemplates.ts` | Modify | Branch mutations on `isOnline`; read from React Query cache with persister |
| `src/features/history/hooks/useHistory.ts` | Modify | Read from SQLite `workout_sessions WHERE status='completed'` when offline |
| `src/stores/session-store.ts` | Modify | `startSession`/`clearSession` also calls `SyncMeta.setActiveSessionId()` |

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  equipment TEXT,
  body_region TEXT,
  default_sets INTEGER NOT NULL DEFAULT 3,
  default_reps INTEGER NOT NULL DEFAULT 10,
  description TEXT,
  synced_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_synced ON exercises(synced_at);

CREATE TABLE IF NOT EXISTS workout_templates (
  id TEXT PRIMARY KEY,
  local_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  dirty INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_templates_dirty ON workout_templates(dirty);

CREATE TABLE IF NOT EXISTS workout_template_exercises (
  id TEXT PRIMARY KEY,
  local_id TEXT UNIQUE,
  template_id TEXT NOT NULL REFERENCES workout_templates(id),
  exercise_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps INTEGER NOT NULL DEFAULT 10,
  rest_seconds INTEGER NOT NULL DEFAULT 90,
  notes TEXT,
  dirty INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_wte_template ON workout_template_exercises(template_id);
CREATE INDEX IF NOT EXISTS idx_wte_dirty ON workout_template_exercises(dirty);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  local_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  template_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('active','completed','cancelled')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_seconds INTEGER,
  notes TEXT,
  dirty INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON workout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_dirty ON workout_sessions(dirty);

CREATE TABLE IF NOT EXISTS exercise_sets (
  id TEXT PRIMARY KEY,
  local_id TEXT UNIQUE,
  session_id TEXT NOT NULL REFERENCES workout_sessions(id),
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg REAL NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  rpe REAL,
  rir INTEGER,
  is_warmup INTEGER NOT NULL DEFAULT 0,
  dirty INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sets_session ON exercise_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_sets_dirty ON exercise_sets(dirty);

CREATE TABLE IF NOT EXISTS change_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL CHECK(action IN ('create','update','delete')),
  collection TEXT NOT NULL,
  local_id TEXT,
  record_id TEXT,
  data TEXT,
  group_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_flight','dead_letter','auth_error')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_queue_status ON change_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_created ON change_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_group ON change_queue(group_id);

CREATE TABLE IF NOT EXISTS id_mapping (
  local_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  collection TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (local_id, collection)
);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Seeded keys: active_session_id, auth_expired, schema_version

CREATE TABLE IF NOT EXISTS react_query_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## ID Remapping After Sync

Server-assigned IDs must replace local UUIDs in both local SQLite rows and pending queue entries after a successful CREATE to maintain referential integrity across dependent operations (e.g., `exercise_sets` referencing a `workout_sessions` by local UUID).

### Mapping Table

The `id_mapping` table (defined in the schema above) records the correspondence:

```
local_id  |  server_id       |  collection
──────────┼──────────────────┼────────────────────
uuid1     |  pb-sess-abc     |  workout_sessions
uuid2     |  pb-set-xyz      |  exercise_sets
```

### SyncEngine Remapping Flow

After a successful CREATE response from PocketBase:

1. **Capture server ID** — Read `id` from the server response body (e.g., `response.id`).
2. **Store mapping** — `INSERT INTO id_mapping (local_id, server_id, collection) VALUES (:local_id, :server_id, :collection)`.
3. **Update local row id** — `UPDATE {collection} SET id = :server_id, dirty = 0, synced_at = datetime('now') WHERE local_id = :local_id` — the primary key is swapped from the local UUID to the server ID so that child FK references resolve correctly on replay.
4. **Update child FK columns** — For the affected collection, update any child tables whose FK column references the old local UUID: `UPDATE exercise_sets SET session_id = :server_id WHERE session_id = :local_id`. This keeps local referential integrity intact while pending entries await their turn in the queue.
5. **Patch pending queue entries** — Scan `change_queue` for pending entries whose `data` JSON contains the old `local_id` as a value (e.g., `{"session_id": "uuid1"}`) and replace it with `server_id`. Perform the replacement on the JSON string using parameterized `json_replace` or equivalent string substitution.
6. **Dequeue** — `DELETE FROM change_queue WHERE id = :entry_id` (the original CREATE entry is now processed).

### Patching Algorithm

The SyncEngine patches pending references after every successful CREATE:

```
after each successful CREATE response:
    server_id = response.id
    local_id  = entry.local_id
    collection = entry.collection

    // 1. Store mapping
    db.run("INSERT OR REPLACE INTO id_mapping ...", [local_id, server_id, collection])

    // 2. Update local row
    db.run("UPDATE #{collection} SET id = ?, dirty = 0, synced_at = datetime('now') WHERE local_id = ?",
           [server_id, local_id])

    // 3. Update child FK columns (known relationships)
    update_child_fk_references(local_id, server_id, collection)

    // 4. Patch pending queue data
    const pending = db.all("SELECT id, data FROM change_queue WHERE status = 'pending'")
    for each pending entry:
        if entry.data contains local_id as a value:
            patched = entry.data.replaceAll(local_id, server_id)
            db.run("UPDATE change_queue SET data = ? WHERE id = ?", [patched, entry.id])
```

### Collection-Specific FK Relationships

| Collection | Child Table(s) | FK Column | Patching Rule |
|------------|---------------|-----------|---------------|
| `workout_sessions` | `exercise_sets` | `session_id` | All `exercise_sets` rows with `session_id = :local_id` get `session_id = :server_id` |
| `workout_templates` | `workout_template_exercises` | `template_id` | All template_exercises rows with `template_id = :local_id` get `template_id = :server_id` |

### Concrete Example

1. Session created offline with `id = uuid1`, `local_id = uuid1`
2. Five sets logged offline, each with `session_id = uuid1` in the `data` JSON
3. On sync: session CREATE → PB returns `{ id: "pb-sess-abc", ... }`
4. `id_mapping` gets `("uuid1", "pb-sess-abc", "workout_sessions")`
5. Local `workout_sessions` row: `id` updated to `pb-sess-abc`, `local_id` stays `uuid1`
6. Local `exercise_sets` rows: `session_id` updated to `pb-sess-abc`
7. Five pending queue entries patched: `{"session_id": "uuid1"}` → `{"session_id": "pb-sess-abc"}`
8. Set CREATE entries replay with correct server session ID — no foreign key violation

---

## Offline Auth Handling

### Problem

The existing `getSession()` in `auth.ts:73` catches **all** errors and calls `pb.authStore.clear()`. Starting offline with a valid stored token:

1. `getSession()` → `authRefresh()` network error → catch block → `pb.authStore.clear()` → token destroyed
2. `setSession(null)` → auth store transitions to `unauthenticated` → user sees login screen instead of the main app

### Solution

Two changes work together:

#### A. Modify the Startup Sequence — Check `isOnline` Before `authRefresh`

In `_layout.tsx`, the init function now checks `NetworkMonitor.isOnline` before deciding how to authenticate:

```
initDatabase()
    │
    ▼
NetworkMonitor.isOnline?
  ├── true  → getSession() as normal (authRefresh)
  │
  └── false → pb.authStore.isValid?
        ├── true  → trust stored token, restore session from local store
        └── false → setSession(null), show login
```

**Modified `_layout.tsx` init (pseudocode)**:

```typescript
async function init() {
  setState("loading");
  await initDatabase();

  const monitor = NetworkMonitor.getInstance();
  const isOnline = monitor.isOnline;

  if (isOnline) {
    const { session } = await getSession();
    setSession(session);
  } else if (pb.authStore.isValid) {
    // Offline with locally valid token — trust it
    setSession({
      user: pb.authStore.record!,
      token: pb.authStore.token,
    });
  } else {
    setSession(null);
  }

  // Sync only if authenticated AND online
  if (isOnline && useAuthStore.getState().state === "authenticated") {
    await syncEngine.syncAll();
  }
}
```

#### B. Harden `getSession()` — Preserve Token on Network Errors

Modify `getSession()` to distinguish network errors (no HTTP status) from real auth errors (401). Network errors trust the stored token; 401 errors clear it:

```typescript
try {
  const authData = await pb.collection("users").authRefresh();
  return {
    session: { user: authData.record, token: authData.token },
    error: null,
  };
} catch (err: any) {
  // Network error (no status or status 0) — preserve token
  if (!err?.status || err.status === 0) {
    return { session: null, error: "Network unavailable" };
  }
  // 401 / auth error — token truly expired
  pb.authStore.clear();
  return { session: null, error: "Session expired" };
}
```

This ensures `getSession()` is safe to call from any context (not just startup) without destroying the stored token on transient network failures.

---

## Sequence Diagrams

### App Startup

```
_layout.tsx           init.ts          database.ts      NetworkMonitor      AuthGate
    │                   │                  │                  │                │
    │ initDatabase()    │                  │                  │                │
    │──────────────────→│                  │                  │                │
    │                   │ openDatabase()   │                  │                │
    │                   │─────────────────→│                  │                │
    │                   │←─── instance ────│                  │                │
    │                   │ runMigrations()  │                  │                │
    │                   │─────────────────→│                  │                │
    │                   │←────── ok ──────│                  │                │
    │←───── ready ──────│                  │                  │                │
    │                                                          │                │
    │ NetworkMonitor.isOnline?                                 │                │
    │────────────────────────────────────────────────────────→│                │
    │←───────── true/false ────────────────────────────────────│                │
    │                                                          │                │
    │ ┌── if online ──────────────────────────────────────────────────────────→│
    │ │ getSession() (PB auth refresh)                                         │
    │ │───────────────────────────────────────────────────────────────────────→│
    │ │←───────────────── session restored ───────────────────────────────────│
    │ │────────────────────────────────────────────────────────────────────────│
    │ └── if offline & token valid ────────────────────────────────────────────│
    │ │  Skip authRefresh, restore from pb.authStore                          │
    │ │───────────────────────────────────────────────────────────────────────→│
    │ └── if offline & no token ───────────────────────────────────────────────│
    │   setSession(null) → unauthenticated                                    │
    │────────────────────────────────────────────────────────────────────────→│
    │                                                          │                │
    │ If authenticated & online: syncAll() (pull collections)                  │
    │────────────────────────────────────────────────────────────────────────→│
    │                                                          │                │
    │ Render children                                                          │
    │────────────────────────────────────────────────────────────────────────→│
```

### Logging a Set Offline

```
UI Hook          useWorkoutSession     OfflineSessions     SQLite         ChangeQueue
  │                    │                    │                 │               │
  │ logSet(input)      │                    │                 │               │
  │───────────────────→│                    │                 │               │
  │                    │ isOnline=false      │                 │               │
  │                    │────────────────────→│                 │               │
  │                    │                    │ INSERT          │               │
  │                    │                    │ exercise_sets   │               │
  │                    │                    │────────────────→│               │
  │                    │                    │←──── ok ───────│               │
  │                    │                    │ enqueue(CREATE) │               │
  │                    │                    │───────────────────────────────→│
  │                    │                    │←────────── ok ───────────────│
  │                    │←── set row ───────│                 │               │
  │ addLoggedSet()     │                    │                 │               │
  │←── UI update ─────│                    │                 │               │
```

### Sync on Reconnect

```
NetworkMonitor       SyncEngine          ChangeQueue       PocketBase        SQLite
     │                   │                   │                 │               │
     │ online event      │                   │                 │               │
     │ (2s debounce)     │                   │                 │               │
     │──────────────────→│                   │                 │               │
     │                   │ syncAll()         │                 │               │
     │                   │──────────────────→│                 │               │
     │                   │                   │                 │               │
     │                   │─── flushQueue ────│                 │               │
     │                   │─── peek() ───────→│                 │               │
     │                   │← entries[0..N] ───│                 │               │
     │                   │                   │                 │               │
     │                   │┌─ for each entry ─┐                │               │
     │                   ││ mutate(entry)    │────────────────→│               │
     │                   ││←── 2xx/response ─│                 │               │
     │                   ││                  │                 │               │
     │                   ││  ┌─ if CREATE ─┐ │                 │               │
     │                   ││  │ id_remap()   │ │                 │               │
     │                   ││  │              │ │                 │               │
     │                   ││  │ 1. store     │ │                 │─────────────→│
     │                   ││  │    mapping   │ │                 │               │
     │                   ││  │ 2. update    │ │                 │─────────────→│
     │                   ││  │    local id  │ │                 │               │
     │                   ││  │ 3. update    │ │                 │─────────────→│
     │                   ││  │    child FKs │ │                 │               │
     │                   ││  │ 4. patch     │ │                 │               │
     │                   ││  │    pending   │ │                 │               │
     │                   ││  │    queue refs│ │                 │               │
     │                   ││  │───────────────────────────────→│               │
     │                   ││  └──────────────┘ │                 │               │
     │                   ││                  │                 │               │
     │                   ││ dequeue(id)      │                 │               │
     │                   ││─────────────────→│                 │               │
     │                   │└──────────────────┘                │               │
     │                   │                   │                 │               │
     │                   │─── pullCollection ─                │               │
     │                   │ fetch exercises   │────────────────→│               │
     │                   │←─── rows ──────────────────────────│               │
     │                   │ upsert exercises  │                 │─────────────→│
     │                   │                   │                 │               │
     │                   │─ SYNC_COMPLETE ──→(emit event)      │               │
```

### Token Expiry During Sync

```
SyncEngine          ChangeQueue         PocketBase         AuthStore        UI
    │                   │                   │                 │              │
    │ peek()            │                   │                 │              │
    │──────────────────→│                   │                 │              │
    │←─ entry ──────────│                   │                 │              │
    │                   │                   │                 │              │
    │ create session    │                   │                 │              │
    │──────────────────────────────────────→│                 │              │
    │←────────────── 401 ──────────────────│                 │              │
    │                   │                   │                 │              │
    │ markAuthError()   │                   │                 │              │
    │──────────────────→│                   │                 │              │
    │                   │ (all pending →    │                 │              │
    │                   │  auth_error)      │                 │              │
    │                   │                   │                 │              │
    │ emit(AUTH_EXPIRED)│                   │                 │              │
    │───────────────────────────────────────────────────────→│              │
    │                   │                   │                 │ setAuthExpired(true)
    │                   │                   │                 │────────────→│
    │                   │                   │                 │              │
    │                   │                   │                 │ "Session expired" banner
```

---

## Interfaces / Contracts

```typescript
// ─── src/lib/db/types.ts ────────────────────────────────────────────────

export type QueueAction = 'create' | 'update' | 'delete';
export type QueueStatus = 'pending' | 'in_flight' | 'dead_letter' | 'auth_error';

export interface QueueEntry {
  id: number;
  action: QueueAction;
  collection: string;
  local_id: string | null;
  record_id: string | null;
  data: Record<string, unknown> | null;
  group_id: string | null;
  status: QueueStatus;
  retry_count: number;
  last_error: string | null;
  created_at: string;
}

export type SyncEventType = 'SYNC_START' | 'SYNC_COMPLETE' | 'SYNC_PARTIAL'
  | 'AUTH_EXPIRED' | 'AUTH_CLEARED' | 'DEAD_LETTER';

export interface SyncEvent {
  type: SyncEventType;
  detail?: { deadLetterCount?: number; collection?: string; error?: string };
}

// ─── src/lib/db/change-queue.ts ─────────────────────────────────────────

export class ChangeQueue {
  constructor(private db: SQLiteDatabase);

  enqueue(params: {
    action: QueueAction;
    collection: string;
    localId?: string;
    recordId?: string;
    data?: Record<string, unknown>;
    groupId?: string;
  }): Promise<void>;

  /** Returns pending entries ordered by created_at ASC, optionally filtered by group_id */
  peek(limit?: number): Promise<QueueEntry[]>;

  /** Remove entry after successful sync */
  dequeue(id: number): Promise<void>;

  /** Mark as dead_letter after max retries */
  markDeadLetter(id: number, error: string): Promise<void>;

  /** Mark all pending/in_flight as auth_error */
  markAllAuthError(): Promise<number>;

  /** Reset auth_error entries back to pending */
  resetAuthErrors(): Promise<number>;

  getPendingCount(): Promise<number>;
}

// ─── src/lib/db/network-monitor.ts ──────────────────────────────────────

export type NetworkListener = (isOnline: boolean) => void;

export class NetworkMonitor {
  private static instance: NetworkMonitor;

  static getInstance(): NetworkMonitor;

  /** Current online status (fast access, no async) */
  get isOnline(): boolean;

  /** Subscribe to connectivity changes. Returns unsubscribe function. */
  subscribe(listener: NetworkListener): () => void;

  /** Cleanup on app unmount */
  destroy(): void;
}

// ─── src/lib/db/sync-engine.ts ──────────────────────────────────────────

export type SyncListener = (event: SyncEvent) => void;

export class SyncEngine {
  constructor(
    private db: SQLiteDatabase,
    private queue: ChangeQueue,
  );

  /** Push-then-pull: flush queue first, then pull dirty collections */
  async syncAll(): Promise<void>;

  /** Replay pending queue entries in FIFO order, grouped by group_id */
  async flushQueue(): Promise<void>;

  /** Fetch fresh data from PocketBase for a collection, upsert to SQLite */
  async pullCollection(collection: string): Promise<void>;

  /** Subscribe to sync events */
  subscribe(listener: SyncListener): () => void;

  /** Cleanup */
  destroy(): void;
}

// ─── src/lib/db/services/offline-sessions.ts ────────────────────────────

export class OfflineSessionsService {
  constructor(
    private db: SQLiteDatabase,
    private queue: ChangeQueue,
  );

  async createSession(userId: string, templateId?: string): Promise<SessionRow>;
  async logSet(sessionId: string, input: LogSetInput): Promise<ExerciseSetRow>;
  async completeSession(sessionId: string, input?: CompleteSessionInput): Promise<void>;
  async cancelSession(sessionId: string): Promise<void>;
}
```

---

## React Query Integration

**Persister adapter** (`sqlite-storage.ts`): implements the `AsyncStorage` interface (`getItem`, `setItem`, `removeItem`) backed by the `react_query_cache` table. This table is a simple key-value store — no schema relation to app data.

**Provider setup** (`_layout.tsx`):
```typescript
import { persistQueryClient } from '@tanstack/query-async-storage-persister';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { sqliteStorage } from '../src/lib/db/sqlite-storage';

// After initDatabase():
const persister = createAsyncStoragePersister({ storage: sqliteStorage });

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24h
  buster: APP_VERSION,
});
```

**Query key strategy**: Persist only read-only keys via `persistOptions.dehydrateOptions.shouldDehydrateQuery`:
```typescript
shouldDehydrateQuery: (query) => {
  const key = query.queryKey[0];
  return ['exercises', 'exercise-categories'].includes(key as string);
  // Exclude: 'templates', 'sessions', 'workout-history' (served from SQLite directly)
}
```

The three read paths:
- **exercises**: persisted RQ cache → SQLite via persister. Offline reads hit the cache.
- **templates**: RQ cache as primary; persister serves offline reads. Mutations route through `OfflineTemplatesService`.
- **history**: reads switch to direct SQLite queries (`workout_sessions WHERE status='completed'`) when offline.

---

## Error Handling

| Layer | Error | Handling |
|-------|-------|----------|
| ChangeQueue enqueue | SQLite write fail | Throw — caller must not proceed (rare, means DB is corrupt) |
| SyncEngine flush | 401 from PB | `markAllAuthError()`, emit `AUTH_EXPIRED`, halt sync |
| SyncEngine flush | 5xx / network timeout | Increment `retry_count`, exponential backoff 1s→2s→4s→8s→max 30s |
| SyncEngine flush | 10th consecutive failure | `markDeadLetter(id, error)`, emit `DEAD_LETTER`, continue next entry |
| SyncEngine flush | Conflict / 409 | Log warning, dequeue (server state wins for now; conflict resolution is OOS) |
| SyncEngine pullCollection | PB unreachable | Log warning, skip pull, continue (data may be stale) |
| NetworkMonitor | NetInfo unavailable | Default to `isOnline=true` — app works as before |
| SyncEngine flush | ID mapping insert/update fails | Log error, mark entry dead_letter — local data would be unrecoverable without mapping |
| SyncEngine flush | Queue data patch finds unexpected JSON shape | Log warning, dequeue with error (server state may have orphaned refs) |
| Startup | Offline with valid token | Trust stored token, skip authRefresh — no network call made |
| OfflineServices | `initDatabase()` not called | Guard with invariant — crash early in dev |
| React Query persister | SQLite read fail | Return `undefined` — React Query fetches from network |

**Dead-letter visibility**: Emit `SYNC_PARTIAL` event with `deadLetterCount`. UI shows a settings badge: "N items failed to sync" with retry-all button.

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| **Unit — schema** | Migration runs, tables exist, indexes created | Open in-memory SQLite via `expo-sqlite` mock, run `runMigrations`, assert tables via `PRAGMA table_info` |
| **Unit — ChangeQueue** | enqueue, peek FIFO, dequeue, markDeadLetter, markAllAuthError | In-memory SQLite; insert 3 entries, assert peek order; dequeue mid; assert remaining |
| **Unit — NetworkMonitor** | Subscriptions fire, debounce works, cleanup | Mock NetInfo; emit connect/disconnect; assert listener called with correct `isOnline` |
| **Unit — SyncEngine flush** | Queue replay in order, group atomicity, 401 handling, retry backoff | Mock ChangeQueue + PocketBase responses; assert call order and dequeue timing |
| **Unit — SyncEngine pull** | Upsert logic, sync_meta update, PB failure | Mock PB response; assert SQLite rows match; assert meta updated |
| **Unit — OfflineSessions** | createSession offline, logSet offline, completeSession offline | Mock ChangeQueue + SQLite; assert both DB insert + queue enqueue occur |
| **Unit — uuid.ts** | crypto.randomUUID success, polyfill fallback | Mock `crypto` undefined; assert polyfill returns valid UUID v4 |
| **Integration — offline write path** | Hook → OfflineService → SQLite → ChangeQueue | Full path test with real in-memory SQLite, mock `isOnline=false` |
| **Unit — SyncEngine ID remap** | CREATE response → mapping insert + local row update + queue patch | Mock PB CREATE response with server ID; assert `id_mapping` row inserted, local `id` updated, queue `data` patched, child FK columns updated |
| **Unit — Offline auth startup** | Offline with valid token → skip refresh → session restored | Mock NetInfo offline + pb.authStore.isValid=true; assert `authRefresh` NOT called, `setSession` called with stored token |
| **Unit — Offline auth startup (no token)** | Offline with no token → unauthenticated | Mock NetInfo offline + pb.authStore.isValid=false; assert `setSession(null)`, state = unauthenticated |
| **Unit — getSession network error** | Network failure preserves token, does not clear authStore | Mock `authRefresh` throws network error (no status); assert `pb.authStore.clear` NOT called, error = "Network unavailable" |
| **Integration — startup sequence** | initDatabase → auth → syncAll on first launch | Full sequence with mocks; verify DB initialized before auth call |
| **Integration — React Query persister** | Cache writes to SQLite, reads restore cache | Write query data via persister, clear cache, read back — assert shape preserved |

Test files go in `src/lib/db/__tests__/` following existing convention (e.g., `src/lib/pocketbase/services/__tests__/`).

---

## Migration

Existing users have data only in PocketBase. No local SQLite data exists.

**First launch after offline update**:
1. App starts → `initDatabase()` creates empty tables
2. User authenticated → `syncAll()` triggers `pullCollection` for exercises, templates, sessions, sets
3. `sync_meta` populated with timestamps and row counts
4. React Query cache hydrates from SQLite via persister
5. Subsequent offline use reads from populated local tables

**Schema versioning**: `sync_meta` stores `schema_version` key. `runMigrations()` checks version and applies incremental migrations. Version 1 = initial schema above. No backward compatibility concerns — local data is a cache, never the source of truth.

**Rollback**: Feature flag `EXPO_PUBLIC_OFFLINE_ENABLED` (default `true`). When `false`: skip SQLite init, bypass all offline services. Environment toggle only — no runtime switch.

---

## Open Questions

- [ ] Confirm Hermes 0.76+ supports `crypto.randomUUID()` natively — if not, `uuid` v4 will be the primary path
- [ ] PocketBase `authRefresh()` behavior when token has physically expired — does it return 401 vs network error? Affects `AUTH_EXPIRED` detection
- [ ] expo-sqlite v15 WebSQL availability on Safari — need to test before shipping web fallback
