// Wrapper for vi.mock factory — Vitest v4 requires vi.hoisted() for
// module-level variables referenced in vi.mock() factories.
// eslint-disable-next-line prefer-const
const pbMocks = vi.hoisted(() => {
  const mockAuthWithPassword = vi.fn();
  const mockCreate = vi.fn();
  const mockAuthRefresh = vi.fn();
  const mockClear = vi.fn();
  // Use object wrapper so both hoisted and test scope share same ref
  const mockOnChangeRegistered = { current: (() => {}) as (token: string, record: any) => void };
  const mockOnChange = vi.fn().mockImplementation(
    (cb: (token: string, record: any) => void) => {
      mockOnChangeRegistered.current = cb;
      return vi.fn();
    },
  );
  const mockIsValid = { value: false };

  const mockPb = {
    authStore: {
      clear: mockClear,
      onChange: mockOnChange,
      get isValid() { return mockIsValid.value; },
      token: "",
      record: null,
      model: null,
    },
    collection: vi.fn(() => ({
      authWithPassword: mockAuthWithPassword,
      create: mockCreate,
      authRefresh: mockAuthRefresh,
    })),
  };

  return { mockAuthWithPassword, mockCreate, mockAuthRefresh, mockClear, mockOnChangeRegistered, mockOnChange, mockIsValid, mockPb };
});

// Destructure after hoisted block — references accessed through pbMocks in vi.mock()
const { mockAuthWithPassword, mockCreate, mockAuthRefresh, mockClear, mockOnChangeRegistered, mockOnChange, mockIsValid } = pbMocks;

vi.mock("../../client", () => ({
  pb: pbMocks.mockPb,
}));

import {
  signUp,
  signIn,
  signOut,
  getSession,
  onAuthStateChange,
  type AuthResult,
} from "../auth";

describe("PocketBase auth service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValid.value = false;
  });

  // ─── signUp ──────────────────────────────────────────────────

  it("signUp calls pb.collection('users').create and returns user", async () => {
    const mockRecord = { id: "user-1", email: "test@test.com" };
    mockCreate.mockResolvedValue(mockRecord);

    const result = await signUp({
      email: "test@test.com",
      password: "StrongPass1",
      displayName: "Test User",
      role: "athlete",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      email: "test@test.com",
      password: "StrongPass1",
      passwordConfirm: "StrongPass1",
      displayName: "Test User",
      role: "athlete",
    });
    expect(result).toEqual({ error: null, user: mockRecord });
  });

  it("signUp passes coach role to PocketBase when provided", async () => {
    const mockRecord = { id: "coach-1", email: "coach@test.com", role: "coach" };
    mockCreate.mockResolvedValue(mockRecord);

    const result = await signUp({
      email: "coach@test.com",
      password: "StrongPass1",
      displayName: "Coach User",
      role: "coach",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      email: "coach@test.com",
      password: "StrongPass1",
      passwordConfirm: "StrongPass1",
      displayName: "Coach User",
      role: "coach",
    });
    expect(result).toEqual({ error: null, user: mockRecord });
  });

  it("signUp returns error on PocketBase error", async () => {
    const pbError = new Error("Failed to create record.");
    (pbError as any).status = 400;
    (pbError as any).response = { message: "duplicate email" };
    mockCreate.mockRejectedValue(pbError);

    const result = await signUp({
      email: "existing@test.com",
      password: "StrongPass1",
      displayName: "Existing",
      role: "athlete",
    });

    expect(result.error).toBeTruthy();
    expect(result.user).toBeNull();
  });

  it("signUp maps 'already exists' errors to user-friendly message", async () => {
    const pbError = new Error("The resource already exists.");
    (pbError as any).status = 400;
    (pbError as any).response = { message: "The resource already exists." };
    mockCreate.mockRejectedValue(pbError);

    const result = await signUp({
      email: "dup@test.com",
      password: "StrongPass1",
      displayName: "Dup",
      role: "athlete",
    });

    expect(result.error).toBe("An account with this email already exists");
    expect(result.user).toBeNull();
  });

  // ─── signIn ──────────────────────────────────────────────────

  it("signIn calls authWithPassword and returns user", async () => {
    const mockRecord = { id: "user-1", email: "test@test.com", displayName: "Test" };
    mockAuthWithPassword.mockResolvedValue({
      record: mockRecord,
      token: "jwt-token-123",
    });

    const result = await signIn({
      email: "test@test.com",
      password: "StrongPass1",
    });

    expect(mockAuthWithPassword).toHaveBeenCalledWith("test@test.com", "StrongPass1");
    expect(result).toEqual({ error: null, user: mockRecord });
  });

  it("signIn returns error on invalid credentials", async () => {
    const pbError = new Error("Invalid login credentials.");
    (pbError as any).status = 400;
    (pbError as any).response = { message: "Invalid login credentials." };
    mockAuthWithPassword.mockRejectedValue(pbError);

    const result = await signIn({
      email: "wrong@test.com",
      password: "bad",
    });

    expect(result.error).toBe("Invalid email or password");
    expect(result.user).toBeNull();
  });

  it("signIn returns error for email not confirmed", async () => {
    const pbError = new Error("The email is not confirmed.");
    (pbError as any).status = 400;
    (pbError as any).response = { message: "The email is not confirmed." };
    mockAuthWithPassword.mockRejectedValue(pbError);

    const result = await signIn({
      email: "unconfirmed@test.com",
      password: "StrongPass1",
    });

    expect(result.error).toBe("Please confirm your email before signing in");
    expect(result.user).toBeNull();
  });

  // ─── signOut ─────────────────────────────────────────────────

  it("signOut calls authStore.clear()", async () => {
    const result = await signOut();
    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ error: null });
  });

  // ─── getSession ──────────────────────────────────────────────

  it("getSession returns session when stored token is valid", async () => {
    mockIsValid.value = true;
    const mockRecord = { id: "user-1", email: "test@test.com" };
    mockAuthRefresh.mockResolvedValue({
      record: mockRecord,
      token: "refreshed-token",
    });

    const result = await getSession();

    expect(mockAuthRefresh).toHaveBeenCalled();
    expect(result).toEqual({
      session: { user: mockRecord, token: "refreshed-token" },
      error: null,
    });
  });

  it("getSession returns null when no stored token", async () => {
    mockIsValid.value = false;

    const result = await getSession();

    expect(mockAuthRefresh).not.toHaveBeenCalled();
    expect(result).toEqual({ session: null, error: null });
  });

  it("getSession clears store and returns null on authRefresh failure", async () => {
    mockIsValid.value = true;
    const pbError = new Error("Invalid or expired token.");
    (pbError as any).status = 401;
    mockAuthRefresh.mockRejectedValue(pbError);

    const result = await getSession();

    expect(mockClear).toHaveBeenCalled();
    expect(result).toEqual({ session: null, error: "Session expired" });
  });

  // ─── onAuthStateChange ───────────────────────────────────────

  it("onAuthStateChange subscribes to pb.authStore.onChange", () => {
    const callback = vi.fn();
    onAuthStateChange(callback);

    expect(mockOnChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it("onAuthStateChange fires callback when auth state changes", () => {
    const userCallback = vi.fn();
    onAuthStateChange(userCallback);

    // Simulate auth state change via the registered onChange callback
    mockOnChangeRegistered.current("tok-1", { id: "user-1" });
    expect(userCallback).toHaveBeenCalledWith("tok-1", { id: "user-1" });

    mockOnChangeRegistered.current("", null);
    expect(userCallback).toHaveBeenCalledWith("", null);
  });

  it("onAuthStateChange returns unsubscribe function", () => {
    const mockUnsubscribe = vi.fn();
    mockOnChange.mockReturnValue(mockUnsubscribe);

    const unsubscribe = onAuthStateChange(vi.fn());
    expect(typeof unsubscribe).toBe("function");

    unsubscribe();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
