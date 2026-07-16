import { profileSchema } from "../profile";

describe("profileSchema", () => {
  const validInput = {
    displayName: "Jane Doe",
    bodyweight: "80",
    bodyweight_unit: "metric",
    height: "180",
    height_unit: "metric",
    experience: "beginner",
    goal: "strength",
  };

  it("accepts a fully valid payload and coerces numbers", () => {
    const result = profileSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("Jane Doe");
      expect(result.data.bodyweight).toBe(80);
      expect(result.data.height).toBe(180);
      expect(result.data.experience).toBe("beginner");
      expect(result.data.goal).toBe("strength");
    }
  });

  it("rejects displayName longer than 50 characters", () => {
    const result = profileSchema.safeParse({
      ...validInput,
      displayName: "x".repeat(51),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "displayName")).toBe(
        true,
      );
    }
  });

  it("rejects an empty displayName (required)", () => {
    const result = profileSchema.safeParse({ ...validInput, displayName: "" });
    expect(result.success).toBe(false);
  });

  it("coerces an empty bodyweight to undefined (unchanged)", () => {
    const result = profileSchema.safeParse({ ...validInput, bodyweight: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.bodyweight).toBeUndefined();
  });

  it("rejects bodyweight <= 0", () => {
    const result = profileSchema.safeParse({ ...validInput, bodyweight: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects bodyweight above the soft cap (500)", () => {
    const result = profileSchema.safeParse({
      ...validInput,
      bodyweight: "600",
    });
    expect(result.success).toBe(false);
  });

  it("rejects height below 0", () => {
    const result = profileSchema.safeParse({ ...validInput, height: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects height above the soft cap (300)", () => {
    const result = profileSchema.safeParse({ ...validInput, height: "350" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid bodyweight_unit enum", () => {
    const result = profileSchema.safeParse({
      ...validInput,
      bodyweight_unit: "kg",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid experience enum", () => {
    const result = profileSchema.safeParse({
      ...validInput,
      experience: "pro",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid goal enum", () => {
    const result = profileSchema.safeParse({
      ...validInput,
      goal: "powerlifting",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a payload with all optional fields absent", () => {
    const result = profileSchema.safeParse({ displayName: "Solo" });
    expect(result.success).toBe(true);
  });

  it("excludes email from the output (read-only field)", () => {
    const result = profileSchema.safeParse({
      ...validInput,
      email: "ignored@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).email).toBeUndefined();
    }
  });
});
