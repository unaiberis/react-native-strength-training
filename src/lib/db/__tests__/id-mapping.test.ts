/**
 * IdMapping tests.
 *
 * Verifies local-to-server ID mapping: storing mappings, looking up
 * server IDs, updating child foreign-key columns, and patching
 * pending queue JSON data.
 */

jest.mock("expo-sqlite", () => ({}));

import { IdMapping } from "../id-mapping";

describe("IdMapping", () => {
  function createMockDb() {
    return {
      runAsync: jest.fn<
        Promise<{ lastInsertRowId: number; changes: number }>,
        [string, ...unknown[]]
      >(),
      getFirstAsync: jest.fn<Promise<unknown>, [string, ...unknown[]]>(),
      getAllAsync: jest.fn<Promise<unknown[]>, [string, ...unknown[]]>(),
    };
  }

  function createMapping(
    db: ReturnType<typeof createMockDb> = createMockDb(),
  ): IdMapping {
    return new IdMapping(db as any);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── storeMapping ────────────────────────────────────────────────

  describe("storeMapping", () => {
    it("inserts a local-to-server mapping", async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
      const mapping = createMapping(db);

      await mapping.storeMapping("local-1", "server-abc", "workout_sessions");

      expect(db.runAsync).toHaveBeenCalledTimes(1);
      const [sql, params] = db.runAsync.mock.calls[0];
      expect(sql).toContain("INSERT OR REPLACE INTO id_mapping");
      expect((params as unknown[])[0]).toBe("local-1");
      expect((params as unknown[])[1]).toBe("server-abc");
      expect((params as unknown[])[2]).toBe("workout_sessions");
    });

    it("overwrites an existing mapping for the same local_id + collection", async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
      const mapping = createMapping(db);

      await mapping.storeMapping("local-1", "old-server", "workout_sessions");
      await mapping.storeMapping("local-1", "new-server", "workout_sessions");

      expect(db.runAsync).toHaveBeenCalledTimes(2);
      const [, params] = db.runAsync.mock.calls[1];
      expect((params as unknown[])[1]).toBe("new-server");
    });
  });

  // ─── lookup ───────────────────────────────────────────────────────

  describe("lookup", () => {
    it("returns the server_id for an existing mapping", async () => {
      const db = createMockDb();
      db.getFirstAsync.mockResolvedValue({ server_id: "server-abc" });
      const mapping = createMapping(db);

      const serverId = await mapping.lookup("local-1", "workout_sessions");

      expect(serverId).toBe("server-abc");
    });

    it("returns null when no mapping exists", async () => {
      const db = createMockDb();
      db.getFirstAsync.mockResolvedValue(null);
      const mapping = createMapping(db);

      const serverId = await mapping.lookup("unknown", "workout_sessions");

      expect(serverId).toBeNull();
    });
  });

  // ─── updateChildFKs ───────────────────────────────────────────────

  describe("updateChildFKs", () => {
    it("updates child FK columns from old id to new id", async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 3 });
      const mapping = createMapping(db);

      const changes = await mapping.updateChildFKs(
        "local-sess-1",
        "server-sess-1",
        "session_id",
        "exercise_sets",
      );

      const [sql, params] = db.runAsync.mock.calls[0];
      expect(sql).toContain("UPDATE exercise_sets");
      expect(sql).toContain("session_id = ?");
      expect(sql).toContain("WHERE session_id = ?");
      expect((params as unknown[])[0]).toBe("server-sess-1");
      expect((params as unknown[])[1]).toBe("local-sess-1");
      expect(changes).toBe(3);
    });
  });

  // ─── patchPendingQueue ────────────────────────────────────────────

  describe("patchPendingQueue", () => {
    it("replaces local_id with server_id in pending queue data", async () => {
      const db = createMockDb();
      db.getAllAsync.mockResolvedValue([
        { id: 10, data: JSON.stringify({ session_id: "local-sess-1" }) },
        { id: 11, data: JSON.stringify({ session_id: "local-sess-1", note: "test" }) },
      ]);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
      const mapping = createMapping(db);

      await mapping.patchPendingQueue("local-sess-1", "server-sess-1");

      // Should update both entries
      expect(db.runAsync).toHaveBeenCalledTimes(2);
      // First update
      const [sql1, params1] = db.runAsync.mock.calls[0];
      expect(sql1).toContain("UPDATE change_queue");
      expect((params1 as unknown[])[1]).toBe(10);
      // Second update
      const [, params2] = db.runAsync.mock.calls[1];
      expect((params2 as unknown[])[1]).toBe(11);
    });

    it("skips entries whose data does not contain the local_id", async () => {
      const db = createMockDb();
      db.getAllAsync.mockResolvedValue([
        { id: 10, data: JSON.stringify({ session_id: "other-session" }) },
      ]);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
      const mapping = createMapping(db);

      await mapping.patchPendingQueue("local-sess-1", "server-sess-1");

      // No updates — no entries contain the local_id
      expect(db.runAsync).not.toHaveBeenCalled();
    });

    it("handles null data gracefully", async () => {
      const db = createMockDb();
      db.getAllAsync.mockResolvedValue([
        { id: 10, data: null },
        { id: 11, data: JSON.stringify({ unrelated: "data" }) },
      ]);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
      const mapping = createMapping(db);

      await mapping.patchPendingQueue("local-sess-1", "server-sess-1");

      expect(db.runAsync).not.toHaveBeenCalled();
    });

    it("replaces all occurrences within the data string", async () => {
      const db = createMockDb();
      db.getAllAsync.mockResolvedValue([
        {
          id: 10,
          data: JSON.stringify({
            session_id: "local-sess-1",
            related_id: "local-sess-1",
          }),
        },
      ]);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
      const mapping = createMapping(db);

      await mapping.patchPendingQueue("local-sess-1", "server-sess-1");

      const [, params] = db.runAsync.mock.calls[0];
      const patchedData = JSON.parse((params as unknown[])[0] as string);
      expect(patchedData.session_id).toBe("server-sess-1");
      expect(patchedData.related_id).toBe("server-sess-1");
    });
  });
});
