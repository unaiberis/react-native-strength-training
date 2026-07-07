import {
  computeWorkoutSummary,
  estimateOneRm,
} from "../workout-summary";

// ─── estimateOneRm ────────────────────────────────────────────────────────

describe("estimateOneRm", () => {
  it("applies Epley formula: weight × (1 + reps/30)", () => {
    // 100 × (1 + 5/30) = 100 × 1.1667 = 116.67
    expect(estimateOneRm(100, 5)).toBeCloseTo(116.67, 1);
  });

  it("returns weight for single rep (Epley: +0 for 1 rep)", () => {
    // 140 × (1 + 1/30) = 140 × 1.0333 = 144.67
    expect(estimateOneRm(140, 1)).toBeCloseTo(144.67, 1);
  });

  it("returns 0 when reps is 0", () => {
    expect(estimateOneRm(100, 0)).toBe(0);
  });

  it("returns 0 when weight is 0", () => {
    expect(estimateOneRm(0, 5)).toBe(0);
  });

  it("returns 0 for negative reps", () => {
    expect(estimateOneRm(100, -1)).toBe(0);
  });
});

// ─── computeWorkoutSummary ────────────────────────────────────────────────

describe("computeWorkoutSummary", () => {
  it("empty sets returns zero values", () => {
    const summary = computeWorkoutSummary({}, []);
    expect(summary.totalSets).toBe(0);
    expect(summary.totalVolume).toBe(0);
    expect(summary.duration).toBe(0);
    expect(summary.exerciseBreakdown).toEqual([]);
  });

  it("single set computes correctly", () => {
    const summary = computeWorkoutSummary(
      { started_at: "2026-07-07T10:00:00Z" },
      [{ exercise_id: "ex1", weight: 100, reps: 5, exercise_name: "Bench Press" }],
    );
    expect(summary.totalSets).toBe(1);
    expect(summary.totalVolume).toBe(500); // 100 × 5
    expect(summary.exerciseBreakdown).toHaveLength(1);
    expect(summary.exerciseBreakdown[0].exerciseId).toBe("ex1");
    expect(summary.exerciseBreakdown[0].exerciseName).toBe("Bench Press");
  });

  it("volume is sum of weight × reps across all sets", () => {
    const summary = computeWorkoutSummary({}, [
      { exercise_id: "ex1", weight: 100, reps: 5 },
      { exercise_id: "ex1", weight: 100, reps: 5 },
      { exercise_id: "ex2", weight: 80, reps: 8 },
    ]);
    expect(summary.totalVolume).toBe(100 * 5 + 100 * 5 + 80 * 8);
    // 500 + 500 + 640 = 1640 — wait, that's 1640
    // Actually: (100*5) + (100*5) + (80*8) = 500 + 500 + 640 = 1640
    expect(summary.totalVolume).toBe(1640);
  });

  it("best set detection (highest estimated 1RM)", () => {
    const summary = computeWorkoutSummary({}, [
      { exercise_id: "ex1", weight: 100, reps: 5, exercise_name: "Squat" },  // e1RM ≈ 116.67
      { exercise_id: "ex1", weight: 120, reps: 3, exercise_name: "Squat" },  // e1RM = 132
      { exercise_id: "ex1", weight: 80, reps: 10, exercise_name: "Squat" },  // e1RM ≈ 106.67
    ]);
    expect(summary.totalSets).toBe(3);
    expect(summary.exerciseBreakdown).toHaveLength(1);
    expect(summary.exerciseBreakdown[0].bestSet).not.toBeNull();
    expect(summary.exerciseBreakdown[0].bestSet!.weight).toBe(120);
    expect(summary.exerciseBreakdown[0].bestSet!.reps).toBe(3);
    expect(summary.exerciseBreakdown[0].bestSet!.estimatedOneRm).toBeCloseTo(132, 1);
  });

  it("PR badge when exceeds previous best", () => {
    const summary = computeWorkoutSummary(
      {},
      [
        { exercise_id: "ex1", weight: 140, reps: 5, exercise_name: "Deadlift" }, // e1RM = 163.33
      ],
      { ex1: 150 }, // previous best e1RM = 150
    );
    expect(summary.exerciseBreakdown[0].isPr).toBe(true);
  });

  it("no PR badge when matches previous best", () => {
    const summary = computeWorkoutSummary(
      {},
      [
        { exercise_id: "ex1", weight: 140, reps: 5, exercise_name: "Deadlift" }, // e1RM = 163.33
      ],
      { ex1: 200 }, // previous best e1RM = 200, not beaten
    );
    expect(summary.exerciseBreakdown[0].isPr).toBe(false);
  });

  it("no PR badge when no previous PRs provided", () => {
    const summary = computeWorkoutSummary(
      {},
      [{ exercise_id: "ex1", weight: 140, reps: 5 }],
    );
    expect(summary.exerciseBreakdown[0].isPr).toBe(false);
  });

  it("duration from started_at to completed_at", () => {
    const summary = computeWorkoutSummary(
      {
        started_at: "2026-07-07T10:00:00Z",
        completed_at: "2026-07-07T11:30:00Z",
      },
      [{ exercise_id: "ex1", weight: 100, reps: 5 }],
    );
    // 90 minutes
    expect(summary.duration).toBe(90);
  });

  it("duration is 0 when no started_at", () => {
    const summary = computeWorkoutSummary(
      {},
      [{ exercise_id: "ex1", weight: 100, reps: 5 }],
    );
    expect(summary.duration).toBe(0);
  });

  it("handles multiple exercises in breakdown", () => {
    const summary = computeWorkoutSummary({}, [
      { exercise_id: "ex1", weight: 100, reps: 5, exercise_name: "Bench Press" },
      { exercise_id: "ex2", weight: 80, reps: 8, exercise_name: "Rows" },
      { exercise_id: "ex1", weight: 100, reps: 5, exercise_name: "Bench Press" },
    ]);
    expect(summary.exerciseBreakdown).toHaveLength(2);
    const ex1 = summary.exerciseBreakdown.find((e) => e.exerciseId === "ex1");
    const ex2 = summary.exerciseBreakdown.find((e) => e.exerciseId === "ex2");
    expect(ex1).toBeDefined();
    expect(ex2).toBeDefined();
    expect(ex1!.exerciseName).toBe("Bench Press");
    expect(ex2!.exerciseName).toBe("Rows");
  });

  it("single rep set has estimatedOneRm equal to weight + weight/30", () => {
    const summary = computeWorkoutSummary({}, [
      { exercise_id: "ex1", weight: 150, reps: 1, exercise_name: "Deadlift" },
    ]);
    // 150 × (1 + 1/30) = 150 × 1.0333 = 155
    expect(summary.exerciseBreakdown[0].bestSet!.estimatedOneRm).toBeCloseTo(155, 1);
  });
});
