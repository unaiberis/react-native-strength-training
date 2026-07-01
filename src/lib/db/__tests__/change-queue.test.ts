/**
 * ChangeQueue tests.
 *
 * Verifies queue operations: enqueue, peek FIFO, dequeue, dead-letter
 * marking, auth-error handling, and pending-count tracking.
 */

// Mock expo-sqlite — the module under test uses SQLiteDatabase as a type
jest.mock("expo-sqlite", () => ({}));

import { ChangeQueue } from "../change-queue";
import type { QueueAction } from "../types";

describe("ChangeQueue", () => {
  // ─── Helpers ──────────────────────────────────────────────────────

  function createMockDb() {
    return {
      runAsync: jest.fn<
        Promise<{ lastInsertRowId: number; changes: number }>,
        [string, ...unknown[]]
      >(),
      getAllAsync: jest.fn<Promise<unknown[]>, [string, ...unknown[]]>(),
      getFirstAsync: jest.fn<Promise<unknown>, [string, ...unknown[]]>(),
    };
  }

  function createQueue(
    db: ReturnType<typeof createMockDb> = createMockDb(),
  ): ChangeQueue {
    return new ChangeQueue(db as any);
  }

  function makeRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      action: "create",
      collection: "workout_sessions",
      local_id: "abc-123",
      record_id: null,
      data: JSON.stringify({ name: "test" }),
      group_id: null,
      status: "pending",
      retry_count: 0,
      last_error: null,
      created_at: "2026-07-01T00:00:00.000Z",
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── enqueue ──────────────────────────────────────────────────────

  describe("enqueue", () => {
    it("inserts a queue entry with action, collection, and localId", async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
      const queue = createQueue(db);

      await queue.enqueue({
        action: "create",
        collection: "workout_sessions",
        localId: "abc-123",
        data: { name: "Morning workout" },
      });

      expect(db.runAsync).toHaveBeenCalledTimes(1);
      const [sql, params] = db.runAsync.mock.calls[0];
      expect(sql).toContain("INSERT INTO change_queue");
      // params is an array of bind values
      expect((params as unknown[])[0]).toBe("create");
      expect((params as unknown[])[1]).toBe("workout_sessions");
      expect((params as unknown[])[2]).toBe("abc-123");
    });

    it("accepts optional groupId for group atomicity", async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
      const queue = createQueue(db);

      await queue.enqueue({
        action: "create",
        collection: "exercise_sets",
        localId: "set-001",
        data: { session_id: "abc-123" },
        groupId: "session-group-1",
      });

      const [, params] = db.runAsync.mock.calls[0];
      expect((params as unknown[])[5]).toBe("session-group-1");
    });

    it("serializes data to JSON string", async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
      const queue = createQueue(db);

      await queue.enqueue({
        action: "create",
        collection: "workout_sessions",
        data: { name: "Test", sets: [1, 2, 3] },
      });

      const [, params] = db.runAsync.mock.calls[0];
      const dataParam = (params as unknown[])[4];
      expect(JSON.parse(dataParam as string)).toEqual({
        name: "Test",
        sets: [1, 2, 3],
      });
    });

    it("handles null data gracefully", async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
      const queue = createQueue(db);

      await queue.enqueue({
        action: "delete",
        collection: "workout_sessions",
        recordId: "pb-rec-1",
      });

      expect(db.runAsync).toHaveBeenCalledTimes(1);
    });
  });

  // ─── peek ─────────────────────────────────────────────────────────

  describe("peek", () => {
    it("returns pending entries ordered by created_at ASC", async () => {
      const db = createMockDb();
      db.getAllAsync.mockResolvedValue([
        makeRow({ id: 1, created_at: "2026-07-01T00:00:00Z" }),
        makeRow({ id: 2, created_at: "2026-07-01T00:01:00Z" }),
        makeRow({ id: 3, created_at: "2026-07-01T00:02:00Z" }),
      ]);
      const queue = createQueue(db);

      const entries = await queue.peek();

      expect(entries).toHaveLength(3);
      expect(entries[0].id).toBe(1);
      expect(entries[2].id).toBe(3);
    });

    it("queries only pending entries", async () => {
      const db = createMockDb();
      db.getAllAsync.mockResolvedValue([]);
      const queue = createQueue(db);

      await queue.peek();

      const sql = db.getAllAsync.mock.calls[0][0] as string;
      expect(sql).toContain("pending");
    });

    it("respects limit parameter", async () => {
      const db = createMockDb();
      db.getAllAsync.mockResolvedValue([makeRow()]);
      const queue = createQueue(db);

      await queue.peek(5);

      const [, limitArg] = db.getAllAsync.mock.calls[0];
      expect(limitArg).toBe(5);
    });

    it("parses data from JSON string to object", async () => {
      const db = createMockDb();
      db.getAllAsync.mockResolvedValue([
        makeRow({ id: 1, data: JSON.stringify({ name: "test" }) }),
      ]);
      const queue = createQueue(db);

      const entries = await queue.peek();

      expect(entries[0].data).toEqual({ name: "test" });
    });

    it("handles null data in queue entries", async () => {
      const db = createMockDb();
      db.getAllAsync.mockResolvedValue([makeRow({ id: 1, data: null })]);
      const queue = createQueue(db);

      const entries = await queue.peek();

      expect(entries[0].data).toBeNull();
    });

    it("returns empty array when no pending entries", async () => {
      const db = createMockDb();
      db.getAllAsync.mockResolvedValue([]);
      const queue = createQueue(db);

      const entries = await queue.peek();

      expect(entries).toEqual([]);
    });
  });

  // ─── dequeue ──────────────────────────────────────────────────────

  describe("dequeue", () => {
    it("removes an entry by id", async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
      const queue = createQueue(db);

      await queue.dequeue(42);

      const [sql, params] = db.runAsync.mock.calls[0];
      expect(sql).toContain("DELETE FROM change_queue");
      expect((params as unknown[])[0]).toBe(42);
    });
  });

  // ─── markDeadLetter ───────────────────────────────────────────────

  describe("markDeadLetter", () => {
    it("marks the entry as dead_letter with error message", async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
      const queue = createQueue(db);

      await queue.markDeadLetter(7, "Server returned 500");

      const [sql, params] = db.runAsync.mock.calls[0];
      expect(sql).toContain("UPDATE change_queue");
      expect(sql).toContain("dead_letter");
      expect((params as unknown[])[0]).toBe("Server returned 500");
      expect((params as unknown[])[1]).toBe(7);
    });
  });

  // ─── markAllAuthError ─────────────────────────────────────────────

  describe("markAllAuthError", () => {
    it("marks all pending and in_flight entries as auth_error", async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 3 });
      const queue = createQueue(db);

      const count = await queue.markAllAuthError();

      const [sql] = db.runAsync.mock.calls[0];
      expect(sql).toContain("UPDATE change_queue");
      expect(sql).toContain("auth_error");
      expect(sql).toContain("pending");
      expect(sql).toContain("in_flight");
      expect(count).toBe(3);
    });
  });

  // ─── resetAuthErrors ──────────────────────────────────────────────

  describe("resetAuthErrors", () => {
    it("resets auth_error entries back to pending", async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 2 });
      const queue = createQueue(db);

      const count = await queue.resetAuthErrors();

      const [sql] = db.runAsync.mock.calls[0];
      expect(sql).toContain("UPDATE change_queue");
      expect(sql).toContain("pending");
      expect(sql).toContain("auth_error");
      expect(count).toBe(2);
    });
  });

  // ─── incrementRetry ──────────────────────────────────────────────

  describe("incrementRetry", () => {
    it("increments retry_count and records error", async () => {
      const db = createMockDb();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
      const queue = createQueue(db);

      await queue.incrementRetry(5, "Timeout error");

      const [sql, params] = db.runAsync.mock.calls[0];
      expect(sql).toContain("UPDATE change_queue");
      expect(sql).toContain("retry_count = retry_count + 1");
      expect((params as unknown[])[0]).toBe("Timeout error");
      expect((params as unknown[])[1]).toBe(5);
    });
  });

  // ─── getPendingCount ──────────────────────────────────────────────

  describe("getPendingCount", () => {
    it("returns the number of pending entries", async () => {
      const db = createMockDb();
      db.getFirstAsync.mockResolvedValue({ count: 5 });
      const queue = createQueue(db);

      const count = await queue.getPendingCount();

      expect(count).toBe(5);
    });

    it("returns 0 when no pending entries", async () => {
      const db = createMockDb();
      db.getFirstAsync.mockResolvedValue({ count: 0 });
      const queue = createQueue(db);

      const count = await queue.getPendingCount();

      expect(count).toBe(0);
    });
  });
});
