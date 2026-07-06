/**
 * OfflineExercisesService tests.
 *
 * Verifies exercise queries from SQLite with multi-filter support
 * (category + equipment + body_region).
 */

jest.mock("expo-sqlite", () => ({}));

import { OfflineExercisesService } from "../services/offline-exercises";
import type { ExerciseRow } from "../types";

describe("OfflineExercisesService", () => {
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

  function createService(
    db: ReturnType<typeof createMockDb> = createMockDb(),
  ) {
    return {
      service: new OfflineExercisesService(db as any),
      db,
    };
  }

  function makeExercise(overrides: Partial<ExerciseRow> = {}): ExerciseRow {
    return {
      id: "ex-1",
      name: "Bench Press",
      category: "strength",
      equipment: "barbell",
      body_region: "chest",
      default_sets: 3,
      default_reps: 10,
      description: null,
      synced_at: "2026-07-01T00:00:00Z",
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── getExercises ─────────────────────────────────────────────────

  describe("getExercises", () => {
    it("returns all exercises when no filters provided", async () => {
      const { service, db } = createService();
      const mockExercises: ExerciseRow[] = [
        makeExercise({ id: "ex-1", name: "Bench Press" }),
        makeExercise({ id: "ex-2", name: "Squat", category: "legs" }),
      ];
      db.getAllAsync.mockResolvedValue(mockExercises);

      const result = await service.getExercises();

      const [sql] = db.getAllAsync.mock.calls[0] as [string];
      expect(sql).toContain("SELECT * FROM exercises");
      expect(sql).not.toContain("WHERE");
      expect(result).toHaveLength(2);
    });

    it("filters by category when provided", async () => {
      const { service, db } = createService();
      db.getAllAsync.mockResolvedValue([makeExercise()]);

      await service.getExercises({ category: "strength" });

      const [sql, params] = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain("WHERE");
      expect(sql).toContain("category = ?");
      expect(params).toContain("strength");
    });

    it("filters by category and equipment together", async () => {
      const { service, db } = createService();
      db.getAllAsync.mockResolvedValue([makeExercise()]);

      await service.getExercises({ category: "strength", equipment: "barbell" });

      const [sql, params] = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain("category = ?");
      expect(sql).toContain("equipment = ?");
      expect(sql).toContain("AND");
      expect(params).toContain("strength");
      expect(params).toContain("barbell");
    });

    it("filters by category, equipment, and body_region", async () => {
      const { service, db } = createService();
      db.getAllAsync.mockResolvedValue([makeExercise()]);

      await service.getExercises({
        category: "strength",
        equipment: "barbell",
        bodyRegion: "chest",
      });

      const [sql, params] = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain("body_region = ?");
      expect(params).toContain("chest");
    });

    it("returns empty array when no exercises match filters", async () => {
      const { service, db } = createService();
      db.getAllAsync.mockResolvedValue([]);

      const result = await service.getExercises({ category: "nonexistent" });

      expect(result).toEqual([]);
    });
  });

  // ─── getExerciseById ────────────────────────────────────────────

  describe("getExerciseById", () => {
    it("returns a single exercise by id", async () => {
      const { service, db } = createService();
      const mockExercise = makeExercise();
      db.getFirstAsync.mockResolvedValue(mockExercise);

      const result = await service.getExerciseById("ex-1");

      const [sql, params] = db.getFirstAsync.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain("WHERE id = ?");
      expect((params as unknown[])[0]).toBe("ex-1");
      expect(result).toEqual(mockExercise);
    });

    it("returns null when exercise not found", async () => {
      const { service, db } = createService();
      db.getFirstAsync.mockResolvedValue(null);

      const result = await service.getExerciseById("nonexistent");

      expect(result).toBeNull();
    });
  });
});
