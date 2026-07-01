import { setEntrySchema, logSetSchema, completeSessionSchema } from "../set";

// ─── setEntrySchema ────────────────────────────────────────────────────────

describe("setEntrySchema", () => {
  it("accepts valid set entry", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      rpe: 8,
      rir: 2,
      isWarmup: false,
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults for weight and reps", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weightKg).toBe(0);
      expect(result.data.reps).toBe(1);
      expect(result.data.isWarmup).toBe(false);
    }
  });

  it("rejects setNumber below 1", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 0,
      weightKg: 100,
      reps: 8,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative weight", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: -1,
      reps: 8,
    });
    expect(result.success).toBe(false);
  });

  it("rejects weight over 9999.99", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 10000,
      reps: 8,
    });
    expect(result.success).toBe(false);
  });

  it("rejects reps above 999", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 1000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative reps", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid RPE values", () => {
    // RPE must be between 1 and 10, and multiple of 0.5
    const valid = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      rpe: 6.5,
    });
    expect(valid.success).toBe(true);

    const invalid = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      rpe: 6.3, // not a multiple of 0.5
    });
    expect(invalid.success).toBe(false);
  });

  it("rejects RPE below 1", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      rpe: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects RPE above 10", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      rpe: 10.5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts null rpe and rir", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      rpe: null,
      rir: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects RIR above 10", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      rir: 11,
    });
    expect(result.success).toBe(false);
  });

  it("accepts 0 as valid weight (bodyweight exercise)", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 0,
      reps: 15,
    });
    expect(result.success).toBe(true);
  });

  // ─── tempo field ────────────────────────────────────────────────

  it("accepts valid tempo string", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      tempo: "2020",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tempo).toBe("2020");
    }
  });

  it("rejects 2-digit tempo (too short)", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      tempo: "20",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric tempo", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      tempo: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects 5-digit tempo string", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      tempo: "20201",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null tempo", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      tempo: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tempo).toBeNull();
    }
  });

  it("accepts 3-digit tempo", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      tempo: "301",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tempo).toBe("301");
    }
  });

  it("accepts '0000' as valid tempo", () => {
    const result = setEntrySchema.safeParse({
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      tempo: "0000",
    });
    expect(result.success).toBe(true);
  });
});

// ─── logSetSchema ──────────────────────────────────────────────────────────

describe("logSetSchema", () => {
  it("accepts valid logSet input", () => {
    const result = logSetSchema.safeParse({
      workoutSessionId: "550e8400-e29b-41d4-a716-446655440000",
      exerciseId: "550e8400-e29b-41d4-a716-446655440001",
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      rpe: 8,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID session ID", () => {
    const result = logSetSchema.safeParse({
      workoutSessionId: "bad-id",
      exerciseId: "550e8400-e29b-41d4-a716-446655440001",
      setNumber: 1,
      weightKg: 100,
      reps: 8,
    });
    expect(result.success).toBe(false);
  });

  it("rejects weight of NaN", () => {
    const result = logSetSchema.safeParse({
      workoutSessionId: "550e8400-e29b-41d4-a716-446655440000",
      exerciseId: "550e8400-e29b-41d4-a716-446655440001",
      setNumber: 1,
      weightKg: "not-a-number",
      reps: 8,
    });
    expect(result.success).toBe(false);
  });
});

// ─── completeSessionSchema ─────────────────────────────────────────────────

describe("completeSessionSchema", () => {
  it("accepts valid session completion", () => {
    const result = completeSessionSchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      notes: "Great workout!",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null notes", () => {
    const result = completeSessionSchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID session id", () => {
    const result = completeSessionSchema.safeParse({
      sessionId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects notes over 2000 characters", () => {
    const result = completeSessionSchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      notes: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});
