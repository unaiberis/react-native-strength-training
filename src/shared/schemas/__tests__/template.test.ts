import { workoutTemplateSchema, templateExerciseSchema } from "../template";

// ─── templateExerciseSchema ────────────────────────────────────────────────

describe("templateExerciseSchema", () => {
  it("accepts valid exercise config", () => {
    const result = templateExerciseSchema.safeParse({
      exerciseId: "550e8400-e29b-41d4-a716-446655440000",
      sortOrder: 0,
      targetSets: 3,
      targetReps: 10,
      restSeconds: 90,
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults for optional fields", () => {
    const result = templateExerciseSchema.safeParse({
      exerciseId: "550e8400-e29b-41d4-a716-446655440000",
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetSets).toBe(3);
      expect(result.data.targetReps).toBe(10);
      expect(result.data.restSeconds).toBe(90);
    }
  });

  it("rejects invalid exerciseId (not UUID)", () => {
    const result = templateExerciseSchema.safeParse({
      exerciseId: "not-a-uuid",
      sortOrder: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects targetSets at 0 (min is 1)", () => {
    const result = templateExerciseSchema.safeParse({
      exerciseId: "550e8400-e29b-41d4-a716-446655440000",
      sortOrder: 0,
      targetSets: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects targetSets above 20", () => {
    const result = templateExerciseSchema.safeParse({
      exerciseId: "550e8400-e29b-41d4-a716-446655440000",
      sortOrder: 0,
      targetSets: 21,
    });
    expect(result.success).toBe(false);
  });

  it("rejects targetReps at 0", () => {
    const result = templateExerciseSchema.safeParse({
      exerciseId: "550e8400-e29b-41d4-a716-446655440000",
      sortOrder: 0,
      targetReps: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects targetReps above 100", () => {
    const result = templateExerciseSchema.safeParse({
      exerciseId: "550e8400-e29b-41d4-a716-446655440000",
      sortOrder: 0,
      targetReps: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative sort order", () => {
    const result = templateExerciseSchema.safeParse({
      exerciseId: "550e8400-e29b-41d4-a716-446655440000",
      sortOrder: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional RPE low/high values", () => {
    const result = templateExerciseSchema.safeParse({
      exerciseId: "550e8400-e29b-41d4-a716-446655440000",
      sortOrder: 0,
      targetRpeLow: 6,
      targetRpeHigh: 8,
    });
    expect(result.success).toBe(true);
  });

  it("rejects RPE below 1", () => {
    const result = templateExerciseSchema.safeParse({
      exerciseId: "550e8400-e29b-41d4-a716-446655440000",
      sortOrder: 0,
      targetRpeLow: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects RPE above 10", () => {
    const result = templateExerciseSchema.safeParse({
      exerciseId: "550e8400-e29b-41d4-a716-446655440000",
      sortOrder: 0,
      targetRpeHigh: 11,
    });
    expect(result.success).toBe(false);
  });

  it("rejects notes longer than 500 chars", () => {
    const result = templateExerciseSchema.safeParse({
      exerciseId: "550e8400-e29b-41d4-a716-446655440000",
      sortOrder: 0,
      notes: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

// ─── workoutTemplateSchema ─────────────────────────────────────────────────

describe("workoutTemplateSchema", () => {
  it("accepts valid template with exercises", () => {
    const result = workoutTemplateSchema.safeParse({
      name: "Push Day",
      description: "Chest, shoulders, triceps",
      isPublic: false,
      exercises: [
        {
          exerciseId: "550e8400-e29b-41d4-a716-446655440000",
          sortOrder: 0,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = workoutTemplateSchema.safeParse({
      name: "",
      exercises: [
        {
          exerciseId: "550e8400-e29b-41d4-a716-446655440000",
          sortOrder: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    const result = workoutTemplateSchema.safeParse({
      name: "A".repeat(101),
      exercises: [
        {
          exerciseId: "550e8400-e29b-41d4-a716-446655440000",
          sortOrder: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects template with no exercises", () => {
    const result = workoutTemplateSchema.safeParse({
      name: "Push Day",
      exercises: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts template with optional programBlockId", () => {
    const result = workoutTemplateSchema.safeParse({
      name: "Push Day",
      programBlockId: "550e8400-e29b-41d4-a716-446655440000",
      exercises: [
        {
          exerciseId: "550e8400-e29b-41d4-a716-446655440000",
          sortOrder: 0,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
