import { loginSchema, registerSchema, getLoginSchema, getRegisterSchema } from "../auth";

// ─── Legacy schemas (backward compatibility) ────────────────────────────────

describe("loginSchema (legacy)", () => {
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
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "short",
    });
    expect(result.success).toBe(true);
  });
});

// ─── registerSchema (legacy) ────────────────────────────────────────────────

describe("registerSchema (legacy)", () => {
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

  // ─── Role Field ────────────────────────────────────────────────────────────

  describe("role field", () => {
    it("accepts registration with 'athlete' role", () => {
      const result = registerSchema.safeParse({
        email: "user@example.com",
        password: "StrongPass1",
        displayName: "Test User",
        role: "athlete",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("athlete");
      }
    });

    it("accepts registration with 'coach' role", () => {
      const result = registerSchema.safeParse({
        email: "coach@example.com",
        password: "StrongPass1",
        displayName: "Coach User",
        role: "coach",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("coach");
      }
    });

    it("defaults to 'athlete' when role is omitted", () => {
      const result = registerSchema.safeParse({
        email: "user@example.com",
        password: "StrongPass1",
        displayName: "Test User",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("athlete");
      }
    });

    it("rejects invalid role value", () => {
      const result = registerSchema.safeParse({
        email: "user@example.com",
        password: "StrongPass1",
        displayName: "Test User",
        role: "admin",
      });
      expect(result.success).toBe(false);
    });
  });
});

// ─── Factory functions (i18n-aware) ────────────────────────────────────────

describe("getLoginSchema (factory)", () => {
  it("returns a valid Zod schema", () => {
    const schema = getLoginSchema();
    const result = schema.safeParse({
      email: "user@example.com",
      password: "myPassword1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty email with i18n message", () => {
    const schema = getLoginSchema();
    const result = schema.safeParse({
      email: "",
      password: "myPassword1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // i18n.t returns the key as-is in test environment
      expect(result.error.issues[0].message).toBe("Email is required");
    }
  });

  it("rejects invalid email with i18n message", () => {
    const schema = getLoginSchema();
    const result = schema.safeParse({
      email: "not-an-email",
      password: "myPassword1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid email address");
    }
  });

  it("rejects empty password with i18n message", () => {
    const schema = getLoginSchema();
    const result = schema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Password is required");
    }
  });

  it("each call returns a fresh schema instance", () => {
    const schema1 = getLoginSchema();
    const schema2 = getLoginSchema();
    expect(schema1).not.toBe(schema2);
  });
});

describe("getRegisterSchema (factory)", () => {
  it("returns a valid Zod schema", () => {
    const schema = getRegisterSchema();
    const result = schema.safeParse({
      email: "user@example.com",
      password: "StrongPass1",
      displayName: "Test User",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short password with i18n message", () => {
    const schema = getRegisterSchema();
    const result = schema.safeParse({
      email: "user@example.com",
      password: "Short1A",
      displayName: "Test User",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Password must be at least 8 characters"
      );
    }
  });

  it("rejects password without uppercase with i18n message", () => {
    const schema = getRegisterSchema();
    const result = schema.safeParse({
      email: "user@example.com",
      password: "alllowercase1",
      displayName: "Test User",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Password must contain at least one uppercase letter"
      );
    }
  });

  it("rejects empty display name with i18n message", () => {
    const schema = getRegisterSchema();
    const result = schema.safeParse({
      email: "user@example.com",
      password: "StrongPass1",
      displayName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Display name is required");
    }
  });

  it("each call returns a fresh schema instance", () => {
    const schema1 = getRegisterSchema();
    const schema2 = getRegisterSchema();
    expect(schema1).not.toBe(schema2);
  });
});
