import { computeWorkoutSummary } from "../workout-summary";
import type { LoggedSet } from "../../../stores/session-store";

// ─── Fixtures ────────────────────────────────────────────────────────────

function makeLoggedSet(overrides: Partial<LoggedSet> & { weightKg: number; reps: number }): LoggedSet {
  return {
    setNumber: 1,
    rpe: null,
    rir: null,
    isWarmup: false,
    tempo: null,
    round: null,
    timerRemaining: null,
    loggedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("computeWorkoutSummary", () => {
  it("returns zeros for empty exercises", () => {
    const result = computeWorkoutSummary([], null);

    expect(result.totalSets).toBe(0);
    expect(result.totalExercises).toBe(0);
    expect(result.completedExercises).toBe(0);
    expect(result.durationMinutes).toBe(0);
    expect(result.totalVolume).toBe(0);
    expect(result.exerciseSummaries).toEqual([]);
  });

  it("returns zeros when startedAt is null", () => {
    const exercises = [
      {
        exerciseId: "ex-1",
        exerciseName: "Bench Press",
        targetSets: 3,
        loggedSets: [] as LoggedSet[],
      },
    ];

    const result = computeWorkoutSummary(exercises, null);

    expect(result.totalExercises).toBe(1);
    expect(result.totalSets).toBe(0);
    expect(result.durationMinutes).toBe(0);
    expect(result.totalVolume).toBe(0);
  });

  it("computes total sets and completed exercises count", () => {
    const exercises = [
      {
        exerciseId: "ex-1",
        exerciseName: "Bench Press",
        targetSets: 3,
        loggedSets: [
          makeLoggedSet({ setNumber: 1, weightKg: 80, reps: 10 }),
          makeLoggedSet({ setNumber: 2, weightKg: 80, reps: 8 }),
        ],
      },
      {
        exerciseId: "ex-2",
        exerciseName: "Squat",
        targetSets: 4,
        loggedSets: [
          makeLoggedSet({ setNumber: 1, weightKg: 100, reps: 5 }),
        ],
      },
      {
        exerciseId: "ex-3",
        exerciseName: "Pull Up",
        targetSets: 3,
        loggedSets: [] as LoggedSet[],
      },
    ];

    const result = computeWorkoutSummary(exercises, "2026-07-06T12:00:00.000Z");

    expect(result.totalSets).toBe(3);
    expect(result.completedExercises).toBe(2);
    expect(result.totalExercises).toBe(3);
  });

  it("computes total volume (tonnage) correctly", () => {
    const exercises = [
      {
        exerciseId: "ex-1",
        exerciseName: "Bench Press",
        targetSets: 3,
        loggedSets: [
          makeLoggedSet({ setNumber: 1, weightKg: 80, reps: 10 }),
          makeLoggedSet({ setNumber: 2, weightKg: 80, reps: 8 }),
        ],
      },
      {
        exerciseId: "ex-2",
        exerciseName: "Squat",
        targetSets: 4,
        loggedSets: [
          makeLoggedSet({ setNumber: 1, weightKg: 100, reps: 5 }),
          makeLoggedSet({ setNumber: 2, weightKg: 110, reps: 3 }),
        ],
      },
    ];

    const result = computeWorkoutSummary(exercises, null);

    // Bench: 80*10 + 80*8 = 1440
    // Squat: 100*5 + 110*3 = 830
    // Total: 1440 + 830 = 2270
    expect(result.totalVolume).toBe(2270);
  });

  it("finds best set by e1RM for each exercise", () => {
    const exercises = [
      {
        exerciseId: "ex-1",
        exerciseName: "Bench Press",
        targetSets: 3,
        loggedSets: [
          makeLoggedSet({ setNumber: 1, weightKg: 80, reps: 10 }),
          makeLoggedSet({ setNumber: 2, weightKg: 90, reps: 5 }),
          makeLoggedSet({ setNumber: 3, weightKg: 70, reps: 12 }),
        ],
      },
    ];

    const result = computeWorkoutSummary(exercises, null);
    const bench = result.exerciseSummaries[0];

    expect(bench.bestSet).not.toBeNull();
    // Best set should be set 1 (80kg × 10 reps = e1rm 106.7)
    expect(bench.bestSet!.weightKg).toBe(80);
    expect(bench.bestSet!.reps).toBe(10);
    expect(bench.bestSet!.e1rm).toBeCloseTo(106.7, 1);
  });

  it("returns null bestSet when all sets have zero weight or reps", () => {
    const exercises = [
      {
        exerciseId: "ex-1",
        exerciseName: "Bench Press",
        targetSets: 3,
        loggedSets: [
          makeLoggedSet({ setNumber: 1, weightKg: 0, reps: 0 }),
        ],
      },
    ];

    const result = computeWorkoutSummary(exercises, null);

    expect(result.exerciseSummaries[0].bestSet).toBeNull();
    expect(result.exerciseSummaries[0].tonnage).toBe(0);
  });

  it("computes per-exercise tonnage correctly", () => {
    const exercises = [
      {
        exerciseId: "ex-1",
        exerciseName: "Deadlift",
        targetSets: 3,
        loggedSets: [
          makeLoggedSet({ setNumber: 1, weightKg: 140, reps: 5 }),
          makeLoggedSet({ setNumber: 2, weightKg: 150, reps: 3 }),
          makeLoggedSet({ setNumber: 3, weightKg: 160, reps: 1 }),
        ],
      },
    ];

    const result = computeWorkoutSummary(exercises, null);
    const dl = result.exerciseSummaries[0];

    // 140*5 + 150*3 + 160*1 = 700 + 450 + 160 = 1310
    expect(dl.tonnage).toBe(1310);
  });

  it("handles partial data gracefully (some sets have zero data)", () => {
    const exercises = [
      {
        exerciseId: "ex-1",
        exerciseName: "Bench Press",
        targetSets: 3,
        loggedSets: [
          makeLoggedSet({ setNumber: 1, weightKg: 80, reps: 10 }),
          makeLoggedSet({ setNumber: 2, weightKg: 0, reps: 0 }),
          makeLoggedSet({ setNumber: 3, weightKg: 85, reps: 8 }),
        ],
      },
    ];

    const result = computeWorkoutSummary(exercises, null);
    const bench = result.exerciseSummaries[0];

    // Volume should only count valid sets: 80*10 + 85*8 = 800 + 680 = 1480
    expect(bench.tonnage).toBe(1480);

    // Best set should be the one with highest e1rm among valid sets
    // Set1: e1rm = 80*(1+10/30) = 106.67
    // Set3: e1rm = 85*(1+8/30) = 107.67
    expect(bench.bestSet).not.toBeNull();
    expect(bench.bestSet!.weightKg).toBe(85);
    expect(bench.bestSet!.reps).toBe(8);
  });

  it("includes correct metadata in ExerciseSummary", () => {
    const exercises = [
      {
        exerciseId: "ex-1",
        exerciseName: "Squat",
        targetSets: 5,
        loggedSets: [
          makeLoggedSet({ setNumber: 1, weightKg: 100, reps: 5 }),
        ],
      },
    ];

    const result = computeWorkoutSummary(exercises, null);
    const squat = result.exerciseSummaries[0];

    expect(squat.exerciseId).toBe("ex-1");
    expect(squat.exerciseName).toBe("Squat");
    expect(squat.loggedSets).toBe(1);
    expect(squat.targetSets).toBe(5);
    expect(squat.bestSet).not.toBeNull();
    expect(squat.tonnage).toBe(500);
  });
});
