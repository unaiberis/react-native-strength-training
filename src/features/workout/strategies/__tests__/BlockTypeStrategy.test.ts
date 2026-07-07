import type { ExerciseInSession } from "../../../../stores/session-store";
import {
  getBlockTypeStrategy,
  getStrategyForExercise,
  formatTimerLabel,
  getTimerDurationSeconds,
} from "../BlockTypeStrategy";

function makeExercise(overrides: Partial<ExerciseInSession> = {}): ExerciseInSession {
  return {
    exerciseId: "ex-1",
    exerciseName: "Test Exercise",
    targetSets: 3,
    targetReps: 10,
    targetRpeLow: null,
    targetRpeHigh: null,
    restSeconds: 90,
    notes: null,
    blockType: "straight_set",
    prescription: null,
    round: null,
    timerMinutes: null,
    loggedSets: [],
    ...overrides,
  };
}

// ─── Strategy Resolution ─────────────────────────────────────────────────

describe("getBlockTypeStrategy", () => {
  it("returns StraightSetStrategy for straight_set", () => {
    const strategy = getBlockTypeStrategy("straight_set");
    expect(strategy.blockType).toBe("straight_set");
    expect(strategy.displayName).toBe("Straight Set");
    expect(strategy.hasTimer).toBe(false);
    expect(strategy.canAddExtraSets).toBe(false);
    expect(strategy.showRoundCounter).toBe(false);
    expect(strategy.showTimerRemaining).toBe(false);
  });

  it("returns AMRAPStrategy for amrap", () => {
    const strategy = getBlockTypeStrategy("amrap");
    expect(strategy.blockType).toBe("amrap");
    expect(strategy.displayName).toBe("AMRAP");
    expect(strategy.hasTimer).toBe(true);
    expect(strategy.canAddExtraSets).toBe(true);
    expect(strategy.showRoundCounter).toBe(true);
    expect(strategy.showTimerRemaining).toBe(true);
    expect(strategy.showAmrapResult).toBe(true);
  });

  it("returns EMOMStrategy for emom", () => {
    const strategy = getBlockTypeStrategy("emom");
    expect(strategy.blockType).toBe("emom");
    expect(strategy.displayName).toBe("EMOM");
    expect(strategy.hasTimer).toBe(true);
    expect(strategy.canAddExtraSets).toBe(true);
    expect(strategy.showRoundCounter).toBe(true);
    expect(strategy.showTimerRemaining).toBe(false);
  });

  it("returns CircuitStrategy for circuit", () => {
    const strategy = getBlockTypeStrategy("circuit");
    expect(strategy.blockType).toBe("circuit");
    expect(strategy.displayName).toBe("Circuit");
    expect(strategy.hasTimer).toBe(false);
    expect(strategy.canAddExtraSets).toBe(true);
    expect(strategy.showRoundCounter).toBe(true);
  });

  it("falls back to straight_set for unknown block types", () => {
    const strategy = getBlockTypeStrategy("unknown" as any);
    expect(strategy.blockType).toBe("straight_set");
  });
});

// ─── getStrategyForExercise ───────────────────────────────────────────────

describe("getStrategyForExercise", () => {
  it("returns StraightSet for null exercise", () => {
    const strategy = getStrategyForExercise(null);
    expect(strategy.blockType).toBe("straight_set");
  });

  it("returns strategy matching exercise blockType", () => {
    const exercise = makeExercise({ blockType: "amrap" });
    const strategy = getStrategyForExercise(exercise);
    expect(strategy.blockType).toBe("amrap");
  });
});

// ─── getMaxSets ───────────────────────────────────────────────────────────

describe("BlockTypeStrategy.getMaxSets", () => {
  it("straight_set returns targetSets", () => {
    const exercise = makeExercise({ targetSets: 5 });
    const strategy = getBlockTypeStrategy("straight_set");
    expect(strategy.getMaxSets(exercise)).toBe(5);
  });

  it("amrap returns Infinity", () => {
    const exercise = makeExercise({ blockType: "amrap", targetSets: 5 });
    const strategy = getBlockTypeStrategy("amrap");
    expect(strategy.getMaxSets(exercise)).toBe(Infinity);
  });

  it("emom returns Infinity", () => {
    const exercise = makeExercise({ blockType: "emom" });
    const strategy = getBlockTypeStrategy("emom");
    expect(strategy.getMaxSets(exercise)).toBe(Infinity);
  });

  it("circuit returns Infinity", () => {
    const exercise = makeExercise({ blockType: "circuit" });
    const strategy = getBlockTypeStrategy("circuit");
    expect(strategy.getMaxSets(exercise)).toBe(Infinity);
  });
});

// ─── getAdditionalFields ──────────────────────────────────────────────────

describe("BlockTypeStrategy.getAdditionalFields", () => {
  it("straight_set returns empty array", () => {
    expect(getBlockTypeStrategy("straight_set").getAdditionalFields()).toEqual([]);
  });

  it("amrap returns timerRemaining", () => {
    expect(getBlockTypeStrategy("amrap").getAdditionalFields()).toContain("timerRemaining");
  });

  it("emom returns round", () => {
    expect(getBlockTypeStrategy("emom").getAdditionalFields()).toContain("round");
  });

  it("circuit returns round", () => {
    expect(getBlockTypeStrategy("circuit").getAdditionalFields()).toContain("round");
  });
});

// ─── getNextRound ─────────────────────────────────────────────────────────

describe("BlockTypeStrategy.getNextRound", () => {
  it("EMOM returns next round based on logged sets", () => {
    const strategy = getBlockTypeStrategy("emom");
    const exercise = makeExercise({
      blockType: "emom",
      loggedSets: [
        { setNumber: 1, weightKg: 100, reps: 5, rpe: 8, rir: null, isWarmup: false, round: 1, loggedAt: "" },
        { setNumber: 2, weightKg: 100, reps: 5, rpe: 8, rir: null, isWarmup: false, round: 2, loggedAt: "" },
      ],
    });
    expect(strategy.getNextRound(exercise)).toBe(3);
  });

  it("EMOM returns 1 when no sets logged", () => {
    const strategy = getBlockTypeStrategy("emom");
    const exercise = makeExercise({ blockType: "emom" });
    expect(strategy.getNextRound(exercise)).toBe(1);
  });
});

// ─── formatTimerLabel ─────────────────────────────────────────────────────

describe("formatTimerLabel", () => {
  it("formats AMRAP label with timerMinutes", () => {
    const strategy = getBlockTypeStrategy("amrap");
    const exercise = makeExercise({ blockType: "amrap", timerMinutes: 10 });
    expect(formatTimerLabel(strategy, exercise)).toBe("AMRAP 10:00");
  });

  it("formats AMRAP label with default 8:00", () => {
    const strategy = getBlockTypeStrategy("amrap");
    const exercise = makeExercise({ blockType: "amrap" });
    expect(formatTimerLabel(strategy, exercise)).toBe("AMRAP 8:00");
  });

  it("formats EMOM label with timerMinutes", () => {
    const strategy = getBlockTypeStrategy("emom");
    const exercise = makeExercise({ blockType: "emom", timerMinutes: 3 });
    expect(formatTimerLabel(strategy, exercise)).toBe("E3MOM");
  });

  it("returns empty string for straight_set", () => {
    const strategy = getBlockTypeStrategy("straight_set");
    const exercise = makeExercise();
    expect(formatTimerLabel(strategy, exercise)).toBe("");
  });
});

// ─── getTimerDurationSeconds ──────────────────────────────────────────────

describe("getTimerDurationSeconds", () => {
  it("returns timerMinutes * 60 for AMRAP", () => {
    const exercise = makeExercise({ blockType: "amrap", timerMinutes: 8 });
    expect(getTimerDurationSeconds(exercise)).toBe(480);
  });

  it("returns timerMinutes * 60 for EMOM", () => {
    const exercise = makeExercise({ blockType: "emom", timerMinutes: 2 });
    expect(getTimerDurationSeconds(exercise)).toBe(120);
  });

  it("returns null for straight_set", () => {
    const exercise = makeExercise({ blockType: "straight_set" });
    expect(getTimerDurationSeconds(exercise)).toBeNull();
  });

  it("uses default 8 minutes when timerMinutes is null", () => {
    const exercise = makeExercise({ blockType: "amrap", timerMinutes: null });
    expect(getTimerDurationSeconds(exercise)).toBe(480);
  });
});
