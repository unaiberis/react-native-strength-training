/**
 * Change queue for offline mutations.
 *
 * Records every create/update/delete as a FIFO queue entry in the
 * `change_queue` table. The SyncEngine replays these entries when
 * connectivity is restored.
 *
 * All methods receive `db` via constructor injection for testability.
 */

import type { SQLiteDatabase } from "expo-sqlite";
import type { QueueAction, QueueEntry } from "./types";

export interface EnqueueParams {
  action: QueueAction;
  collection: string;
  localId?: string;
  recordId?: string;
  data?: Record<string, unknown>;
  groupId?: string;
}

interface RawQueueRow {
  id: number;
  action: string;
  collection: string;
  local_id: string | null;
  record_id: string | null;
  data: string | null;
  group_id: string | null;
  status: string;
  retry_count: number;
  last_error: string | null;
  created_at: string;
}

function toQueueEntry(row: RawQueueRow): QueueEntry {
  return {
    id: row.id,
    action: row.action as QueueAction,
    collection: row.collection,
    local_id: row.local_id,
    record_id: row.record_id,
    data: row.data ? JSON.parse(row.data) : null,
    group_id: row.group_id,
    status: row.status as QueueEntry["status"],
    retry_count: row.retry_count,
    last_error: row.last_error,
    created_at: row.created_at,
  };
}

export class ChangeQueue {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Insert a new change into the queue.
   */
  async enqueue(params: EnqueueParams): Promise<void> {
    const { action, collection, localId, recordId, data, groupId } = params;
    await this.db.runAsync(
      `INSERT INTO change_queue (action, collection, local_id, record_id, data, group_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        action,
        collection,
        localId ?? null,
        recordId ?? null,
        data ? JSON.stringify(data) : null,
        groupId ?? null,
      ],
    );
  }

  /**
   * Return pending queue entries in FIFO order (created_at ASC).
   *
   * Optionally limits the result set. Each entry's `data` field is
   * deserialised from the stored JSON string.
   */
  async peek(limit?: number): Promise<QueueEntry[]> {
    const hasLimit = limit !== undefined;
    const rows = await this.db.getAllAsync<RawQueueRow>(
      `SELECT * FROM change_queue WHERE status = 'pending' ORDER BY created_at ASC${hasLimit ? ' LIMIT ?' : ''}`,
      ...(hasLimit ? [limit] : ([] as number[])),
    );
    return rows.map(toQueueEntry);
  }

  /**
   * Remove a queue entry after successful sync.
   */
  async dequeue(id: number): Promise<void> {
    await this.db.runAsync("DELETE FROM change_queue WHERE id = ?", [id]);
  }

  /**
   * Mark a queue entry as dead letter after exhausting retries.
   */
  async markDeadLetter(id: number, error: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE change_queue SET status = 'dead_letter', last_error = ?, retry_count = retry_count + 1 WHERE id = ?`,
      [error, id],
    );
  }

  /**
   * Mark ALL pending and in_flight entries as auth_error (token expired).
   *
   * Returns the number of entries affected.
   */
  async markAllAuthError(): Promise<number> {
    const result = await this.db.runAsync(
      `UPDATE change_queue SET status = 'auth_error' WHERE status IN ('pending', 'in_flight')`,
    );
    return result.changes;
  }

  /**
   * Move auth_error entries back to pending (after re-login).
   *
   * Returns the number of entries reset.
   */
  async resetAuthErrors(): Promise<number> {
    const result = await this.db.runAsync(
      `UPDATE change_queue SET status = 'pending' WHERE status = 'auth_error'`,
    );
    return result.changes;
  }

  /**
   * Increment retry count and record the error for a transient failure.
   *
   * The entry status stays unchanged (it remains pending for retry).
   */
  async incrementRetry(id: number, error: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE change_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
      [error, id],
    );
  }

  /**
   * Return the count of currently pending queue entries.
   */
  async getPendingCount(): Promise<number> {
    const row = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM change_queue WHERE status = 'pending'",
    );
    return row?.count ?? 0;
  }
}
