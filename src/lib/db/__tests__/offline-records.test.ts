/**
 * OfflineRecordsService tests.
 *
 * Verifies personal record computation from local exercise_sets data.
 */

jest.mock("expo-sqlite", () => ({}));

import { OfflineRecordsService } from "../services/offline-records";
import type { ExerciseSetRow } from "../types";

describe("OfflineRecordsService", () => {
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
      service: new OfflineRecordsService(db as any),
      db,
    };
  }

  function makeSet(overrides: Partial<ExerciseSetRow> = {}): ExerciseSetRow {
    return {
      id: "set-1",
      local_id: null,
      session_id: "session-1",
      exercise_id: "ex-1",
      set_number: 1,
      weight_kg: 100,
      reps: 5,
      rpe: null,
      rir: null,
      is_warmup: 0,
      dirty: 0,
      synced_at: "2026-07-01T00:00:00Z",
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── getBestSet ───────────────────────────────────────────────────

  describe("getBestSet", () => {
    it("returns the set with highest weight for a given exercise", async () => {
      const { service, db } = createService();
      const bestSet = makeSet({ weight_kg: 120, reps: 3 });
      db.getFirstAsync.mockResolvedValue(bestSet);

      const result = await service.getBestSet("ex-1");

      const [sql, params] = db.getFirstAsync.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain("exercise_id = ?");
      expect(sql).toContain("ORDER BY weight_kg DESC");
      expect(sql).toContain("LIMIT 1");
      expect((params as unknown[])[0]).toBe("ex-1");
      expect(result).toEqual(bestSet);
    });

    it("returns null when no sets exist for the exercise", async () => {
      const { service, db } = createService();
      db.getFirstAsync.mockResolvedValue(null);

      const result = await service.getBestSet("ex-nonexistent");

      expect(result).toBeNull();
    });
  });

  // ─── getEstimated1RM ─────────────────────────────────────────────

  describe("getEstimated1RM", () => {
    it("computes e1RM using Epley formula from best set", async () => {
      const { service, db } = createService();
      // Epley formula: weight * (1 + reps/30)
      // For 100kg x 5 reps: 100 * (1 + 5/30) = 100 * 1.167 = 116.67
      const bestSet = makeSet({ weight_kg: 100, reps: 5 });
      db.getFirstAsync.mockResolvedValue(bestSet);

      const result = await service.getEstimated1RM("ex-1");

      expect(result).toBeCloseTo(116.67, 1);
    });

    it("returns null when no sets exist for the exercise", async () => {
      const { service, db } = createService();
      db.getFirstAsync.mockResolvedValue(null);

      const result = await service.getEstimated1RM("ex-nonexistent");

      expect(result).toBeNull();
    });
  });

  // ─── getPersonalRecords ───────────────────────────────────────────

  describe("getPersonalRecords", () => {
    it("returns best set for each exercise the user has logged", async () => {
      const { service, db } = createService();
      const mockRows: Array<{ exercise_id: string; weight_kg: number; reps: number; rpe: number | null }> = [
        { exercise_id: "ex-1", weight_kg: 120, reps: 3, rpe: null },
        { exercise_id: "ex-2", weight_kg: 80, reps: 10, rpe: null },
      ];
      db.getAllAsync.mockResolvedValue(mockRows);

      const result = await service.getPersonalRecords();

      const [sql] = db.getAllAsync.mock.calls[0] as [string];
      expect(sql).toContain("GROUP BY exercise_id");
      expect(result).toHaveLength(2);
      expect(result[0].exercise_id).toBe("ex-1");
      expect(result[0].weight_kg).toBe(120);
    });

    it("returns empty array when no sets have been logged", async () => {
      const { service, db } = createService();
      db.getAllAsync.mockResolvedValue([]);

      const result = await service.getPersonalRecords();

      expect(result).toEqual([]);
    });
  });
});
