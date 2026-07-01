/**
 * ID mapping between local UUIDs and PocketBase server IDs.
 *
 * After a successful CREATE sync, the SyncEngine records the
 * local-to-server mapping here, then uses it to update child FK
 * references and patch pending queue entries so that dependent
 * operations reference the correct server-assigned IDs.
 */

import type { SQLiteDatabase } from "expo-sqlite";

export class IdMapping {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Record a local-to-server ID mapping.
   *
   * Uses INSERT OR REPLACE so re-syncing the same local entry
   * overwrites the previous mapping.
   */
  async storeMapping(
    localId: string,
    serverId: string,
    collection: string,
  ): Promise<void> {
    await this.db.runAsync(
      "INSERT OR REPLACE INTO id_mapping (local_id, server_id, collection) VALUES (?, ?, ?)",
      [localId, serverId, collection],
    );
  }

  /**
   * Look up the server ID for a given local ID and collection.
   *
   * Returns `null` if no mapping has been recorded yet.
   */
  async lookup(
    localId: string,
    collection: string,
  ): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ server_id: string }>(
      "SELECT server_id FROM id_mapping WHERE local_id = ? AND collection = ?",
      [localId, collection],
    );
    return row?.server_id ?? null;
  }

  /**
   * Update child foreign-key columns from the old local UUID to the
   * new server-assigned ID.
   *
   * For example, after a `workout_sessions` CREATE sync, call this
   * to update `exercise_sets.session_id` from the old local UUID
   * to the server ID.
   *
   * Returns the number of child rows updated.
   */
  async updateChildFKs(
    oldId: string,
    newId: string,
    fkColumn: string,
    table: string,
  ): Promise<number> {
    const result = await this.db.runAsync(
      `UPDATE ${table} SET ${fkColumn} = ? WHERE ${fkColumn} = ?`,
      [newId, oldId],
    );
    return result.changes;
  }

  /**
   * Patch pending queue entries whose JSON data contains the old
   * local UUID as a string value, replacing it with the new server
   * ID.
   *
   * This ensures that dependent CREATE operations (e.g., logging a
   * set against a session) reference the correct server ID when
   * they are replayed from the queue.
   */
  async patchPendingQueue(
    localId: string,
    serverId: string,
  ): Promise<void> {
    const rows = await this.db.getAllAsync<{
      id: number;
      data: string | null;
    }>(
      "SELECT id, data FROM change_queue WHERE status = 'pending'",
    );

    for (const row of rows) {
      if (!row.data) continue;
      if (!row.data.includes(localId)) continue;

      const patched = row.data.replaceAll(localId, serverId);
      await this.db.runAsync(
        "UPDATE change_queue SET data = ? WHERE id = ?",
        [patched, row.id],
      );
    }
  }
}
