import { computeTargetWeight, computeTargetFromConfig } from "../prescription";

// ─── %1RM ─────────────────────────────────────────────────────────────────

describe("computeTargetWeight — one_rm_percent", () => {
  it("calculates target from 1RM percentage", () => {
    const result = computeTargetWeight({
      weightType: "one_rm_percent",
      weightValue: 80,
      exercise1RMKg: 200,
    });
    expect(result.targetKg).toBe(160); // 200 * 0.8
    expect(result.label).toContain("80% 1RM");
    expect(result.warning).toBeUndefined();
  });

  it("rounds to nearest 0.5 kg", () => {
    const result = computeTargetWeight({
      weightType: "one_rm_percent",
      weightValue: 75,
      exercise1RMKg: 183,
    });
    // 183 * 0.75 = 137.25 → rounds to nearest 0.5 = 137.5
    expect(result.targetKg).toBe(137.5);
  });

  it("returns warning when 1RM is null", () => {
    const result = computeTargetWeight({
      weightType: "one_rm_percent",
      weightValue: 80,
      exercise1RMKg: null,
    });
    expect(result.targetKg).toBe(0);
    expect(result.warning).toBe("No 1RM data — enter weight manually");
  });

  it("returns warning when 1RM is 0", () => {
    const result = computeTargetWeight({
      weightType: "one_rm_percent",
      weightValue: 80,
      exercise1RMKg: 0,
    });
    expect(result.targetKg).toBe(0);
    expect(result.warning).toBeDefined();
  });

  it("handles 100% 1RM", () => {
    const result = computeTargetWeight({
      weightType: "one_rm_percent",
      weightValue: 100,
      exercise1RMKg: 150,
    });
    expect(result.targetKg).toBe(150);
  });

  it("handles 50% 1RM for lighter loads", () => {
    const result = computeTargetWeight({
      weightType: "one_rm_percent",
      weightValue: 50,
      exercise1RMKg: 200,
    });
    expect(result.targetKg).toBe(100);
  });
});

// ─── %BW ───────────────────────────────────────────────────────────────────

describe("computeTargetWeight — bw_percent", () => {
  it("calculates target from body weight percentage", () => {
    const result = computeTargetWeight({
      weightType: "bw_percent",
      weightValue: 50,
      userBWKg: 80,
    });
    expect(result.targetKg).toBe(40); // 80 * 0.5
    expect(result.label).toContain("50% BW");
  });

  it("rounds to nearest 0.5 kg", () => {
    const result = computeTargetWeight({
      weightType: "bw_percent",
      weightValue: 63,
      userBWKg: 85,
    });
    // 85 * 0.63 = 53.55 → rounds to 53.5
    expect(result.targetKg).toBe(53.5);
  });

  it("returns warning when BW is missing", () => {
    const result = computeTargetWeight({
      weightType: "bw_percent",
      weightValue: 50,
    });
    expect(result.targetKg).toBe(0);
    expect(result.warning).toBe("No body weight data — enter weight manually");
  });

  it("handles 100% BW", () => {
    const result = computeTargetWeight({
      weightType: "bw_percent",
      weightValue: 100,
      userBWKg: 75,
    });
    expect(result.targetKg).toBe(75);
  });

  it("handles low BW percentage", () => {
    const result = computeTargetWeight({
      weightType: "bw_percent",
      weightValue: 25,
      userBWKg: 100,
    });
    expect(result.targetKg).toBe(25);
  });
});

// ─── Absolute ─────────────────────────────────────────────────────────────

describe("computeTargetWeight — absolute", () => {
  it("returns the absolute value as target", () => {
    const result = computeTargetWeight({
      weightType: "absolute",
      weightValue: 60,
    });
    expect(result.targetKg).toBe(60);
    expect(result.label).toContain("60 kg");
  });

  it("works without any user data", () => {
    const result = computeTargetWeight({
      weightType: "absolute",
      weightValue: 100,
    });
    expect(result.targetKg).toBe(100);
  });

  it("handles decimal values", () => {
    const result = computeTargetWeight({
      weightType: "absolute",
      weightValue: 67.5,
    });
    expect(result.targetKg).toBe(67.5);
  });

  it("no warning for absolute", () => {
    const result = computeTargetWeight({
      weightType: "absolute",
      weightValue: 50,
    });
    expect(result.warning).toBeUndefined();
  });
});

// ─── Difficulty ───────────────────────────────────────────────────────────

describe("computeTargetWeight — difficulty", () => {
  it("maps difficulty 1 to 50% 1RM", () => {
    const result = computeTargetWeight({
      weightType: "difficulty",
      weightValue: 1,
      difficulty1RM: 200,
    });
    expect(result.targetKg).toBe(100); // 200 * 0.5
  });

  it("maps difficulty 10 to 95% 1RM", () => {
    const result = computeTargetWeight({
      weightType: "difficulty",
      weightValue: 10,
      difficulty1RM: 200,
    });
    expect(result.targetKg).toBe(190); // 200 * 0.95
  });

  it("maps difficulty 5 to 70% 1RM", () => {
    const result = computeTargetWeight({
      weightType: "difficulty",
      weightValue: 5,
      difficulty1RM: 200,
    });
    expect(result.targetKg).toBe(140);
  });

  it("clamps values below 1", () => {
    const result = computeTargetWeight({
      weightType: "difficulty",
      weightValue: 0,
      difficulty1RM: 200,
    });
    expect(result.targetKg).toBe(100); // clamped to 1 → 50%
  });

  it("clamps values above 10", () => {
    const result = computeTargetWeight({
      weightType: "difficulty",
      weightValue: 11,
      difficulty1RM: 200,
    });
    expect(result.targetKg).toBe(190); // clamped to 10 → 95%
  });

  it("falls back to exercise1RMKg when difficulty1RM is not provided", () => {
    const result = computeTargetWeight({
      weightType: "difficulty",
      weightValue: 8,
      difficulty1RM: undefined,
      exercise1RMKg: 150,
    });
    // difficulty 8 → 85%, 150 * 0.85 = 127.5
    expect(result.targetKg).toBe(127.5);
  });

  it("returns warning when no 1RM data available", () => {
    const result = computeTargetWeight({
      weightType: "difficulty",
      weightValue: 5,
    });
    expect(result.targetKg).toBe(0);
    expect(result.warning).toBe("No 1RM data — enter weight manually");
  });
});

// ─── computeTargetFromConfig ──────────────────────────────────────────────

describe("computeTargetFromConfig", () => {
  it("returns no-prescription result when config is null", () => {
    const result = computeTargetFromConfig(null, {});
    expect(result.targetKg).toBe(0);
    expect(result.label).toBe("No prescription");
  });

  it("delegates to computeTargetWeight with config values", () => {
    const result = computeTargetFromConfig(
      { weight_type: "one_rm_percent", value: 80 },
      { exercise1RMKg: 200 },
    );
    expect(result.targetKg).toBe(160);
  });

  it("passes userBWKg through to prescription", () => {
    const result = computeTargetFromConfig(
      { weight_type: "bw_percent", value: 50 },
      { userBWKg: 80 },
    );
    expect(result.targetKg).toBe(40);
  });
});
