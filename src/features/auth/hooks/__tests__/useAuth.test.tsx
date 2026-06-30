import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useAuth } from "../useAuth";
import { useAuthStore } from "../../../../stores/auth-store";

// Mock the entire auth service module
jest.mock("../../../../lib/supabase/services/auth", () => ({
  getSession: jest.fn(),
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChange: jest.fn(() => () => {}),
}));

import * as AuthService from "../../../../lib/supabase/services/auth";

// Mock expo-router
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the auth store to loading state
  useAuthStore.setState({
    state: "loading",
    session: null,
    user: null,
  });
});

describe("useAuth integration", () => {
  // ─── initialize ─────────────────────────────────────────────────────────

  it("restores session on initialize when session exists", async () => {
    const mockSession = {
      user: { id: "user-1", email: "test@test.com" },
      access_token: "tok",
      refresh_token: "rtok",
    };
    (AuthService.getSession as jest.Mock).mockResolvedValue({
      session: mockSession,
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.initialize();
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    // Note: setSession does NOT set user — that's a separate action
    expect(result.current.user).toBeNull();
  });

  it("sets unauthenticated on initialize when no session", async () => {
    (AuthService.getSession as jest.Mock).mockResolvedValue({
      session: null,
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.initialize();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  // ─── login ──────────────────────────────────────────────────────────────

  it("logs in successfully and returns no error", async () => {
    const mockUser = { id: "user-1", email: "test@test.com" };
    (AuthService.signIn as jest.Mock).mockResolvedValue({
      error: null,
      user: mockUser,
    });

    const { result } = renderHook(() => useAuth());

    let loginResult: { error: string | null } | undefined;
    await act(async () => {
      loginResult = await result.current.login({
        email: "test@test.com",
        password: "Password1",
      });
    });

    expect(loginResult).toEqual({ error: null });
    expect(AuthService.signIn).toHaveBeenCalledWith({
      email: "test@test.com",
      password: "Password1",
    });
  });

  it("returns error message on failed login", async () => {
    (AuthService.signIn as jest.Mock).mockResolvedValue({
      error: "Invalid email or password",
      user: null,
    });

    const { result } = renderHook(() => useAuth());

    let loginResult: { error: string | null } | undefined;
    await act(async () => {
      loginResult = await result.current.login({
        email: "test@test.com",
        password: "wrong",
      });
    });

    expect(loginResult).toEqual({ error: "Invalid email or password" });
  });

  // ─── register ───────────────────────────────────────────────────────────

  it("registers successfully and returns no error", async () => {
    const mockUser = { id: "user-1", email: "new@test.com" };
    (AuthService.signUp as jest.Mock).mockResolvedValue({
      error: null,
      user: mockUser,
    });

    const { result } = renderHook(() => useAuth());

    let registerResult: { error: string | null } | undefined;
    await act(async () => {
      registerResult = await result.current.register({
        email: "new@test.com",
        password: "StrongPass1",
        displayName: "New User",
      });
    });

    expect(registerResult).toEqual({ error: null });
    expect(AuthService.signUp).toHaveBeenCalledWith({
      email: "new@test.com",
      password: "StrongPass1",
      displayName: "New User",
    });
  });

  it("returns error on duplicate email registration", async () => {
    (AuthService.signUp as jest.Mock).mockResolvedValue({
      error: "An account with this email already exists",
      user: null,
    });

    const { result } = renderHook(() => useAuth());

    let registerResult: { error: string | null } | undefined;
    await act(async () => {
      registerResult = await result.current.register({
        email: "existing@test.com",
        password: "StrongPass1",
        displayName: "Existing",
      });
    });

    expect(registerResult).toEqual({
      error: "An account with this email already exists",
    });
  });

  // ─── logout ─────────────────────────────────────────────────────────────

  it("signs out, resets store, and redirects to login", async () => {
    // Start authenticated
    useAuthStore.setState({
      state: "authenticated",
      session: { user: { id: "user-1" } } as any,
      user: { id: "user-1" } as any,
    });

    (AuthService.signOut as jest.Mock).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(AuthService.signOut).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
  });

  // ─── auth state listener ────────────────────────────────────────────────

  it("handles SIGNED_OUT event from onAuthStateChange", async () => {
    // Capture the callback registered by onAuthStateChange
    let capturedCallback: ((event: string, session: any) => void) | null = null;
    const mockUnsubscribe = jest.fn();
    (AuthService.onAuthStateChange as jest.Mock).mockImplementation(
      (cb: (event: string, session: any) => void) => {
        capturedCallback = cb;
        return mockUnsubscribe; // must return a function, not an object
      },
    );

    // Start authenticated
    useAuthStore.setState({
      state: "authenticated",
      session: { user: { id: "user-1" } } as any,
      user: { id: "user-1" } as any,
    });

    renderHook(() => useAuth());

    // Simulate SIGNED_OUT event
    await act(async () => {
      capturedCallback!("SIGNED_OUT", null);
    });

    expect(useAuthStore.getState().state).toBe("unauthenticated");
    expect(useAuthStore.getState().user).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
  });
});
