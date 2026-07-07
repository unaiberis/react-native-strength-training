/**
 * OfflineFeedbackService tests.
 *
 * Verifies that feedback submission writes to SQLite AND enqueues
 * a CREATE change for later sync.
 */

jest.mock("expo-sqlite", () => ({}));

import { OfflineFeedbackService } from "../services/offline-feedback";

describe("OfflineFeedbackService", () => {
  function createMockDb() {
    return {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
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
    };
  }

  function createService(
    db: ReturnType<typeof createMockDb> = createMockDb(),
    queue: ReturnType<typeof createMockChangeQueue> = createMockChangeQueue(),
  ) {
    return {
      service: new OfflineFeedbackService(db as any, queue as any),
      db,
      queue,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("submitFeedback", () => {
    it("inserts a feedback row into SQLite and enqueues a CREATE change", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      await service.submitFeedback({
        sessionId: "sess-1",
        athleteId: "user-1",
        coachId: "coach-1",
        rating: 4,
        notes: "Great session!",
      });

      // Should insert into workout_feedback
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO workout_feedback"),
        expect.arrayContaining([
          expect.any(String), // id
          "sess-1",
          "user-1",
          "coach-1",
          4,
          "Great session!",
        ]),
      );

      // Should enqueue a CREATE change
      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "create",
          collection: "workout_feedback",
          localId: expect.any(String),
          data: expect.objectContaining({
            session_id: "sess-1",
            athlete_id: "user-1",
            rating: 4,
          }),
        }),
      );
    });

    it("handles null coachId and null notes", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      await service.submitFeedback({
        sessionId: "sess-1",
        athleteId: "user-1",
        coachId: null,
        rating: 5,
        notes: null,
      });

      const [, params] = db.runAsync.mock.calls[0];
      const paramArray = params as unknown[];
      const coachIdx = 4; // position of coach_id in the INSERT params
      expect(paramArray[coachIdx]).toBeNull();
      const notesIdx = 6; // position of notes in the INSERT params
      expect(paramArray[notesIdx]).toBeNull();

      // Verify enqueue has null values
      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            coach_id: null,
            notes: null,
          }),
        }),
      );
    });

    it("generates a unique id and stores it as both id and local_id", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      await service.submitFeedback({
        sessionId: "sess-1",
        athleteId: "user-1",
        rating: 3,
      });

      const [, params] = db.runAsync.mock.calls[0];
      const firstParam = (params as unknown[])[0];

      // id and local_id should be the same UUID
      expect(firstParam).toEqual(expect.any(String));
      expect((params as unknown[])[0]).toEqual((params as unknown[])[1]);

      // Verify enqueue used the same localId
      const enqueueArg = queue.enqueue.mock.calls[0][0] as any;
      expect(enqueueArg.localId).toEqual(firstParam);
    });
  });
});
