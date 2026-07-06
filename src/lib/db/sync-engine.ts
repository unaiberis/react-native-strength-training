/**
 * SyncEngine — orchestrates push-then-pull sync between local SQLite
 * and PocketBase.
 *
 * 1. Pushes pending local changes (FIFO with group atomicity)
 * 2. Pulls fresh data from PocketBase collections
 *
 * Handles auth expiry, dead-letter escalation, exponential backoff,
 * and ID remapping for server-assigned IDs after CREATE operations.
 */

import type { SQLiteDatabase, SQLiteBindValue } from "expo-sqlite";
import type { ChangeQueue } from "./change-queue";
import type { IdMapping } from "./id-mapping";
import type { SyncMeta } from "./sync-meta";
import type { QueueEntry, SyncEventType, SyncEvent } from "./types";

// ─── Public Types ──────────────────────────────────────────────────────

export interface SyncResult {
  synced: number;
  failed: number;
  deadLettered: number;
  authExpired: boolean;
  timestamp: string;
}

// ─── Default Collections to Pull ───────────────────────────────────────

const DEFAULT_PULL_COLLECTIONS = [
  "exercises",
  "workout_templates",
  "workout_template_exercises",
  "workout_sessions",
  "exercise_sets",
];

// ─── Collection-Specific FK Relationships for ID Remapping ─────────────

interface ChildFkRelation {
  table: string;
  fkColumn: string;
}

const CHILD_FK_MAP: Record<string, ChildFkRelation[]> = {
  workout_sessions: [{ table: "exercise_sets", fkColumn: "session_id" }],
  workout_templates: [
    { table: "workout_template_exercises", fkColumn: "template_id" },
  ],
};

// ─── Backoff Constants ─────────────────────────────────────────────────

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

export type SyncListener = (event: SyncEvent) => void;

export class SyncEngine {
  private listeners = new Map<SyncEventType, Set<SyncListener>>();

  constructor(
    private db: SQLiteDatabase,
    private changeQueue: ChangeQueue,
    private idMapping: IdMapping,
    private syncMeta: SyncMeta,
    private pocketbase: { collection: (name: string) => CollectionAPI },
    private networkMonitor: { isOnline: boolean },
  ) {}

  // ─── Event Emitter ─────────────────────────────────────────────────

  /**
   * Register a listener for a sync event type.
   */
  on(eventType: SyncEventType, listener: SyncListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  /**
   * Remove a previously registered listener.
   */
  off(eventType: SyncEventType, listener: SyncListener): void {
    this.listeners.get(eventType)?.delete(listener);
  }

  private emit(event: SyncEvent): void {
    const listeners = this.listeners.get(event.type);
    if (!listeners) return;
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        // Swallow individual listener errors
      }
    }
  }

  // ─── Public API ────────────────────────────────────────────────────

  /**
   * Full sync cycle: push local changes, then pull remote data.
   *
   * Skips if the device is currently offline.
   */
  async syncAll(): Promise<SyncResult> {
    if (!this.networkMonitor.isOnline) {
      return {
        synced: 0,
        failed: 0,
        deadLettered: 0,
        authExpired: false,
        timestamp: new Date().toISOString(),
      };
    }

    this.emit({ type: "SYNC_START" });

    // 1. Push local changes
    const flushResult = await this.flushQueue();

    // 2. Pull remote data (skip if auth expired during flush)
    if (!flushResult.authExpired) {
      for (const collection of DEFAULT_PULL_COLLECTIONS) {
        try {
          await this.pullCollection(collection);
        } catch {
          // Individual collection pull failures are non-fatal
        }
      }
    }

    const lastSyncedAt = new Date().toISOString();
    this.emit({
      type: flushResult.deadLettered > 0 ? "SYNC_PARTIAL" : "SYNC_COMPLETE",
      detail: {
        deadLetterCount: flushResult.deadLettered,
        lastSyncedAt,
      },
    });

    flushResult.timestamp = lastSyncedAt;

    return flushResult;
  }

  /**
   * Replay pending queue entries in FIFO order with group atomicity.
   *
   * Entries sharing a `group_id` are processed sequentially —
   * if any entry in the group fails, the remaining entries are
   * left pending for the next sync cycle.
   */
  async flushQueue(): Promise<SyncResult> {
    const result: SyncResult = {
      synced: 0,
      failed: 0,
      deadLettered: 0,
      authExpired: false,
      timestamp: new Date().toISOString(),
    };

    const entries = await this.changeQueue.peek();

    if (entries.length === 0) {
      return result;
    }

    // Group consecutive entries with the same group_id
    const groups = this.groupEntries(entries);

    for (const group of groups) {
      if (result.authExpired) break;

      let groupFailed = false;

      for (const entry of group) {
        if (result.authExpired) break;
        if (groupFailed) {
          result.failed++;
          continue;
        }

        const outcome = await this.processEntry(entry);

        switch (outcome) {
          case "success":
            result.synced++;
            this.emit({
              type: "PROGRESS",
              detail: {
                processed: result.synced,
                total: entries.length,
              },
            });
            break;
          case "auth_error":
            result.authExpired = true;
            this.emit({ type: "AUTH_EXPIRED" });
            break;
          case "dead_letter":
            groupFailed = true;
            result.deadLettered++;
            this.emit({
              type: "DEAD_LETTER",
              detail: { error: "Exceeded max retries", collection: entry.collection },
            });
            break;
          case "retry":
            groupFailed = true;
            result.failed++;
            break;
        }
      }
    }

    return result;
  }

  /**
   * Fetch all records for a collection from PocketBase and upsert them
   * into the local SQLite table.
   */
  async pullCollection(collection: string): Promise<void> {
    try {
      const records = await this.pocketbase
        .collection(collection)
        .getFullList();

      const timestamp = new Date().toISOString();

      for (const record of records) {
        await this.upsertRecord(collection, record, timestamp);
      }

      await this.syncMeta.setLastSyncedAt(collection, timestamp);
    } catch (err) {
      console.warn(
        `[SyncEngine] Failed to pull collection "${collection}":`,
        err,
      );
    }
  }

  // ─── Backoff ───────────────────────────────────────────────────────

  /**
   * Calculate exponential backoff delay for the given retry count.
   * 1s → 2s → 4s → 8s → max 30s
   */
  /* package */ getBackoffDelay(retryCount: number): number {
    const delay = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
    return Math.min(delay, MAX_BACKOFF_MS);
  }

  // ─── Private Helpers ───────────────────────────────────────────────

  /**
   * Group consecutive queue entries by group_id.
   *
   * Entries without a group_id become single-entry groups.
   */
  private groupEntries(entries: QueueEntry[]): QueueEntry[][] {
    const groups: QueueEntry[][] = [];
    let currentGroup: QueueEntry[] = [];

    for (const entry of entries) {
      if (!entry.group_id) {
        // Individual entry — flush any accumulated group first
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
        }
        groups.push([entry]);
        continue;
      }

      if (
        currentGroup.length > 0 &&
        currentGroup[0].group_id !== entry.group_id
      ) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(entry);
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Process a single queue entry: call PocketBase, handle remapping
   * for CREATE, and dequeue on success.
   *
   * After successful CREATE/UPDATE, compares `updated_at` between the
   * local entry data and the server response. If the server timestamp
   * is newer, emits a CONFLICT event (server-wins — the entry is still
   * dequeued).
   */
  private async processEntry(
    entry: QueueEntry,
  ): Promise<"success" | "auth_error" | "dead_letter" | "retry"> {
    try {
      const pbCollection = this.pocketbase.collection(entry.collection);

      if (entry.action === "create") {
        const response = await pbCollection.create(entry.data ?? {});

        // ID remapping
        if (response?.id && entry.local_id) {
          const serverId = response.id as string;
          const localId = entry.local_id;

          // 1. Store mapping
          await this.idMapping.storeMapping(localId, serverId, entry.collection);

          // 2. Update local row: swap local UUID for server ID
          await this.db.runAsync(
            `UPDATE ${entry.collection} SET id = ?, dirty = 0, synced_at = datetime('now') WHERE local_id = ?`,
            [serverId, localId],
          );

          // 3. Update child FK columns
          const relations = CHILD_FK_MAP[entry.collection] ?? [];
          for (const rel of relations) {
            await this.idMapping.updateChildFKs(
              localId,
              serverId,
              rel.fkColumn,
              rel.table,
            );
          }

          // 4. Patch pending queue entries referencing the old local ID
          await this.idMapping.patchPendingQueue(localId, serverId);
        }

        // Conflict detection for create
        this.emitConflictIfNeeded(entry, response);

        await this.changeQueue.dequeue(entry.id);
        return "success";
      }

      if (entry.action === "update" && entry.record_id) {
        const response = await pbCollection.update(entry.record_id, entry.data ?? {});

        // Conflict detection for update
        this.emitConflictIfNeeded(entry, response);

        await this.changeQueue.dequeue(entry.id);
        return "success";
      }

      if (entry.action === "delete" && entry.record_id) {
        await pbCollection.delete(entry.record_id);
        await this.changeQueue.dequeue(entry.id);
        return "success";
      }

      return "retry";
    } catch (err: any) {
      // Auth error (401) — mark all pending entries and stop
      if (err?.status === 401) {
        await this.changeQueue.markAllAuthError();
        await this.syncMeta.setAuthExpired(true);
        return "auth_error";
      }

      // Exceeded retries — dead letter (ceiling reduced to 3 per design)
      if (entry.retry_count >= 3) {
        const errorMsg = err?.message ?? String(err);
        await this.changeQueue.markDeadLetter(entry.id, errorMsg);
        return "dead_letter";
      }

      // Transient error — increment retry count, leave in queue
      const errorMsg = err?.message ?? String(err);
      await this.changeQueue.incrementRetry(entry.id, errorMsg);
      return "retry";
    }
  }

  /**
   * Compare `updated_at` between the local entry data and the server
   * response. If the server timestamp is strictly newer, emit a CONFLICT
   * event.
   *
   * Safe to call even if either side lacks `updated_at` — does nothing
   * in that case.
   */
  private emitConflictIfNeeded(
    entry: QueueEntry,
    response: Record<string, unknown> | null | undefined,
  ): void {
    if (!response?.updated_at || !entry.data?.updated_at) return;

    try {
      const serverTime = new Date(response.updated_at as string).getTime();
      const localTime = new Date(entry.data.updated_at as string).getTime();

      if (serverTime > localTime) {
        this.emit({
          type: "CONFLICT",
          detail: {
            collection: entry.collection,
            error: "Server version is newer than local version",
          },
        });
      }
    } catch {
      // Date parsing failure — skip conflict detection
    }
  }

  /**
   * Upsert a PocketBase record into the local SQLite table.
   *
   * Builds the INSERT OR REPLACE statement dynamically from the
   * record's keys, matching them to table columns.
   */
  private async upsertRecord(
    collection: string,
    record: Record<string, unknown>,
    timestamp: string,
  ): Promise<void> {
    // Gather known columns from the record
    const columns: string[] = [];
    const values: SQLiteBindValue[] = [];

    for (const [key, value] of Object.entries(record)) {
      // Skip internal PocketBase fields
      if (key === "@collectionId" || key === "@collectionName") continue;

      columns.push(key);
      // Normalise boolean/int types for SQLite
      if (typeof value === "boolean") {
        values.push(value ? 1 : 0);
      } else if (value !== null && value !== undefined) {
        values.push(value as SQLiteBindValue);
      } else {
        values.push(null);
      }
    }

    // Add synced_at timestamp if it's a known column
    if (!columns.includes("synced_at")) {
      columns.push("synced_at");
      values.push(timestamp);
    }

    const placeholders = columns.map(() => "?").join(", ");
    const columnList = columns.join(", ");

    await this.db.runAsync(
      `INSERT OR REPLACE INTO ${collection} (${columnList}) VALUES (${placeholders})`,
      values,
    );
  }
}

// ─── PocketBase Collection API Interface ───────────────────────────────

/**
 * Minimal interface for the PocketBase collection operations used
 * by SyncEngine. This allows injection of the real PB client or a
 * test mock.
 */
export interface CollectionAPI {
  create(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  delete(id: string): Promise<boolean>;
  getFullList(): Promise<Record<string, unknown>[]>;
}
