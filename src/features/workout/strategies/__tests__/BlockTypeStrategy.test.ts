import {
  getBlockTypeStrategy,
  type BlockType,
  type BlockConfig,
  type BlockTypeStrategy,
} from "../BlockTypeStrategy";

// ─── Factory ──────────────────────────────────────────────────────────────

describe("getBlockTypeStrategy", () => {
  it("returns StraightSetStrategy for straight_set", () => {
    const strategy = getBlockTypeStrategy("straight_set");
    expect(strategy.shouldAutoStop()).toBe(false);
  });

  it("returns AMRAPStrategy for amrap", () => {
    const strategy = getBlockTypeStrategy("amrap");
    expect(strategy.shouldAutoStop()).toBe(true);
  });

  it("returns EMOMStrategy for emom", () => {
    const strategy = getBlockTypeStrategy("emom");
    expect(strategy.getAdditionalFields()).toContain("round");
  });

  it("returns CircuitStrategy for circuit", () => {
    const strategy = getBlockTypeStrategy("circuit");
    expect(strategy.getAdditionalFields()).toContain("round");
  });
});

// ─── StraightSet ──────────────────────────────────────────────────────────

describe("StraightSetStrategy", () => {
  const strategy = getBlockTypeStrategy("straight_set");

  it("max sets from config rounds", () => {
    const config: BlockConfig = { blockType: "straight_set", rounds: 4 };
    expect(strategy.getMaxSets(config)).toBe(4);
  });

  it("default max sets is 3 when rounds not specified", () => {
    const config: BlockConfig = { blockType: "straight_set" };
    expect(strategy.getMaxSets(config)).toBe(3);
  });

  it("no extra fields", () => {
    expect(strategy.getAdditionalFields()).toEqual([]);
  });

  it("no auto-stop", () => {
    expect(strategy.shouldAutoStop()).toBe(false);
  });

  it("validates negative reps", () => {
    const error = strategy.validateSet({ reps: -1, weight: 100 });
    expect(error).not.toBeNull();
    expect(error).toContain("Reps");
  });

  it("validates negative weight", () => {
    const error = strategy.validateSet({ reps: 5, weight: -10 });
    expect(error).not.toBeNull();
    expect(error).toContain("Weight");
  });

  it("passes valid set", () => {
    expect(strategy.validateSet({ reps: 5, weight: 100 })).toBeNull();
  });

  it("passes empty set (no validation needed)", () => {
    expect(strategy.validateSet({})).toBeNull();
  });
});

// ─── AMRAP ────────────────────────────────────────────────────────────────

describe("AMRAPStrategy", () => {
  const strategy = getBlockTypeStrategy("amrap");

  it("no max sets limit (Infinity)", () => {
    const config: BlockConfig = { blockType: "amrap", timerMinutes: 8 };
    expect(strategy.getMaxSets(config)).toBe(Infinity);
  });

  it("extra timerRemaining field", () => {
    expect(strategy.getAdditionalFields()).toEqual(["timerRemaining"]);
  });

  it("auto-stops when timer hits 0", () => {
    expect(strategy.shouldAutoStop()).toBe(true);
  });

  it("round increments normally", () => {
    expect(strategy.getNextRound(1, { blockType: "amrap" })).toBe(2);
    expect(strategy.getNextRound(5, { blockType: "amrap" })).toBe(6);
  });
});

// ─── EMOM ─────────────────────────────────────────────────────────────────

describe("EMOMStrategy", () => {
  const strategy = getBlockTypeStrategy("emom");

  it("no max sets limit (Infinity)", () => {
    const config: BlockConfig = { blockType: "emom", timerMinutes: 10, rounds: 10 };
    expect(strategy.getMaxSets(config)).toBe(Infinity);
  });

  it("has round tracking field", () => {
    expect(strategy.getAdditionalFields()).toEqual(["round"]);
  });

  it("auto-stops when rounds done", () => {
    expect(strategy.shouldAutoStop()).toBe(true);
  });

  it("validates round field", () => {
    const error = strategy.validateSet({ reps: 5, round: 0 });
    expect(error).not.toBeNull();
    expect(error).toContain("Round");
  });

  it("validates valid round", () => {
    expect(strategy.validateSet({ reps: 5, round: 1 })).toBeNull();
  });
});

// ─── Circuit ──────────────────────────────────────────────────────────────

describe("CircuitStrategy", () => {
  const strategy = getBlockTypeStrategy("circuit");

  it("no max sets, cycles exercises", () => {
    const config: BlockConfig = { blockType: "circuit", rounds: 3, exercises: ["ex1", "ex2", "ex3"] };
    expect(strategy.getMaxSets(config)).toBe(Infinity);
  });

  it("has round tracking field", () => {
    expect(strategy.getAdditionalFields()).toEqual(["round"]);
  });

  it("no auto-stop", () => {
    expect(strategy.shouldAutoStop()).toBe(false);
  });

  it("round increments when completing exercises in cycle", () => {
    expect(strategy.getNextRound(1, { blockType: "circuit" })).toBe(2);
  });
});

// ─── Edge Cases ───────────────────────────────────────────────────────────

describe("BlockTypeStrategy edge cases", () => {
  it("all strategies have correct shouldAutoStop behavior", () => {
    const types: { type: BlockType; autoStop: boolean }[] = [
      { type: "straight_set", autoStop: false },
      { type: "amrap", autoStop: true },
      { type: "emom", autoStop: true },
      { type: "circuit", autoStop: false },
    ];

    for (const { type, autoStop } of types) {
      expect(getBlockTypeStrategy(type).shouldAutoStop()).toBe(autoStop);
    }
  });

  it("all strategies return at least empty additional fields", () => {
    const types: BlockType[] = ["straight_set", "amrap", "emom", "circuit"];
    for (const type of types) {
      const fields = getBlockTypeStrategy(type).getAdditionalFields();
      expect(Array.isArray(fields)).toBe(true);
    }
  });
});
