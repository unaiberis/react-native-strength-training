/**
 * OfflineHistoryService tests.
 *
 * Verifies session detail reads and session deletion from local SQLite.
 */

jest.mock("expo-sqlite", () => ({}));

import { OfflineHistoryService } from "../services/offline-history";
import type { WorkoutSessionRow, ExerciseSetRow } from "../types";

describe("OfflineHistoryService", () => {
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

  function createMockChangeQueue() {
    return {
      enqueue: jest.fn(),
      peek: jest.fn(),
      dequeue: jest.fn(),
      markDeadLetter: jest.fn(),
      markAllAuthError: jest.fn(),
      resetAuthErrors: jest.fn(),
      incrementRetry: jest.fn(),
      getPendingCount: jest.fn(),
      retry: jest.fn(),
      discard: jest.fn(),
      getDeadLetterEntries: jest.fn(),
    };
  }

  function createService(
    db: ReturnType<typeof createMockDb> = createMockDb(),
    queue: ReturnType<typeof createMockChangeQueue> = createMockChangeQueue(),
  ) {
    return {
      service: new OfflineHistoryService(db as any, queue as any),
      db,
      queue,
    };
  }

  function makeSession(overrides: Partial<WorkoutSessionRow> = {}): WorkoutSessionRow {
    return {
      id: "session-1",
      local_id: null,
      user_id: "user-1",
      template_id: null,
      status: "completed",
      started_at: "2026-07-01T00:00:00Z",
      completed_at: "2026-07-01T01:00:00Z",
      duration_seconds: 3600,
      notes: "Great session",
      dirty: 0,
      synced_at: "2026-07-01T02:00:00Z",
      ...overrides,
    };
  }

  function makeSet(overrides: Partial<ExerciseSetRow> = {}): ExerciseSetRow {
    return {
      id: "set-1",
      local_id: null,
      session_id: "session-1",
      exercise_id: "ex-1",
      set_number: 1,
      weight_kg: 50,
      reps: 10,
      rpe: null,
      rir: null,
      is_warmup: 0,
      dirty: 0,
      synced_at: "2026-07-01T02:00:00Z",
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── getCompletedSessions ────────────────────────────────────────

  describe("getCompletedSessions", () => {
    it("returns completed sessions ordered by started_at DESC", async () => {
      const { service, db } = createService();
      const mockSessions: WorkoutSessionRow[] = [
        makeSession({ id: "s1", started_at: "2026-07-02T00:00:00Z" }),
        makeSession({ id: "s2", started_at: "2026-07-01T00:00:00Z" }),
      ];
      db.getAllAsync.mockResolvedValue(mockSessions);

      const result = await service.getCompletedSessions();

      const [sql] = db.getAllAsync.mock.calls[0] as [string];
      expect(sql).toContain("completed");
      expect(sql).toContain("ORDER BY started_at DESC");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("s1");
    });

    it("returns empty array when no completed sessions", async () => {
      const { service, db } = createService();
      db.getAllAsync.mockResolvedValue([]);

      const result = await service.getCompletedSessions();

      expect(result).toEqual([]);
    });
  });

  // ─── getSessionDetail ─────────────────────────────────────────────

  describe("getSessionDetail", () => {
    it("returns a session with all its sets", async () => {
      const { service, db } = createService();
      const mockSession = makeSession();
      const mockSets: ExerciseSetRow[] = [
        makeSet({ set_number: 1, weight_kg: 50 }),
        makeSet({ set_number: 2, weight_kg: 60 }),
      ];

      db.getFirstAsync.mockResolvedValue(mockSession);
      db.getAllAsync.mockResolvedValue(mockSets);

      const result = await service.getSessionDetail("session-1");

      expect(db.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = ?"),
        expect.arrayContaining(["session-1"]),
      );
      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("WHERE session_id = ?"),
        expect.arrayContaining(["session-1"]),
      );
      expect(result).toEqual({ session: mockSession, sets: mockSets });
    });

    it("returns null when session not found", async () => {
      const { service, db } = createService();
      db.getFirstAsync.mockResolvedValue(null);

      const result = await service.getSessionDetail("nonexistent");

      expect(result).toBeNull();
    });
  });

  // ─── deleteSession ────────────────────────────────────────────────

  describe("deleteSession", () => {
    it("deletes session and sets locally and enqueues a DELETE change", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await service.deleteSession("session-1");

      // Should delete sets first (FK constraint)
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM exercise_sets"),
        expect.arrayContaining(["session-1"]),
      );

      // Then delete the session
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM workout_sessions"),
        expect.arrayContaining(["session-1"]),
      );

      // Should enqueue a DELETE change
      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delete",
          collection: "workout_sessions",
          recordId: "session-1",
        }),
      );
    });
  });
});
