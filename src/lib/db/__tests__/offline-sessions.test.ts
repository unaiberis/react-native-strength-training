/**
 * OfflineSessionsService tests.
 *
 * Verifies that session CRUD operations write to SQLite AND enqueue
 * changes for later sync.
 */

vi.mock("expo-sqlite", () => ({}));

import { OfflineSessionsService } from "../services/offline-sessions";
import type { WorkoutSessionRow, ExerciseSetRow } from "../types";

describe("OfflineSessionsService", () => {
  function createMockDb() {
    return {
      runAsync: vi.fn<
        Promise<{ lastInsertRowId: number; changes: number }>,
        [string, ...unknown[]]
      >(),
      getFirstAsync: vi.fn<Promise<unknown>, [string, ...unknown[]]>(),
      getAllAsync: vi.fn<Promise<unknown[]>, [string, ...unknown[]]>(),
    };
  }

  function createMockChangeQueue() {
    return {
      enqueue: vi.fn(),
      peek: vi.fn(),
      dequeue: vi.fn(),
      markDeadLetter: vi.fn(),
      markAllAuthError: vi.fn(),
      resetAuthErrors: vi.fn(),
      incrementRetry: vi.fn(),
      getPendingCount: vi.fn(),
    };
  }

  function createService(
    db: ReturnType<typeof createMockDb> = createMockDb(),
    queue: ReturnType<typeof createMockChangeQueue> = createMockChangeQueue(),
  ) {
    return {
      service: new OfflineSessionsService(db as any, queue as any),
      db,
      queue,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createSession ────────────────────────────────────────────────

  describe("createSession", () => {
    it("inserts a session row into SQLite and enqueues a CREATE change", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      const session = await service.createSession("user-1");

      // Should insert into workout_sessions
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO workout_sessions"),
        expect.arrayContaining([
          expect.any(String), // id
          expect.any(String), // local_id
          "user-1",
          "active",
        ]),
      );

      // Should enqueue a CREATE change
      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "create",
          collection: "workout_sessions",
          localId: expect.any(String),
        }),
      );

      expect(session.user_id).toBe("user-1");
      expect(session.status).toBe("active");
    });

    it("accepts an optional templateId", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      await service.createSession("user-1", "template-abc");

      const [, params] = db.runAsync.mock.calls[0];
      const paramArray = params as unknown[];
      // Find the template_id value in the params
      const templateIdx = [
        "id",
        "local_id",
        "user_id",
        "template_id",
        "status",
        "started_at",
      ].indexOf("template_id");
      expect(paramArray[templateIdx]).toBe("template-abc");
    });
  });

  // ─── logSet ───────────────────────────────────────────────────────

  describe("logSet", () => {
    it("inserts an exercise_set row and enqueues a CREATE change", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      const set = await service.logSet("session-1", {
        exerciseId: "ex-1",
        setNumber: 1,
        weightKg: 50,
        reps: 10,
      });

      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO exercise_sets"),
        expect.arrayContaining([
          expect.any(String), // id
          "session-1",
          "ex-1",
          1,
          50,
          10,
        ]),
      );

      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "create",
          collection: "exercise_sets",
        }),
      );

      expect(set.session_id).toBe("session-1");
      expect(set.exercise_id).toBe("ex-1");
    });

    it("handles optional rpe, rir, and isWarmup fields", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      await service.logSet("session-1", {
        exerciseId: "ex-1",
        setNumber: 2,
        weightKg: 60,
        reps: 8,
        rpe: 8,
        rir: 1,
        isWarmup: true,
      });

      const [, params] = db.runAsync.mock.calls[0];
      const dataArg = (queue.enqueue.mock.calls[0][0] as any).data;
      expect(dataArg.rpe).toBe(8);
      expect(dataArg.rir).toBe(1);
      expect(dataArg.is_warmup).toBe(true);
    });

    it("passes tempo through when provided", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      const set = await service.logSet("session-1", {
        exerciseId: "ex-1",
        setNumber: 3,
        weightKg: 70,
        reps: 8,
        tempo: "2020",
      });

      // Check SQL INSERT includes tempo
      const [sql, params] = db.runAsync.mock.calls[0];
      expect(sql).toContain("tempo");
      expect(sql).toContain("?");

      // Check change queue data has tempo
      const dataArg = (queue.enqueue.mock.calls[0][0] as any).data;
      expect(dataArg.tempo).toBe("2020");

      // Check return row has tempo
      expect(set.tempo).toBe("2020");
    });

    it("passes null tempo when not provided", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      const set = await service.logSet("session-1", {
        exerciseId: "ex-1",
        setNumber: 1,
        weightKg: 50,
        reps: 10,
      });

      const dataArg = (queue.enqueue.mock.calls[0][0] as any).data;
      expect(dataArg.tempo).toBeNull();
      expect(set.tempo).toBeNull();
    });
  });

  // ─── completeSession ──────────────────────────────────────────────

  describe("completeSession", () => {
    it("updates session status to completed and enqueues an UPDATE", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await service.completeSession("session-1");

      const [sql, params] = db.runAsync.mock.calls[0];
      expect(sql).toContain("UPDATE workout_sessions");
      expect(sql).toContain("'completed'");
      expect((params as unknown[])[3]).toBe("session-1");

      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "update",
          collection: "workout_sessions",
          recordId: "session-1",
        }),
      );
    });

    it("accepts optional durationSeconds and notes", async () => {
      const { service, db } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await service.completeSession("session-1", {
        durationSeconds: 3600,
        notes: "Great workout",
      });

      const [, params] = db.runAsync.mock.calls[0];
      // params: [now, 3600, "Great workout", "session-1"]
      expect((params as unknown[])[1]).toBe(3600);
      expect((params as unknown[])[2]).toBe("Great workout");
    });
  });

  // ─── cancelSession ────────────────────────────────────────────────

  describe("cancelSession", () => {
    it("updates session status to cancelled and enqueues an UPDATE", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await service.cancelSession("session-1");

      const [sql, params] = db.runAsync.mock.calls[0];
      expect(sql).toContain("UPDATE workout_sessions");
      expect(sql).toContain("'cancelled'");
      expect((params as unknown[])[0]).toBe("session-1");

      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "update",
          collection: "workout_sessions",
          recordId: "session-1",
        }),
      );
    });
  });

  // ─── getActiveSession ─────────────────────────────────────────────

  describe("getActiveSession", () => {
    it("returns the active session from SQLite", async () => {
      const { service, db } = createService();
      const mockSession: WorkoutSessionRow = {
        id: "session-1",
        local_id: "local-1",
        user_id: "user-1",
        template_id: null,
        status: "active",
        started_at: "2026-07-01T00:00:00Z",
        completed_at: null,
        duration_seconds: null,
        notes: null,
        dirty: 1,
        synced_at: null,
      };
      db.getFirstAsync.mockResolvedValue(mockSession);

      const session = await service.getActiveSession();

      expect(db.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = 'active'"),
      );
      expect(session).toEqual(mockSession);
    });

    it("returns null when no active session exists", async () => {
      const { service, db } = createService();
      db.getFirstAsync.mockResolvedValue(null);

      const session = await service.getActiveSession();

      expect(session).toBeNull();
    });
  });

  // ─── getSessionSets ───────────────────────────────────────────────

  describe("getSessionSets", () => {
    it("returns sets for a given session ordered by set_number", async () => {
      const { service, db } = createService();
      const mockSets: ExerciseSetRow[] = [
        {
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
          dirty: 1,
          synced_at: null,
        },
      ];
      db.getAllAsync.mockResolvedValue(mockSets);

      const sets = await service.getSessionSets("session-1");

      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("WHERE session_id = ?"),
        expect.arrayContaining(["session-1"]),
      );
      expect(sets).toEqual(mockSets);
    });

    it("returns empty array when session has no sets", async () => {
      const { service, db } = createService();
      db.getAllAsync.mockResolvedValue([]);

      const sets = await service.getSessionSets("session-1");

      expect(sets).toEqual([]);
    });
  });
});
