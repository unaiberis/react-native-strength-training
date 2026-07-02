# Offline Service Pattern

## Purpose

Offline service classes provide a **dual-write** pattern for data mutations
when the device is offline. Every mutation is:

1. Written to the local SQLite database (immediate local availability)
2. Enqueued in the `change_queue` table for later sync to PocketBase

This pattern ensures the app functions fully without network connectivity,
and all changes are replayed in FIFO order when connectivity is restored.

## Pattern

Every offline service follows the same architecture:

```
┌─────────────────────────────────────────────────────────┐
│                  Offline{Entity}Service                  │
├─────────────────────────────────────────────────────────┤
│  constructor(db: SQLiteDatabase, queue: ChangeQueue)    │
│                                                         │
│  create*(input) → EntityRow                             │
│    ├── 1. Generate local UUID (generateId)              │
│    ├── 2. INSERT into local SQLite table                │
│    ├── 3. changeQueue.enqueue({ action: 'create', ... })│
│    └── 4. Return the inserted row                       │
│                                                         │
│  update*(id, input) → void                              │
│    ├── 1. UPDATE local SQLite row                       │
│    ├── 2. changeQueue.enqueue({ action: 'update', ... })│
│                                                         │
│  delete*(id) → void                                     │
│    ├── 1. DELETE child rows first (FK constraint)       │
│    ├── 2. DELETE local SQLite row                       │
│    ├── 3. changeQueue.enqueue({ action: 'delete', ... })│
│                                                         │
│  get*() → EntityRow[] / EntityRow | null                │
│    └── SELECT from local SQLite (synchronous mindset)   │
└─────────────────────────────────────────────────────────┘
```

## Dependencies

Each service receives two constructor-injected dependencies:

| Dependency | Type             | Purpose                                     |
| ---------- | ---------------- | ------------------------------------------- |
| `db`       | `SQLiteDatabase` | Direct SQLite access for local reads/writes |
| `queue`    | `ChangeQueue`    | FIFO queue for pending sync changes         |

Dependencies are injected (not imported as singletons) for testability.

## Enqueue Data Shape

The `data` field of each queue entry should contain the full record data
that the SyncEngine needs to replay the mutation against PocketBase.
Use snake_case keys matching PocketBase field names.

```typescript
// CREATE example
changeQueue.enqueue({
  action: 'create',
  collection: 'workout_sessions',
  localId: generatedUuid,
  data: {
    user_id: userId,
    status: 'active',
    started_at: now,
  },
});

// UPDATE example
changeQueue.enqueue({
  action: 'update',
  collection: 'workout_sessions',
  recordId: existingId,
  data: {
    status: 'completed',
    completed_at: now,
  },
});

// DELETE example
changeQueue.enqueue({
  action: 'delete',
  collection: 'workout_templates',
  recordId: existingId,
});
```

## ID Strategy

- **Local records** generate a UUID v4 via `generateId()` from `uuid.ts`
- The same UUID is stored in both `id` and `local_id` columns
- After successful CREATE sync, the SyncEngine swaps `id` to the
  server-assigned ID via the `id_mapping` table
- Child FK references are updated to point to the server ID
- Pending queue entries are patched to replace local UUIDs with
  server IDs

## Adding a New Offline Service

1. Create `services/offline-{entity}.ts`
2. Implement the constructor pattern:
   ```typescript
   constructor(private db: SQLiteDatabase, private queue: ChangeQueue)
   ```
3. For each mutation method:
   - Write to local SQLite first
   - Enqueue corresponding change
4. For read methods, query SQLite directly
5. Export the class and add to barrel

## Available Services

| Service                   | File                   | Tables                                            | Collection Name                     |
| ------------------------- | ---------------------- | ------------------------------------------------- | ----------------------------------- |
| `OfflineSessionsService`  | `offline-sessions.ts`  | `workout_sessions`, `exercise_sets`               | `workout_sessions`, `exercise_sets` |
| `OfflineTemplatesService` | `offline-templates.ts` | `workout_templates`, `workout_template_exercises` | `workout_templates`                 |
