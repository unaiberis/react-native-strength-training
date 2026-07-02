/**
 * SyncMeta key-value store.
 *
 * Persists sync-related metadata in the `sync_meta` table as simple
 * key-value pairs. Provides typed convenience accessors for the
 * active session id, auth expiry flag, and per-collection last-synced
 * timestamps.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export class SyncMeta {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Store a key-value pair. Upserts if the key already exists.
   */
  async set(key: string, value: string): Promise<void> {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  /**
   * Retrieve a value by key. Returns `null` if the key does not exist.
   */
  async get(key: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      'SELECT value FROM sync_meta WHERE key = ?',
      [key]
    );
    return row?.value ?? null;
  }

  /**
   * Remove a key from the store.
   */
  async delete(key: string): Promise<void> {
    await this.db.runAsync('DELETE FROM sync_meta WHERE key = ?', [key]);
  }

  // ─── Active Session ────────────────────────────────────────────────

  /**
   * Store the current active workout session id.
   */
  async setActiveSessionId(sessionId: string): Promise<void> {
    await this.set('active_session_id', sessionId);
  }

  /**
   * Retrieve the current active session id, or `null` if none is set.
   */
  async getActiveSessionId(): Promise<string | null> {
    return this.get('active_session_id');
  }

  /**
   * Clear the active session id.
   */
  async clearActiveSessionId(): Promise<void> {
    await this.delete('active_session_id');
  }

  // ─── Auth Expired ──────────────────────────────────────────────────

  /**
   * Set or clear the auth-expired flag.
   */
  async setAuthExpired(expired: boolean): Promise<void> {
    await this.set('auth_expired', expired ? 'true' : 'false');
  }

  /**
   * Check whether the auth-expired flag is set.
   */
  async getAuthExpired(): Promise<boolean> {
    const value = await this.get('auth_expired');
    return value === 'true';
  }

  // ─── Last Synced At ────────────────────────────────────────────────

  /**
   * Record when a collection was last synced from PocketBase.
   *
   * The key is namespaced as `last_synced_{collection}` to avoid
   * collisions.
   */
  async setLastSyncedAt(collection: string, timestamp: string): Promise<void> {
    await this.set(`last_synced_${collection}`, timestamp);
  }

  /**
   * Retrieve the last-synced timestamp for a collection.
   * Returns `null` if the collection has never been synced.
   */
  async getLastSyncedAt(collection: string): Promise<string | null> {
    return this.get(`last_synced_${collection}`);
  }
}
