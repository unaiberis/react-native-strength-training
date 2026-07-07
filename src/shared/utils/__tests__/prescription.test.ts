import {
  computeTargetWeight,
  computeTargetFromConfig,
} from "../prescription";

// ─── computeTargetWeight ──────────────────────────────────────────────────

describe("computeTargetWeight", () => {
  describe("absolute", () => {
    it("returns value as kg", () => {
      const result = computeTargetWeight("absolute", 80);
      expect(result.targetKg).toBe(80);
      expect(result.label).toBe("80 kg");
      expect(result.warning).toBeUndefined();
    });

    it("handles decimal values", () => {
      const result = computeTargetWeight("absolute", 67.5);
      expect(result.targetKg).toBe(67.5);
      expect(result.label).toBe("67.5 kg");
    });

    it("handles zero", () => {
      const result = computeTargetWeight("absolute", 0);
      expect(result.targetKg).toBe(0);
      expect(result.label).toBe("0 kg");
    });
  });

  describe("bw_percent", () => {
    it("computes correct percentage of body weight", () => {
      const result = computeTargetWeight("bw_percent", 50, { bodyWeightKg: 80 });
      expect(result.targetKg).toBe(40);
      expect(result.label).toContain("50% BW");
    });

    it("rounds to nearest 0.5 kg", () => {
      const result = computeTargetWeight("bw_percent", 33, { bodyWeightKg: 80 });
      // 33% of 80 = 26.4 → rounds to 26.5
      expect(result.targetKg).toBe(26.5);
    });

    it("returns warning when body weight is missing", () => {
      const result = computeTargetWeight("bw_percent", 50);
      expect(result.targetKg).toBe(0);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("body weight");
    });

    it("returns warning when body weight is zero", () => {
      const result = computeTargetWeight("bw_percent", 50, { bodyWeightKg: 0 });
      expect(result.targetKg).toBe(0);
      expect(result.warning).toBeDefined();
    });

    it("returns warning when body weight is negative", () => {
      const result = computeTargetWeight("bw_percent", 50, { bodyWeightKg: -10 });
      expect(result.targetKg).toBe(0);
      expect(result.warning).toBeDefined();
    });
  });

  describe("one_rm_percent", () => {
    it("computes correct percentage of 1RM", () => {
      const result = computeTargetWeight("one_rm_percent", 80, { oneRmKg: 200 });
      expect(result.targetKg).toBe(160);
      expect(result.label).toContain("80% 1RM");
    });

    it("rounds to nearest 0.5 kg", () => {
      const result = computeTargetWeight("one_rm_percent", 67, { oneRmKg: 200 });
      // 67% of 200 = 134 → already .0
      expect(result.targetKg).toBe(134);
    });

    it("returns warning when 1RM is missing", () => {
      const result = computeTargetWeight("one_rm_percent", 80);
      expect(result.targetKg).toBe(0);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("1RM");
    });

    it("returns warning when 1RM is zero", () => {
      const result = computeTargetWeight("one_rm_percent", 80, { oneRmKg: 0 });
      expect(result.targetKg).toBe(0);
      expect(result.warning).toBeDefined();
    });

    it("returns warning when 1RM is negative", () => {
      const result = computeTargetWeight("one_rm_percent", 80, { oneRmKg: -50 });
      expect(result.targetKg).toBe(0);
      expect(result.warning).toBeDefined();
    });
  });

  describe("difficulty (RPE)", () => {
    it("maps difficulty 1 to 50% of 1RM", () => {
      const result = computeTargetWeight("difficulty", 1, { oneRmKg: 200 });
      expect(result.targetKg).toBe(100); // 50%
      expect(result.label).toContain("Difficulty 1/10");
    });

    it("maps difficulty 10 to 95% of 1RM", () => {
      const result = computeTargetWeight("difficulty", 10, { oneRmKg: 200 });
      expect(result.targetKg).toBe(190); // 95%
      expect(result.label).toContain("Difficulty 10/10");
    });

    it("maps difficulty 5 to 70% of 1RM", () => {
      const result = computeTargetWeight("difficulty", 5, { oneRmKg: 200 });
      expect(result.targetKg).toBe(140); // 70%
    });

    it("rounds difficulty value to nearest integer", () => {
      const result = computeTargetWeight("difficulty", 3.7, { oneRmKg: 200 });
      // 3.7 rounds to 4 → 65%
      expect(result.targetKg).toBe(130); // 65% of 200
    });

    it("clamps difficulty values below 1", () => {
      const result = computeTargetWeight("difficulty", 0, { oneRmKg: 200 });
      // clamped to 1 → 50%
      expect(result.targetKg).toBe(100);
    });

    it("clamps difficulty values above 10", () => {
      const result = computeTargetWeight("difficulty", 12, { oneRmKg: 200 });
      // clamped to 10 → 95%
      expect(result.targetKg).toBe(190);
    });

    it("returns warning when 1RM is missing for difficulty", () => {
      const result = computeTargetWeight("difficulty", 7);
      expect(result.targetKg).toBe(0);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("1RM");
    });
  });
});

// ─── computeTargetFromConfig ──────────────────────────────────────────────

describe("computeTargetFromConfig", () => {
  it("delegates to computeTargetWeight for absolute config", () => {
    const config = { type: "absolute" as const, value: 50 };
    const result = computeTargetFromConfig(config);
    expect(result.targetKg).toBe(50);
    expect(result.label).toBe("50 kg");
  });

  it("delegates to computeTargetWeight for bw_percent config", () => {
    const config = { type: "bw_percent" as const, value: 50 };
    const result = computeTargetFromConfig(config, { bodyWeightKg: 80 });
    expect(result.targetKg).toBe(40);
  });

  it("delegates to computeTargetWeight for one_rm_percent config", () => {
    const config = { type: "one_rm_percent" as const, value: 80 };
    const result = computeTargetFromConfig(config, { oneRmKg: 200 });
    expect(result.targetKg).toBe(160);
  });

  it("delegates to computeTargetWeight for difficulty config", () => {
    const config = { type: "difficulty" as const, value: 7 };
    const result = computeTargetFromConfig(config, { oneRmKg: 200 });
    expect(result.targetKg).toBe(160); // difficulty 7 → 80% of 200 = 160
  });

  it("returns empty result for null config", () => {
    const result = computeTargetFromConfig(null, {});
    expect(result.targetKg).toBe(0);
    expect(result.label).toBe("No prescription");
  });
});
