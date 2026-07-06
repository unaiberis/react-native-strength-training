/**
 * SyncEngine tests.
 *
 * Verifies queue flushing with group atomicity, ID remapping on CREATE,
 * auth error handling, exponential backoff, dead-letter escalation,
 * collection pulling, and event emission.
 */

jest.mock("expo-sqlite", () => ({}));

import { SyncEngine } from "../sync-engine";
import type { QueueEntry } from "../types";

describe("SyncEngine", () => {
  // ─── Helpers ──────────────────────────────────────────────────────

  function createMockChangeQueue() {
    return {
      enqueue: jest.fn(),
      peek: jest.fn<Promise<QueueEntry[]>, [number?]>(),
      dequeue: jest.fn(),
      markDeadLetter: jest.fn(),
      markAllAuthError: jest.fn<Promise<number>, []>(),
      resetAuthErrors: jest.fn<Promise<number>, []>(),
      incrementRetry: jest.fn(),
      getPendingCount: jest.fn<Promise<number>, []>(),
    };
  }

  function createMockIdMapping() {
    return {
      storeMapping: jest.fn(),
      lookup: jest.fn(),
      updateChildFKs: jest.fn<Promise<number>, [string, string, string, string]>(),
      patchPendingQueue: jest.fn(),
    };
  }

  function createMockSyncMeta() {
    return {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      setActiveSessionId: jest.fn(),
      getActiveSessionId: jest.fn(),
      clearActiveSessionId: jest.fn(),
      setAuthExpired: jest.fn(),
      getAuthExpired: jest.fn<Promise<boolean>, []>(),
      setLastSyncedAt: jest.fn(),
      getLastSyncedAt: jest.fn(),
    };
  }

  function createMockPocketBase() {
    const mockCollection = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getFullList: jest.fn(),
    };
    return {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
  }

  function createMockNetworkMonitor(isOnline = true) {
    return { isOnline };
  }

  function createEngine(
    overrides: {
      changeQueue?: ReturnType<typeof createMockChangeQueue>;
      idMapping?: ReturnType<typeof createMockIdMapping>;
      syncMeta?: ReturnType<typeof createMockSyncMeta>;
      pocketbase?: ReturnType<typeof createMockPocketBase>;
      networkMonitor?: ReturnType<typeof createMockNetworkMonitor>;
      db?: { runAsync: jest.Mock };
    } = {},
  ) {
    const db = overrides.db ?? { runAsync: jest.fn() };
    return {
      engine: new SyncEngine(
        db as any,
        overrides.changeQueue ?? (createMockChangeQueue() as any),
        overrides.idMapping ?? (createMockIdMapping() as any),
        overrides.syncMeta ?? (createMockSyncMeta() as any),
        overrides.pocketbase ?? (createMockPocketBase() as any),
        overrides.networkMonitor ?? createMockNetworkMonitor(),
      ),
      db,
    };
  }

  function makeQueueEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
    return {
      id: 1,
      action: "create",
      collection: "workout_sessions",
      local_id: "local-1",
      record_id: null,
      data: { name: "Test Session" },
      group_id: null,
      status: "pending",
      retry_count: 0,
      last_error: null,
      created_at: "2026-07-01T00:00:00Z",
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Constructor & event helpers ──────────────────────────────────

  describe("constructor", () => {
    it("stores all dependencies", () => {
      const { engine } = createEngine();
      expect(engine).toBeDefined();
    });
  });

  describe("on / off", () => {
    it("registers and invokes event listeners", () => {
      const { engine } = createEngine();
      const listener = jest.fn();

      engine.on("SYNC_START", listener);
      // Manually emit via the internal method
      (engine as any).emit({ type: "SYNC_START" });

      expect(listener).toHaveBeenCalledWith({ type: "SYNC_START" });
    });

    it("removes listeners via off", () => {
      const { engine } = createEngine();
      const listener = jest.fn();

      engine.on("SYNC_START", listener);
      engine.off("SYNC_START", listener);
      (engine as any).emit({ type: "SYNC_START" });

      expect(listener).not.toHaveBeenCalled();
    });

    it("supports multiple listeners on the same event", () => {
      const { engine } = createEngine();
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      engine.on("SYNC_COMPLETE", listener1);
      engine.on("SYNC_COMPLETE", listener2);
      (engine as any).emit({ type: "SYNC_COMPLETE" });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  // ─── flushQueue ───────────────────────────────────────────────────

  describe("flushQueue", () => {
    it("processes create entries and dequeues them", async () => {
      const changeQueue = createMockChangeQueue();
      const idMapping = createMockIdMapping();
      const db = { runAsync: jest.fn() };
      const pb = createMockPocketBase();

      changeQueue.peek.mockResolvedValue([makeQueueEntry()]);
      changeQueue.dequeue.mockResolvedValue(undefined);
      idMapping.updateChildFKs.mockResolvedValue(0);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
      pb.collection().create.mockResolvedValue({ id: "server-1" });

      const { engine } = createEngine({
        changeQueue,
        idMapping,
        pocketbase: pb,
        db,
      });

      const result = await engine.flushQueue();

      expect(changeQueue.peek).toHaveBeenCalled();
      expect(pb.collection).toHaveBeenCalledWith("workout_sessions");
      expect(pb.collection().create).toHaveBeenCalledWith({ name: "Test Session" });
      // ID remapping should have happened
      expect(idMapping.storeMapping).toHaveBeenCalledWith("local-1", "server-1", "workout_sessions");
      expect(changeQueue.dequeue).toHaveBeenCalledWith(1);
      expect(result.synced).toBe(1);
    });

    it("processes update entries and dequeues them", async () => {
      const changeQueue = createMockChangeQueue();
      const pb = createMockPocketBase();

      changeQueue.peek.mockResolvedValue([
        makeQueueEntry({ action: "update", record_id: "server-1" }),
      ]);
      changeQueue.dequeue.mockResolvedValue(undefined);
      pb.collection().update.mockResolvedValue({ id: "server-1" });

      const { engine } = createEngine({ changeQueue, pocketbase: pb });

      const result = await engine.flushQueue();

      expect(pb.collection).toHaveBeenCalledWith("workout_sessions");
      expect(pb.collection().update).toHaveBeenCalledWith("server-1", { name: "Test Session" });
      expect(changeQueue.dequeue).toHaveBeenCalledWith(1);
      expect(result.synced).toBe(1);
    });

    it("processes delete entries and dequeues them", async () => {
      const changeQueue = createMockChangeQueue();
      const pb = createMockPocketBase();

      changeQueue.peek.mockResolvedValue([
        makeQueueEntry({ action: "delete", record_id: "server-1", data: null }),
      ]);
      changeQueue.dequeue.mockResolvedValue(undefined);
      pb.collection().delete.mockResolvedValue(true);

      const { engine } = createEngine({ changeQueue, pocketbase: pb });

      const result = await engine.flushQueue();

      expect(pb.collection().delete).toHaveBeenCalledWith("server-1");
      expect(changeQueue.dequeue).toHaveBeenCalledWith(1);
      expect(result.synced).toBe(1);
    });

    it("handles 401 by marking auth error and emitting AUTH_EXPIRED", async () => {
      const changeQueue = createMockChangeQueue();
      const pb = createMockPocketBase();

      changeQueue.peek.mockResolvedValue([makeQueueEntry()]);
      changeQueue.markAllAuthError.mockResolvedValue(1);
      const authError = new Error("Auth expired");
      (authError as any).status = 401;
      pb.collection().create.mockRejectedValue(authError);

      const { engine } = createEngine({ changeQueue, pocketbase: pb });
      const listener = jest.fn();
      engine.on("AUTH_EXPIRED", listener);

      const result = await engine.flushQueue();

      expect(changeQueue.markAllAuthError).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: "AUTH_EXPIRED" }),
      );
      expect(result.authExpired).toBe(true);
    });

    it("marks dead letter after 3 retries and emits DEAD_LETTER", async () => {
      const changeQueue = createMockChangeQueue();
      const pb = createMockPocketBase();

      changeQueue.peek.mockResolvedValue([
        makeQueueEntry({ retry_count: 3 }),
      ]);
      changeQueue.markDeadLetter.mockResolvedValue(undefined);
      const error = new Error("Server error");
      pb.collection().create.mockRejectedValue(error);

      const { engine } = createEngine({ changeQueue, pocketbase: pb });
      const listener = jest.fn();
      engine.on("DEAD_LETTER", listener);

      const result = await engine.flushQueue();

      expect(changeQueue.markDeadLetter).toHaveBeenCalledWith(1, expect.any(String));
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: "DEAD_LETTER" }),
      );
      expect(result.deadLettered).toBe(1);
    });

    it("respects group atomicity — stops group on first failure", async () => {
      const changeQueue = createMockChangeQueue();
      const idMapping = createMockIdMapping();
      const db = { runAsync: jest.fn() };
      const pb = createMockPocketBase();

      changeQueue.peek.mockResolvedValue([
        makeQueueEntry({ id: 1, group_id: "g1", data: { order: 1 } }),
        makeQueueEntry({ id: 2, group_id: "g1", data: { order: 2 } }),
      ]);
      changeQueue.incrementRetry.mockResolvedValue(undefined);
      // First entry succeeds, second fails
      pb.collection().create
        .mockResolvedValueOnce({ id: "server-1" })
        .mockRejectedValueOnce(new Error("Server error"));
      idMapping.updateChildFKs.mockResolvedValue(0);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      const { engine } = createEngine({
        changeQueue,
        idMapping,
        pocketbase: pb,
        db,
      });

      const result = await engine.flushQueue();

      // First entry should be dequeued (succeeded)
      expect(changeQueue.dequeue).toHaveBeenCalledWith(1);
      // Second entry should NOT be dequeued (group stopped on failure)
      expect(changeQueue.dequeue).not.toHaveBeenCalledWith(2);
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);
    });

    it("returns empty result when no entries are pending", async () => {
      const changeQueue = createMockChangeQueue();
      changeQueue.peek.mockResolvedValue([]);

      const { engine } = createEngine({ changeQueue });

      const result = await engine.flushQueue();

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  // ─── pullCollection ───────────────────────────────────────────────

  describe("pullCollection", () => {
    it("fetches records from PocketBase and upserts to SQLite", async () => {
      const pb = createMockPocketBase();
      const syncMeta = createMockSyncMeta();
      const db = { runAsync: jest.fn() };

      pb.collection().getFullList.mockResolvedValue([
        { id: "ex-1", name: "Bench Press", category: "strength" },
        { id: "ex-2", name: "Squat", category: "strength" },
      ]);
      db.runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 });

      const engine = new SyncEngine(
        db as any,
        createMockChangeQueue() as any,
        createMockIdMapping() as any,
        syncMeta as any,
        pb as any,
        createMockNetworkMonitor(),
      );

      await engine.pullCollection("exercises");

      // Should upsert each record
      expect(db.runAsync).toHaveBeenCalledTimes(2);
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE INTO exercises"),
        expect.arrayContaining(["ex-1"]),
      );
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE INTO exercises"),
        expect.arrayContaining(["ex-2"]),
      );
      // Should update sync meta
      expect(syncMeta.setLastSyncedAt).toHaveBeenCalledWith(
        "exercises",
        expect.any(String),
      );
    });

    it("handles empty response from PocketBase", async () => {
      const pb = createMockPocketBase();
      const syncMeta = createMockSyncMeta();
      const db = { runAsync: jest.fn() };

      pb.collection().getFullList.mockResolvedValue([]);

      const engine = new SyncEngine(
        db as any,
        createMockChangeQueue() as any,
        createMockIdMapping() as any,
        syncMeta as any,
        pb as any,
        createMockNetworkMonitor(),
      );

      await engine.pullCollection("exercises");

      expect(db.runAsync).not.toHaveBeenCalled();
      expect(syncMeta.setLastSyncedAt).toHaveBeenCalled();
    });

    it("logs warning and skips on PocketBase error", async () => {
      const pb = createMockPocketBase();
      const consoleWarn = jest.spyOn(console, "warn").mockImplementation();
      const syncMeta = createMockSyncMeta();
      const db = { runAsync: jest.fn() };

      pb.collection().getFullList.mockRejectedValue(new Error("Network error"));

      const engine = new SyncEngine(
        db as any,
        createMockChangeQueue() as any,
        createMockIdMapping() as any,
        syncMeta as any,
        pb as any,
        createMockNetworkMonitor(),
      );

      await engine.pullCollection("exercises");

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  // ─── syncAll ──────────────────────────────────────────────────────

  describe("syncAll", () => {
    it("flushes queue then pulls collections", async () => {
      const changeQueue = createMockChangeQueue();
      const pb = createMockPocketBase();
      const syncMeta = createMockSyncMeta();
      const db = { runAsync: jest.fn() };

      changeQueue.peek.mockResolvedValue([]);
      pb.collection().getFullList.mockResolvedValue([]);
      db.runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 });

      const engine = new SyncEngine(
        db as any,
        changeQueue as any,
        createMockIdMapping() as any,
        syncMeta as any,
        pb as any,
        createMockNetworkMonitor(),
      );

      const result = await engine.syncAll();

      // Queue was flushed (peek called)
      expect(changeQueue.peek).toHaveBeenCalled();
      // Collections were pulled
      expect(pb.collection).toHaveBeenCalled();
      expect(result.timestamp).toBeDefined();
    });

    it("skips when offline", async () => {
      const changeQueue = createMockChangeQueue();
      const { engine } = createEngine({
        changeQueue,
        networkMonitor: createMockNetworkMonitor(false),
      });

      const result = await engine.syncAll();

      expect(changeQueue.peek).not.toHaveBeenCalled();
      expect(result.synced).toBe(0);
    });

    it("emits SYNC_START and SYNC_COMPLETE events", async () => {
      const changeQueue = createMockChangeQueue();
      const pb = createMockPocketBase();
      const syncMeta = createMockSyncMeta();
      const db = { runAsync: jest.fn() };

      changeQueue.peek.mockResolvedValue([]);
      pb.collection().getFullList.mockResolvedValue([]);
      db.runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 });

      const engine = new SyncEngine(
        db as any,
        changeQueue as any,
        createMockIdMapping() as any,
        syncMeta as any,
        pb as any,
        createMockNetworkMonitor(),
      );

      const startListener = jest.fn();
      const completeListener = jest.fn();
      engine.on("SYNC_START", startListener);
      engine.on("SYNC_COMPLETE", completeListener);

      await engine.syncAll();

      expect(startListener).toHaveBeenCalled();
      expect(completeListener).toHaveBeenCalled();
    });
  });

  // ─── Conflict detection ─────────────────────────────────────────

  describe("conflict detection", () => {
    it("emits CONFLICT when server updated_at is greater than local for update entries", async () => {
      const changeQueue = createMockChangeQueue();
      const pb = createMockPocketBase();

      changeQueue.peek.mockResolvedValue([
        makeQueueEntry({
          action: "update",
          record_id: "server-1",
          data: { name: "Test", updated_at: "2026-07-01T00:00:00Z" },
        }),
      ]);
      changeQueue.dequeue.mockResolvedValue(undefined);
      // Server returns a newer updated_at
      pb.collection().update.mockResolvedValue({
        id: "server-1",
        updated_at: "2026-07-02T00:00:00Z",
      });

      const { engine } = createEngine({ changeQueue, pocketbase: pb });
      const conflictListener = jest.fn();
      engine.on("CONFLICT", conflictListener);

      const result = await engine.flushQueue();

      expect(changeQueue.dequeue).toHaveBeenCalledWith(1);
      expect(conflictListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "CONFLICT",
          detail: expect.objectContaining({
            collection: "workout_sessions",
          }),
        }),
      );
      expect(result.synced).toBe(1);
    });

    it("does NOT emit CONFLICT when timestamps are equal", async () => {
      const changeQueue = createMockChangeQueue();
      const pb = createMockPocketBase();

      changeQueue.peek.mockResolvedValue([
        makeQueueEntry({
          action: "update",
          record_id: "server-1",
          data: { name: "Test", updated_at: "2026-07-01T00:00:00Z" },
        }),
      ]);
      changeQueue.dequeue.mockResolvedValue(undefined);
      pb.collection().update.mockResolvedValue({
        id: "server-1",
        updated_at: "2026-07-01T00:00:00Z",
      });

      const { engine } = createEngine({ changeQueue, pocketbase: pb });
      const conflictListener = jest.fn();
      engine.on("CONFLICT", conflictListener);

      const result = await engine.flushQueue();

      expect(conflictListener).not.toHaveBeenCalled();
      expect(result.synced).toBe(1);
    });

    it("does NOT emit CONFLICT when entry data has no updated_at", async () => {
      const changeQueue = createMockChangeQueue();
      const pb = createMockPocketBase();

      changeQueue.peek.mockResolvedValue([
        makeQueueEntry({ action: "delete", record_id: "server-1", data: null }),
      ]);
      changeQueue.dequeue.mockResolvedValue(undefined);
      pb.collection().delete.mockResolvedValue(true);

      const { engine } = createEngine({ changeQueue, pocketbase: pb });
      const conflictListener = jest.fn();
      engine.on("CONFLICT", conflictListener);

      await engine.flushQueue();

      expect(conflictListener).not.toHaveBeenCalled();
    });
  });

  // ─── Progress events ────────────────────────────────────────────

  describe("progress events", () => {
    it("emits PROGRESS during flushQueue with processed/total counts", async () => {
      const changeQueue = createMockChangeQueue();
      const idMapping = createMockIdMapping();
      const db = { runAsync: jest.fn() };
      const pb = createMockPocketBase();

      changeQueue.peek.mockResolvedValue([
        makeQueueEntry({ id: 1 }),
        makeQueueEntry({ id: 2 }),
      ]);
      changeQueue.dequeue.mockResolvedValue(undefined);
      idMapping.updateChildFKs.mockResolvedValue(0);
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
      pb.collection().create
        .mockResolvedValueOnce({ id: "server-1" })
        .mockResolvedValueOnce({ id: "server-2" });

      const { engine } = createEngine({
        changeQueue,
        idMapping,
        pocketbase: pb,
        db,
      });
      const progressListener = jest.fn();
      engine.on("PROGRESS", progressListener);

      await engine.flushQueue();

      expect(progressListener).toHaveBeenCalledTimes(2);
      expect(progressListener).toHaveBeenNthCalledWith(1, {
        type: "PROGRESS",
        detail: { processed: 1, total: 2 },
      });
      expect(progressListener).toHaveBeenNthCalledWith(2, {
        type: "PROGRESS",
        detail: { processed: 2, total: 2 },
      });
    });
  });

  // ─── lastSyncedAt on syncAll ────────────────────────────────────

  describe("syncAll lastSyncedAt", () => {
    it("includes lastSyncedAt in SYNC_COMPLETE event detail", async () => {
      const changeQueue = createMockChangeQueue();
      const pb = createMockPocketBase();
      const syncMeta = createMockSyncMeta();
      const db = { runAsync: jest.fn() };

      changeQueue.peek.mockResolvedValue([]);
      pb.collection().getFullList.mockResolvedValue([]);
      db.runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 });

      const engine = new SyncEngine(
        db as any,
        changeQueue as any,
        createMockIdMapping() as any,
        syncMeta as any,
        pb as any,
        createMockNetworkMonitor(),
      );

      const completeListener = jest.fn();
      engine.on("SYNC_COMPLETE", completeListener);

      await engine.syncAll();

      expect(completeListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SYNC_COMPLETE",
          detail: expect.objectContaining({
            lastSyncedAt: expect.any(String),
          }),
        }),
      );
    });
  });

  // ─── Exponential backoff ──────────────────────────────────────────

  describe("backoff", () => {
    it("computes delay for retry count 0", () => {
      const { engine } = createEngine();
      const delay = (engine as any).getBackoffDelay(0);
      expect(delay).toBe(1000);
    });

    it("computes delay for retry count 3", () => {
      const { engine } = createEngine();
      const delay = (engine as any).getBackoffDelay(3);
      expect(delay).toBe(8000);
    });

    it("caps delay at 30 seconds", () => {
      const { engine } = createEngine();
      const delay = (engine as any).getBackoffDelay(10);
      expect(delay).toBe(30000);
    });
  });
});
