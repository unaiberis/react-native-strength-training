import { loginSchema, registerSchema } from "../auth";

// ─── loginSchema ───────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid login input", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "myPassword1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "myPassword1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("email");
    }
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "myPassword1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts password with 8+ chars (login has no min length rule)", () => {
    // loginSchema only requires password to be non-empty
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "short",
    });
    expect(result.success).toBe(true);
  });
});

// ─── registerSchema ────────────────────────────────────────────────────────

describe("registerSchema", () => {
  it("accepts valid registration input", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "StrongPass1",
      displayName: "Test User",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "Short1A",
      displayName: "Test User",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without an uppercase letter", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "alllowercase1",
      displayName: "Test User",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty display name", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "StrongPass1",
      displayName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects display name over 50 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "StrongPass1",
      displayName: "A".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("accepts display name at exactly 50 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "StrongPass1",
      displayName: "A".repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email in registration", () => {
    const result = registerSchema.safeParse({
      email: "bad-email",
      password: "StrongPass1",
      displayName: "Test User",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email in registration", () => {
    const result = registerSchema.safeParse({
      email: "",
      password: "StrongPass1",
      displayName: "Test User",
    });
    expect(result.success).toBe(false);
  });
});
