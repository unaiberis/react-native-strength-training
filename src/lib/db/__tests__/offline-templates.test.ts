/**
 * OfflineTemplatesService tests.
 *
 * Verifies template CRUD operations: create, update, delete, and read.
 */

jest.mock("expo-sqlite", () => ({}));

import { OfflineTemplatesService } from "../services/offline-templates";
import type { WorkoutTemplateRow, WorkoutTemplateExerciseRow } from "../types";

describe("OfflineTemplatesService", () => {
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
      service: new OfflineTemplatesService(db as any, queue as any),
      db,
      queue,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── createTemplate ───────────────────────────────────────────────

  describe("createTemplate", () => {
    it("inserts template rows and enqueues a CREATE change", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      const template = await service.createTemplate({
        userId: "user-1",
        name: "Push Day",
        description: "Chest, shoulders, triceps",
        exercises: [
          { exerciseId: "ex-1", sortOrder: 1, targetSets: 3, targetReps: 10 },
        ],
      });

      // Should insert into workout_templates
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO workout_templates"),
        expect.arrayContaining([
          expect.any(String), // id
          expect.any(String), // local_id
          "user-1",
          "Push Day",
        ]),
      );

      // Should insert template exercises
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO workout_template_exercises"),
        expect.arrayContaining([
          expect.any(String), // id
          "ex-1",
          1,
          3,
          10,
        ]),
      );

      // Should enqueue a CREATE change with exercises
      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "create",
          collection: "workout_templates",
          localId: expect.any(String),
        }),
      );

      expect(template.user_id).toBe("user-1");
      expect(template.name).toBe("Push Day");
    });

    it("creates a template without exercises", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      const template = await service.createTemplate({
        userId: "user-1",
        name: "Empty Template",
      });

      expect(db.runAsync).toHaveBeenCalledTimes(1); // Only the template INSERT
      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      expect(template.name).toBe("Empty Template");
    });
  });

  // ─── updateTemplate ───────────────────────────────────────────────

  describe("updateTemplate", () => {
    it("updates the template row and enqueues an UPDATE change", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await service.updateTemplate("template-1", {
        name: "Updated Push Day",
        description: "Updated description",
        userId: "user-1",
      });

      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE workout_templates"),
        expect.arrayContaining(["Updated Push Day"]),
      );

      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "update",
          collection: "workout_templates",
          recordId: "template-1",
        }),
      );
    });
  });

  // ─── deleteTemplate ───────────────────────────────────────────────

  describe("deleteTemplate", () => {
    it("deletes the template and enqueues a DELETE change", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await service.deleteTemplate("template-1");

      // Should delete from workout_template_exercises first (FK constraint)
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM workout_template_exercises"),
        expect.arrayContaining(["template-1"]),
      );

      // Then delete the template itself
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM workout_templates"),
        expect.arrayContaining(["template-1"]),
      );

      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delete",
          collection: "workout_templates",
          recordId: "template-1",
        }),
      );
    });
  });

  // ─── getTemplates ─────────────────────────────────────────────────

  describe("getTemplates", () => {
    it("returns all templates from SQLite", async () => {
      const { service, db } = createService();
      const mockTemplates: WorkoutTemplateRow[] = [
        {
          id: "tpl-1",
          local_id: null,
          user_id: "user-1",
          name: "Push Day",
          description: null,
          is_public: 0,
          dirty: 1,
          synced_at: null,
          created_at: null,
          updated_at: null,
        },
      ];
      db.getAllAsync.mockResolvedValue(mockTemplates);

      const templates = await service.getTemplates();

      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM workout_templates"),
      );
      expect(templates).toEqual(mockTemplates);
    });

    it("returns empty array when no templates exist", async () => {
      const { service, db } = createService();
      db.getAllAsync.mockResolvedValue([]);

      const templates = await service.getTemplates();

      expect(templates).toEqual([]);
    });
  });

  // ─── getTemplateExercises ─────────────────────────────────────────

  describe("getTemplateExercises", () => {
    it("returns exercises for a template ordered by sort_order", async () => {
      const { service, db } = createService();
      const mockExercises: WorkoutTemplateExerciseRow[] = [
        {
          id: "wte-1",
          local_id: null,
          template_id: "tpl-1",
          exercise_id: "ex-1",
          sort_order: 1,
          target_sets: 3,
          target_reps: 10,
          rest_seconds: 90,
          notes: null,
          dirty: 1,
          synced_at: null,
        },
      ];
      db.getAllAsync.mockResolvedValue(mockExercises);

      const exercises = await service.getTemplateExercises("tpl-1");

      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("WHERE template_id = ?"),
        expect.arrayContaining(["tpl-1"]),
      );
      expect(exercises).toEqual(mockExercises);
    });

    it("returns empty array when template has no exercises", async () => {
      const { service, db } = createService();
      db.getAllAsync.mockResolvedValue([]);

      const exercises = await service.getTemplateExercises("tpl-1");

      expect(exercises).toEqual([]);
    });
  });

  // ─── reorderExercises ───────────────────────────────────────────

  describe("reorderExercises", () => {
    it("updates sort_order for multiple exercises and enqueues UPDATEs", async () => {
      const { service, db, queue } = createService();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await service.reorderExercises("tpl-1", [
        { exerciseId: "wte-1", sortOrder: 2 },
        { exerciseId: "wte-2", sortOrder: 1 },
      ]);

      // Should update each exercise's sort_order
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE workout_template_exercises"),
        expect.arrayContaining([2, "wte-1"]),
      );
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE workout_template_exercises"),
        expect.arrayContaining([1, "wte-2"]),
      );

      // Should enqueue an UPDATE change for each reorder
      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "update",
          collection: "workout_template_exercises",
        }),
      );
    });

    it("handles empty reorder list gracefully", async () => {
      const { service, db, queue } = createService();

      await service.reorderExercises("tpl-1", []);

      expect(db.runAsync).not.toHaveBeenCalled();
      expect(queue.enqueue).not.toHaveBeenCalled();
    });
  });
});
