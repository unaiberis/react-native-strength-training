import {
  calculateE1RM,
  calculateVolume,
  calculateTonnage,
  findBestSetByE1RM,
  findBestSetByVolume,
  detectPRs,
  isTonnagePR,
} from "../pr-calc";

// ─── calculateE1RM ─────────────────────────────────────────────────────────

describe("calculateE1RM", () => {
  it("calculates Epley e1RM for standard inputs", () => {
    // e1RM = 100 × (1 + 5/30) = 100 × 1.1667 = 116.67
    expect(calculateE1RM(100, 5)).toBeCloseTo(116.67, 1);
  });

  it("returns 0 when reps is 0", () => {
    expect(calculateE1RM(100, 0)).toBe(0);
  });

  it("returns 0 when weight is 0", () => {
    expect(calculateE1RM(0, 5)).toBe(0);
  });

  it("returns 0 for negative weight", () => {
    expect(calculateE1RM(-50, 5)).toBe(0);
  });

  it("returns 0 for negative reps", () => {
    expect(calculateE1RM(100, -1)).toBe(0);
  });

  it("calculates e1RM for 1 rep", () => {
    // e1RM = 140 × (1 + 1/30) = 144.67
    expect(calculateE1RM(140, 1)).toBeCloseTo(144.67, 2);
  });

  it("handles heavy weights with many reps", () => {
    // 300kg × (1 + 20/30) = 300 × 1.6667 = 500
    expect(calculateE1RM(300, 20)).toBeCloseTo(500, 0);
  });

  it("handles very light weights", () => {
    expect(calculateE1RM(0.5, 10)).toBeCloseTo(0.5 * (1 + 10 / 30), 5);
  });

  it("handles single rep scenarios correctly", () => {
    // 1 rep at 100kg should give e1RM = 100 × (1 + 1/30) = 103.33
    expect(calculateE1RM(100, 1)).toBeCloseTo(103.33, 2);
  });
});

// ─── calculateVolume ───────────────────────────────────────────────────────

describe("calculateVolume", () => {
  it("calculates volume as weight × reps", () => {
    expect(calculateVolume(100, 5)).toBe(500);
  });

  it("returns 0 when weight is 0", () => {
    expect(calculateVolume(0, 5)).toBe(0);
  });

  it("returns 0 when reps is 0", () => {
    expect(calculateVolume(100, 0)).toBe(0);
  });

  it("returns 0 for negative weight", () => {
    expect(calculateVolume(-10, 5)).toBe(0);
  });

  it("returns 0 for negative reps", () => {
    expect(calculateVolume(100, -1)).toBe(0);
  });

  it("handles decimal weight", () => {
    expect(calculateVolume(67.5, 8)).toBe(540);
  });
});

// ─── calculateTonnage ──────────────────────────────────────────────────────

describe("calculateTonnage", () => {
  it("sums volume across all sets", () => {
    const sets = [
      { weightKg: 100, reps: 5 },
      { weightKg: 100, reps: 5 },
      { weightKg: 100, reps: 5 },
    ];
    expect(calculateTonnage(sets)).toBe(1500);
  });

  it("returns 0 for an empty array", () => {
    expect(calculateTonnage([])).toBe(0);
  });

  it("ignores sets with zero weight", () => {
    const sets = [
      { weightKg: 100, reps: 5 },
      { weightKg: 0, reps: 5 },
      { weightKg: 100, reps: 5 },
    ];
    expect(calculateTonnage(sets)).toBe(1000);
  });

  it("handles a single set", () => {
    expect(calculateTonnage([{ weightKg: 140, reps: 1 }])).toBe(140);
  });

  it("handles varying weights and reps", () => {
    const sets = [
      { weightKg: 60, reps: 10 },
      { weightKg: 80, reps: 8 },
      { weightKg: 100, reps: 5 },
    ];
    expect(calculateTonnage(sets)).toBe(60 * 10 + 80 * 8 + 100 * 5);
  });
});

// ─── findBestSetByE1RM ─────────────────────────────────────────────────────

describe("findBestSetByE1RM", () => {
  it("returns the set with the highest e1RM", () => {
    const sets = [
      { weightKg: 100, reps: 5 },  // e1RM ≈ 116.67
      { weightKg: 80, reps: 10 },  // e1RM ≈ 106.67
      { weightKg: 120, reps: 3 },  // e1RM = 132
    ];
    const result = findBestSetByE1RM(sets);
    expect(result).not.toBeNull();
    expect(result!.weightKg).toBe(120);
    expect(result!.reps).toBe(3);
    expect(result!.e1rm).toBeCloseTo(132, 1);
  });

  it("returns null for empty array", () => {
    expect(findBestSetByE1RM([])).toBeNull();
  });

  it("skips sets with invalid values", () => {
    const sets = [
      { weightKg: 0, reps: 5 },
      { weightKg: 100, reps: 0 },
    ];
    expect(findBestSetByE1RM(sets)).toBeNull();
  });

  it("handles a tie by returning the first encountered", () => {
    const sets = [
      { weightKg: 100, reps: 3 },  // e1RM = 110
      { weightKg: 110, reps: 1 },  // e1RM ≈ 113.67
      { weightKg: 110, reps: 1 },  // e1RM ≈ 113.67 (tie)
    ];
    const result = findBestSetByE1RM(sets);
    // Should return the first with 110x1 since ties go to first
    expect(result!.weightKg).toBe(110);
  });
});

// ─── findBestSetByVolume ───────────────────────────────────────────────────

describe("findBestSetByVolume", () => {
  it("returns the set with the highest volume", () => {
    const sets = [
      { weightKg: 100, reps: 5 },   // volume = 500
      { weightKg: 80, reps: 10 },   // volume = 800
      { weightKg: 120, reps: 3 },   // volume = 360
    ];
    const result = findBestSetByVolume(sets);
    expect(result).not.toBeNull();
    expect(result!.weightKg).toBe(80);
    expect(result!.reps).toBe(10);
    expect(result!.volume).toBe(800);
  });

  it("returns null for empty array", () => {
    expect(findBestSetByVolume([])).toBeNull();
  });

  it("skips sets with zero volume", () => {
    const sets = [
      { weightKg: 0, reps: 5 },
    ];
    expect(findBestSetByVolume(sets)).toBeNull();
  });

  it("prefers higher volume over higher weight", () => {
    const sets = [
      { weightKg: 200, reps: 1 },   // volume = 200
      { weightKg: 100, reps: 8 },   // volume = 800
    ];
    const result = findBestSetByVolume(sets);
    expect(result!.weightKg).toBe(100);
    expect(result!.volume).toBe(800);
  });
});

// ─── detectPRs ─────────────────────────────────────────────────────────────

describe("detectPRs", () => {
  it("detects a new 1RM when a single rep set beats previous best", () => {
    const sets = [{ weightKg: 150, reps: 1 }];
    const result = detectPRs(sets, { oneRepMax: 140 });
    expect(result.newOneRepMax).not.toBeNull();
    expect(result.newOneRepMax!.weightKg).toBe(150);
  });

  it("does not detect 1RM PR when weight does not exceed previous", () => {
    const sets = [{ weightKg: 140, reps: 1 }];
    const result = detectPRs(sets, { oneRepMax: 140 });
    expect(result.newOneRepMax).toBeNull();
  });

  it("does not detect 1RM PR when no single rep set exists", () => {
    const sets = [{ weightKg: 100, reps: 5 }];
    const result = detectPRs(sets);
    expect(result.newOneRepMax).toBeNull();
  });

  it("detects new estimated 1RM based on best e1RM", () => {
    const sets = [
      { weightKg: 100, reps: 5 },  // e1RM ≈ 116.67
      { weightKg: 110, reps: 3 },  // e1RM = 121
    ];
    const result = detectPRs(sets, { estimatedOneRepMax: 115 });
    expect(result.newEstimatedOneRepMax).not.toBeNull();
    expect(result.newEstimatedOneRepMax!.e1rm).toBeCloseTo(121, 1);
  });

  it("does not detect e1RM PR if not higher than previous", () => {
    const sets = [{ weightKg: 100, reps: 5 }]; // e1RM ≈ 116.67
    const result = detectPRs(sets, { estimatedOneRepMax: 120 });
    expect(result.newEstimatedOneRepMax).toBeNull();
  });

  it("detects new best volume set", () => {
    const sets = [{ weightKg: 80, reps: 12 }]; // volume = 960
    const result = detectPRs(sets, { bestVolumeSet: 800 });
    expect(result.newBestVolumeSet).not.toBeNull();
    expect(result.newBestVolumeSet!.volume).toBe(960);
  });

  it("does not detect volume PR if not higher", () => {
    const sets = [{ weightKg: 80, reps: 8 }]; // volume = 640
    const result = detectPRs(sets, { bestVolumeSet: 800 });
    expect(result.newBestVolumeSet).toBeNull();
  });

  it("returns first-time PRs when no previous best given", () => {
    const sets = [{ weightKg: 100, reps: 5 }];
    const result = detectPRs(sets);
    expect(result.newEstimatedOneRepMax).not.toBeNull();
    expect(result.newBestVolumeSet).not.toBeNull();
    expect(result.tonnage).toBe(500);
  });

  it("filters out warmup-style sets (zero weight/reps)", () => {
    const sets = [
      { weightKg: 0, reps: 0 },
      { weightKg: 100, reps: 5 },
    ];
    const result = detectPRs(sets);
    expect(result.tonnage).toBe(500);
    expect(result.newEstimatedOneRepMax).not.toBeNull();
  });

  it("calculates total tonnage correctly", () => {
    const sets = [
      { weightKg: 100, reps: 5 },
      { weightKg: 90, reps: 5 },
    ];
    const result = detectPRs(sets);
    expect(result.tonnage).toBe(950);
  });

  it("returns null for all PR types when sets are empty", () => {
    const result = detectPRs([]);
    expect(result.newOneRepMax).toBeNull();
    expect(result.newEstimatedOneRepMax).toBeNull();
    expect(result.newBestVolumeSet).toBeNull();
    expect(result.tonnage).toBe(0);
  });
});

// ─── isTonnagePR ───────────────────────────────────────────────────────────

describe("isTonnagePR", () => {
  it("returns true when tonnage beats previous best", () => {
    expect(isTonnagePR(5000, 4000)).toBe(true);
  });

  it("returns false when tonnage does not beat previous best", () => {
    expect(isTonnagePR(3000, 4000)).toBe(false);
  });

  it("returns true when no previous best is provided", () => {
    expect(isTonnagePR(3000)).toBe(true);
  });

  it("returns false for zero tonnage", () => {
    expect(isTonnagePR(0, 1000)).toBe(false);
  });

  it("returns false for negative tonnage", () => {
    expect(isTonnagePR(-100, 1000)).toBe(false);
  });
});
