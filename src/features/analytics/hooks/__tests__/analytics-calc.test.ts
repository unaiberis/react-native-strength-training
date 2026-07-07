import {
  computeVolumeByPeriod,
  computeConsistencyData,
  computeExerciseProgress,
  computePersonalRecordTimeline,
  type VolumeDataPoint,
  type ConsistencyDataPoint,
  type ExerciseProgressPoint,
  type PersonalRecordPoint,
} from "../analytics-calc";

// ─── Fixtures ────────────────────────────────────────────────────────────

function makeSet(
  overrides: Partial<{
    id: string;
    session_id: string;
    exercise_id: string;
    set_number: number;
    weight_kg: number;
    reps: number;
    is_warmup: number;
    date: string;
  }>,
) {
  return {
    id: "set-1",
    session_id: "session-1",
    exercise_id: "ex-1",
    set_number: 1,
    weight_kg: 80,
    reps: 10,
    is_warmup: 0,
    date: "2026-07-06",
    ...overrides,
  };
}

function makeSession(
  overrides: Partial<{
    id: string;
    started_at: string;
    completed_at: string | null;
    duration_seconds: number | null;
    status: string;
  }>,
) {
  return {
    id: "session-1",
    started_at: "2026-07-06T12:00:00.000Z",
    completed_at: "2026-07-06T13:00:00.000Z",
    duration_seconds: 3600,
    status: "completed" as const,
    ...overrides,
  };
}

// ─── computeVolumeByPeriod ──────────────────────────────────────────────

describe("computeVolumeByPeriod", () => {
  it("aggregates volume weekly from sets with dates", () => {
    // Week 27 (June 29 - July 5): 2 sets
    // Week 28 (July 6 - July 12): 1 set
    const sets = [
      makeSet({ weight_kg: 100, reps: 5, date: "2026-06-29" }),
      makeSet({ weight_kg: 80, reps: 10, date: "2026-07-01" }),
      makeSet({ weight_kg: 120, reps: 3, date: "2026-07-06" }),
    ];

    const result = computeVolumeByPeriod(sets, "weekly");

    // 100*5 + 80*10 = 500 + 800 = 1300 for week 27
    // 120*3 = 360 for week 28
    expect(result).toHaveLength(2);
    expect(result[0].volume).toBe(1300);
    expect(result[1].volume).toBe(360);
    // Period labels should be ISO week strings
    expect(result[0].period).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("aggregates volume monthly from sets with dates", () => {
    const sets = [
      makeSet({ weight_kg: 100, reps: 5, date: "2026-06-15" }),
      makeSet({ weight_kg: 80, reps: 10, date: "2026-07-06" }),
      makeSet({ weight_kg: 90, reps: 8, date: "2026-07-08" }),
    ];

    const result = computeVolumeByPeriod(sets, "monthly");

    // June: 100*5 = 500
    // July: 80*10 + 90*8 = 800 + 720 = 1520
    expect(result).toHaveLength(2);
    const june = result.find((r) => r.period === "2026-06");
    const july = result.find((r) => r.period === "2026-07");
    expect(june).toBeDefined();
    expect(july).toBeDefined();
    expect(june!.volume).toBe(500);
    expect(july!.volume).toBe(1520);
  });

  it("returns empty array for empty input", () => {
    expect(computeVolumeByPeriod([], "weekly")).toEqual([]);
  });

  it("skips warmup sets in volume calculation", () => {
    const sets = [
      makeSet({ weight_kg: 40, reps: 10, is_warmup: 1, date: "2026-07-06" }),
      makeSet({ weight_kg: 100, reps: 5, is_warmup: 0, date: "2026-07-06" }),
    ];

    const result = computeVolumeByPeriod(sets, "monthly");

    expect(result).toHaveLength(1);
    // Only 100*5 = 500, warmup excluded
    expect(result[0].volume).toBe(500);
  });

  it("handles sets with zero weight or reps", () => {
    const sets = [
      makeSet({ weight_kg: 0, reps: 0, date: "2026-07-06" }),
      makeSet({ weight_kg: 100, reps: 5, date: "2026-07-06" }),
    ];

    const result = computeVolumeByPeriod(sets, "weekly");

    expect(result).toHaveLength(1);
    expect(result[0].volume).toBe(500);
  });

  it("sorts periods chronologically", () => {
    const sets = [
      makeSet({ weight_kg: 80, reps: 8, date: "2026-08-01" }),
      makeSet({ weight_kg: 100, reps: 5, date: "2026-06-01" }),
      makeSet({ weight_kg: 90, reps: 6, date: "2026-07-01" }),
    ];

    const result = computeVolumeByPeriod(sets, "monthly");

    expect(result.map((r) => r.period)).toEqual(["2026-06", "2026-07", "2026-08"]);
  });
});

// ─── computeConsistencyData ─────────────────────────────────────────────

describe("computeConsistencyData", () => {
  it("counts workout sessions per week", () => {
    const sessions = [
      makeSession({ started_at: "2026-06-29T10:00:00.000Z" }),
      makeSession({ started_at: "2026-07-01T10:00:00.000Z" }),
      makeSession({ started_at: "2026-07-06T10:00:00.000Z" }),
    ];

    const result = computeConsistencyData(sessions, "weekly");

    // Week 27: 2 sessions (June 29, July 1)
    // Week 28: 1 session (July 6)
    expect(result).toHaveLength(2);
    expect(result[0].count).toBe(2);
    expect(result[1].count).toBe(1);
  });

  it("counts workout sessions per month", () => {
    const sessions = [
      makeSession({ started_at: "2026-06-15T10:00:00.000Z" }),
      makeSession({ started_at: "2026-06-20T10:00:00.000Z" }),
      makeSession({ started_at: "2026-07-06T10:00:00.000Z" }),
    ];

    const result = computeConsistencyData(sessions, "monthly");

    expect(result).toHaveLength(2);
    const june = result.find((r) => r.period === "2026-06");
    const july = result.find((r) => r.period === "2026-07");
    expect(june).toBeDefined();
    expect(july).toBeDefined();
    expect(june!.count).toBe(2);
    expect(july!.count).toBe(1);
  });

  it("returns empty array for empty input", () => {
    expect(computeConsistencyData([], "weekly")).toEqual([]);
  });

  it("filters out non-completed sessions", () => {
    const sessions = [
      makeSession({ status: "completed", started_at: "2026-07-06T10:00:00.000Z" }),
      makeSession({ status: "active", started_at: "2026-07-06T12:00:00.000Z" }),
      makeSession({ status: "cancelled", started_at: "2026-07-06T14:00:00.000Z" }),
    ];

    const result = computeConsistencyData(sessions, "weekly");

    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(1);
  });
});

// ─── computeExerciseProgress ────────────────────────────────────────────

describe("computeExerciseProgress", () => {
  it("returns time series of best e1RM per session for an exercise", () => {
    const sets = [
      makeSet({ exercise_id: "ex-1", weight_kg: 80, reps: 10, date: "2026-07-01", session_id: "s1" }),
      makeSet({ exercise_id: "ex-1", weight_kg: 85, reps: 8, date: "2026-07-01", session_id: "s1" }),
      makeSet({ exercise_id: "ex-1", weight_kg: 90, reps: 5, date: "2026-07-06", session_id: "s2" }),
      makeSet({ exercise_id: "ex-2", weight_kg: 100, reps: 5, date: "2026-07-06", session_id: "s2" }),
    ];

    const result = computeExerciseProgress("ex-1", sets);

    // Only ex-1 sets
    // Session s1 (July 1): best e1RM = 85*(1+8/30) = 107.67
    // Session s2 (July 6): best e1RM = 90*(1+5/30) = 105
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-07-01");
    expect(result[0].bestE1RM).toBeCloseTo(107.67, 1);
    expect(result[0].session_id).toBe("s1");
    expect(result[1].date).toBe("2026-07-06");
    expect(result[1].bestE1RM).toBeCloseTo(105, 1);
  });

  it("returns empty array for unknown exercise", () => {
    const sets = [makeSet({ exercise_id: "ex-1" })];
    expect(computeExerciseProgress("unknown", sets)).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(computeExerciseProgress("ex-1", [])).toEqual([]);
  });

  it("sorts chronologically by date", () => {
    const sets = [
      makeSet({ exercise_id: "ex-1", weight_kg: 80, reps: 10, date: "2026-08-01", session_id: "s3" }),
      makeSet({ exercise_id: "ex-1", weight_kg: 70, reps: 12, date: "2026-06-01", session_id: "s1" }),
      makeSet({ exercise_id: "ex-1", weight_kg: 75, reps: 10, date: "2026-07-01", session_id: "s2" }),
    ];

    const result = computeExerciseProgress("ex-1", sets);

    expect(result.map((r) => r.date)).toEqual(["2026-06-01", "2026-07-01", "2026-08-01"]);
  });

  it("includes max weight and total volume per session", () => {
    const sets = [
      makeSet({ exercise_id: "ex-1", weight_kg: 80, reps: 10, date: "2026-07-01", session_id: "s1" }),
      makeSet({ exercise_id: "ex-1", weight_kg: 60, reps: 15, date: "2026-07-01", session_id: "s1" }),
    ];

    const result = computeExerciseProgress("ex-1", sets);

    expect(result).toHaveLength(1);
    expect(result[0].maxWeight).toBe(80);
    expect(result[0].totalVolume).toBe(80 * 10 + 60 * 15);
    expect(result[0].totalSets).toBe(2);
  });
});

// ─── computePersonalRecordTimeline ──────────────────────────────────────

describe("computePersonalRecordTimeline", () => {
  it("returns best e1RM per unique date for an exercise", () => {
    const sets = [
      makeSet({ exercise_id: "ex-1", weight_kg: 80, reps: 8, date: "2026-07-01", session_id: "s1" }),
      makeSet({ exercise_id: "ex-1", weight_kg: 85, reps: 6, date: "2026-07-01", session_id: "s1" }),
      makeSet({ exercise_id: "ex-1", weight_kg: 100, reps: 3, date: "2026-07-06", session_id: "s2" }),
      makeSet({ exercise_id: "ex-1", weight_kg: 90, reps: 5, date: "2026-07-10", session_id: "s3" }),
    ];

    const result = computePersonalRecordTimeline("ex-1", sets);

    // July 1: best e1RM = max(80*1.267, 85*1.2) = max(101.33, 102) = 102
    // July 6: best e1RM = 100*1.1 = 110
    // July 10: best e1RM = 90*1.167 = 105
    expect(result).toHaveLength(3);
    expect(result[0].e1rm).toBeCloseTo(102, 0);
    expect(result[1].e1rm).toBeCloseTo(110, 0);
    expect(result[2].e1rm).toBeCloseTo(105, 0);
  });

  it("returns empty array for unknown exercise", () => {
    const sets = [makeSet({ exercise_id: "ex-1" })];
    expect(computePersonalRecordTimeline("unknown", sets)).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(computePersonalRecordTimeline("ex-1", [])).toEqual([]);
  });

  it("sorts chronologically by date", () => {
    const sets = [
      makeSet({ exercise_id: "ex-1", weight_kg: 100, reps: 3, date: "2026-08-01", session_id: "s3" }),
      makeSet({ exercise_id: "ex-1", weight_kg: 80, reps: 8, date: "2026-06-01", session_id: "s1" }),
      makeSet({ exercise_id: "ex-1", weight_kg: 90, reps: 5, date: "2026-07-01", session_id: "s2" }),
    ];

    const result = computePersonalRecordTimeline("ex-1", sets);

    expect(result.map((r) => r.date)).toEqual(["2026-06-01", "2026-07-01", "2026-08-01"]);
  });
});
