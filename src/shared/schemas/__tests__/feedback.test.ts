import { feedbackSchema } from "../feedback";

describe("feedbackSchema", () => {
  // ─── rating ────────────────────────────────────────────────────────

  it("accepts valid rating with notes", () => {
    const result = feedbackSchema.safeParse({
      rating: 4,
      notes: "Great session!",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rating).toBe(4);
      expect(result.data.notes).toBe("Great session!");
    }
  });

  it("accepts valid rating without notes", () => {
    const result = feedbackSchema.safeParse({
      rating: 5,
      notes: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rating).toBe(5);
      expect(result.data.notes).toBeNull();
    }
  });

  it("accepts rating at minimum bound (1)", () => {
    const result = feedbackSchema.safeParse({ rating: 1 });
    expect(result.success).toBe(true);
  });

  it("accepts rating at maximum bound (5)", () => {
    const result = feedbackSchema.safeParse({ rating: 5 });
    expect(result.success).toBe(true);
  });

  it("rejects rating below 1", () => {
    const result = feedbackSchema.safeParse({ rating: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects rating above 5", () => {
    const result = feedbackSchema.safeParse({ rating: 6 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer rating", () => {
    const result = feedbackSchema.safeParse({ rating: 3.5 });
    expect(result.success).toBe(false);
  });

  it("rejects missing rating", () => {
    const result = feedbackSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  // ─── notes ──────────────────────────────────────────────────────────

  it("accepts notes at 500 character limit", () => {
    const result = feedbackSchema.safeParse({
      rating: 3,
      notes: "x".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("rejects notes exceeding 500 characters", () => {
    const result = feedbackSchema.safeParse({
      rating: 3,
      notes: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts omitted notes field", () => {
    const result = feedbackSchema.safeParse({ rating: 4 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeNull();
    }
  });

  it("accepts empty string notes (will be stored as null)", () => {
    const result = feedbackSchema.safeParse({ rating: 4, notes: "" });
    expect(result.success).toBe(true);
  });

  it("accepts undefined notes", () => {
    const result = feedbackSchema.safeParse({ rating: 4, notes: undefined });
    expect(result.success).toBe(true);
  });
});
