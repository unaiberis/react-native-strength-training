import { validateSelfAssessment } from "../useSelfAssessment";

describe("validateSelfAssessment", () => {
  it("returns valid=true when all fields are valid integers in range", () => {
    const result = validateSelfAssessment({
      sessionRpe: 7,
      sleepQuality: 4,
      fatigue: 3,
      soreness: 2,
      mood: 5,
    });

    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("returns valid=true for all boundary values (min/max)", () => {
    const result = validateSelfAssessment({
      sessionRpe: 1,
      sleepQuality: 1,
      fatigue: 1,
      soreness: 1,
      mood: 1,
    });

    expect(result.valid).toBe(true);

    const result2 = validateSelfAssessment({
      sessionRpe: 10,
      sleepQuality: 5,
      fatigue: 5,
      soreness: 5,
      mood: 5,
    });

    expect(result2.valid).toBe(true);
  });

  it("rejects sessionRpe out of range (below 1)", () => {
    const result = validateSelfAssessment({
      sessionRpe: 0,
      sleepQuality: 3,
      fatigue: 3,
      soreness: 3,
      mood: 3,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.sessionRpe).toBeDefined();
  });

  it("rejects sessionRpe above 10", () => {
    const result = validateSelfAssessment({
      sessionRpe: 11,
      sleepQuality: 3,
      fatigue: 3,
      soreness: 3,
      mood: 3,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.sessionRpe).toBeDefined();
  });

  it("rejects sessionRpe with non-integer (decimal) value", () => {
    const result = validateSelfAssessment({
      sessionRpe: 5.5,
      sleepQuality: 3,
      fatigue: 3,
      soreness: 3,
      mood: 3,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.sessionRpe).toBeDefined();
  });

  it("rejects sleepQuality out of range (above 5)", () => {
    const result = validateSelfAssessment({
      sessionRpe: 5,
      sleepQuality: 6,
      fatigue: 3,
      soreness: 3,
      mood: 3,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.sleepQuality).toBeDefined();
  });

  it("rejects fatigue out of range (below 1)", () => {
    const result = validateSelfAssessment({
      sessionRpe: 5,
      sleepQuality: 3,
      fatigue: 0,
      soreness: 3,
      mood: 3,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.fatigue).toBeDefined();
  });

  it("rejects soreness out of range (above 5)", () => {
    const result = validateSelfAssessment({
      sessionRpe: 5,
      sleepQuality: 3,
      fatigue: 3,
      soreness: 6,
      mood: 3,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.soreness).toBeDefined();
  });

  it("rejects mood out of range (below 1)", () => {
    const result = validateSelfAssessment({
      sessionRpe: 5,
      sleepQuality: 3,
      fatigue: 3,
      soreness: 3,
      mood: 0,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.mood).toBeDefined();
  });

  it("requires all fields — empty input produces errors for all 5 fields", () => {
    const result = validateSelfAssessment({});

    expect(result.valid).toBe(false);
    expect(result.errors.sessionRpe).toBeDefined();
    expect(result.errors.sleepQuality).toBeDefined();
    expect(result.errors.fatigue).toBeDefined();
    expect(result.errors.soreness).toBeDefined();
    expect(result.errors.mood).toBeDefined();
  });

  it("reports multiple errors when several fields are invalid", () => {
    const result = validateSelfAssessment({
      sessionRpe: 0,
      sleepQuality: 6,
      fatigue: 0,
      soreness: 6,
      mood: 0,
    });

    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).length).toBe(5);
  });

  it("accepts partial input but marks missing fields as errors", () => {
    const result = validateSelfAssessment({
      sessionRpe: 5,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.sessionRpe).toBeUndefined();
    expect(result.errors.sleepQuality).toBeDefined();
    expect(result.errors.fatigue).toBeDefined();
    expect(result.errors.soreness).toBeDefined();
    expect(result.errors.mood).toBeDefined();
  });
});
