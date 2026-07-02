/**
 * SyncMeta tests.
 *
 * Verifies the key-value store operations and convenience accessors
 * for active session, auth expiry, and last-synced timestamps.
 */

jest.mock('expo-sqlite', () => ({}));

import { SyncMeta } from '../sync-meta';

describe('SyncMeta', () => {
  function createMockDb() {
    return {
      runAsync: jest.fn<
        Promise<{ lastInsertRowId: number; changes: number }>,
        [string, ...unknown[]]
      >(),
      getFirstAsync: jest.fn<Promise<unknown>, [string, ...unknown[]]>(),
    };
  }

  function createMeta(
    db: ReturnType<typeof createMockDb> = createMockDb()
  ): SyncMeta {
    return new SyncMeta(db as any);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── set / get ─────────────────────────────────────────────────────

  describe('set', () => {
    it('inserts a key-value pair using INSERT OR REPLACE', async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
      const meta = createMeta(db);

      await meta.set('test_key', 'test_value');

      expect(db.runAsync).toHaveBeenCalledTimes(1);
      const [sql, params] = db.runAsync.mock.calls[0];
      expect(sql).toContain('INSERT OR REPLACE INTO sync_meta');
      expect((params as unknown[])[0]).toBe('test_key');
      expect((params as unknown[])[1]).toBe('test_value');
    });

    it('overwrites an existing key', async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
      const meta = createMeta(db);

      await meta.set('test_key', 'new_value');
      await meta.set('test_key', 'updated_value');

      expect(db.runAsync).toHaveBeenCalledTimes(2);
      const [, params] = db.runAsync.mock.calls[1];
      expect((params as unknown[])[1]).toBe('updated_value');
    });
  });

  describe('get', () => {
    it('returns the value for an existing key', async () => {
      const db = createMockDb();
      db.getFirstAsync.mockResolvedValue({ value: 'stored_value' });
      const meta = createMeta(db);

      const value = await meta.get('test_key');

      expect(value).toBe('stored_value');
      expect(db.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT value FROM sync_meta'),
        expect.arrayContaining(['test_key'])
      );
    });

    it('returns null for a missing key', async () => {
      const db = createMockDb();
      db.getFirstAsync.mockResolvedValue(null);
      const meta = createMeta(db);

      const value = await meta.get('nonexistent');

      expect(value).toBeNull();
    });
  });

  // ─── active session ────────────────────────────────────────────────

  describe('getActiveSessionId / setActiveSessionId / clearActiveSessionId', () => {
    it('setActiveSessionId stores the session id', async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
      const meta = createMeta(db);

      await meta.setActiveSessionId('session-42');

      const [, params] = db.runAsync.mock.calls[0];
      expect((params as unknown[])[0]).toBe('active_session_id');
      expect((params as unknown[])[1]).toBe('session-42');
    });

    it('getActiveSessionId retrieves the stored session id', async () => {
      const db = createMockDb();
      db.getFirstAsync.mockResolvedValue({ value: 'session-42' });
      const meta = createMeta(db);

      const id = await meta.getActiveSessionId();

      expect(id).toBe('session-42');
    });

    it('getActiveSessionId returns null when no active session', async () => {
      const db = createMockDb();
      db.getFirstAsync.mockResolvedValue(null);
      const meta = createMeta(db);

      const id = await meta.getActiveSessionId();

      expect(id).toBeNull();
    });

    it('clearActiveSessionId removes the active session key', async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
      const meta = createMeta(db);

      await meta.clearActiveSessionId();

      const [sql, params] = db.runAsync.mock.calls[0];
      expect(sql).toContain('DELETE FROM sync_meta');
      expect((params as unknown[])[0]).toBe('active_session_id');
    });
  });

  // ─── auth expired ──────────────────────────────────────────────────

  describe('getAuthExpired / setAuthExpired', () => {
    it('setAuthExpired stores the auth_expired flag', async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
      const meta = createMeta(db);

      await meta.setAuthExpired(true);

      const [, params] = db.runAsync.mock.calls[0];
      expect((params as unknown[])[0]).toBe('auth_expired');
      expect((params as unknown[])[1]).toBe('true');
    });

    it('setAuthExpired stores false as string', async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
      const meta = createMeta(db);

      await meta.setAuthExpired(false);

      const [, params] = db.runAsync.mock.calls[0];
      expect((params as unknown[])[1]).toBe('false');
    });

    it('getAuthExpired returns true when flag is set', async () => {
      const db = createMockDb();
      db.getFirstAsync.mockResolvedValue({ value: 'true' });
      const meta = createMeta(db);

      const expired = await meta.getAuthExpired();

      expect(expired).toBe(true);
    });

    it('getAuthExpired returns false when flag is not set', async () => {
      const db = createMockDb();
      db.getFirstAsync.mockResolvedValue(null);
      const meta = createMeta(db);

      const expired = await meta.getAuthExpired();

      expect(expired).toBe(false);
    });
  });

  // ─── last synced at ────────────────────────────────────────────────

  describe('getLastSyncedAt / setLastSyncedAt', () => {
    it('setLastSyncedAt stores the timestamp for a collection', async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
      const meta = createMeta(db);

      await meta.setLastSyncedAt('exercises', '2026-07-01T12:00:00Z');

      const [, params] = db.runAsync.mock.calls[0];
      expect((params as unknown[])[0]).toBe('last_synced_exercises');
      expect((params as unknown[])[1]).toBe('2026-07-01T12:00:00Z');
    });

    it('getLastSyncedAt returns the stored timestamp', async () => {
      const db = createMockDb();
      db.getFirstAsync.mockResolvedValue({ value: '2026-07-01T12:00:00Z' });
      const meta = createMeta(db);

      const ts = await meta.getLastSyncedAt('exercises');

      expect(ts).toBe('2026-07-01T12:00:00Z');
    });

    it('getLastSyncedAt returns null for never-synced collection', async () => {
      const db = createMockDb();
      db.getFirstAsync.mockResolvedValue(null);
      const meta = createMeta(db);

      const ts = await meta.getLastSyncedAt('never_synced');

      expect(ts).toBeNull();
    });
  });
});
