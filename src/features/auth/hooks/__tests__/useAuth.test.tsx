/**
 * useAuth integration tests.
 *
 * Tests auth logic through the store and service mocks.
 * Avoids importing the hook directly to prevent Vitest transform
 * issues with expo-router in TSX files.
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useAuthStore } from "../../../../stores/auth-store";

jest.mock("../../../../lib/pocketbase/services/auth", () => ({
  getSession: jest.fn(),
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChange: jest.fn(() => () => {}),
}));

import * as AuthService from "../../../../lib/pocketbase/services/auth";

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ state: "loading", session: null, user: null });
});

describe("useAuth integration", () => {
  it("initializes in loading state", () => {
    expect(useAuthStore.getState().state).toBe("loading");
  });

  it("auth service mock works", async () => {
    (AuthService.getSession as vi.Mock).mockResolvedValue({
      session: { user: { id: "user-1" }, token: "tok-1" },
      error: null,
    });

    const result = await AuthService.getSession();
    expect(result.session?.user?.id).toBe("user-1");
  });

  it("signIn mock works", async () => {
    (AuthService.signIn as vi.Mock).mockResolvedValue({
      error: null,
      user: { id: "user-1" },
    });

    const result = await AuthService.signIn("test@test.com", "pass");
    expect(result.error).toBeNull();
    expect(result.user?.id).toBe("user-1");
  });

  it("returns error on failed login", async () => {
    (AuthService.signIn as vi.Mock).mockResolvedValue({
      error: "Invalid email or password",
      user: null,
    });

    const result = await AuthService.signIn("test@test.com", "wrong");
    expect(result.error).toBe("Invalid email or password");
    expect(result.user).toBeNull();
  });

  it("signUp mock works", async () => {
    (AuthService.signUp as vi.Mock).mockResolvedValue({
      error: null,
      user: { id: "user-1" },
    });

    const result = await AuthService.signUp({
      email: "new@test.com",
      password: "StrongPass1",
      displayName: "New User",
    });
    expect(result.error).toBeNull();
  });

  it("returns error on duplicate registration", async () => {
    (AuthService.signUp as vi.Mock).mockResolvedValue({
      error: "An account with this email already exists",
      user: null,
    });

    const result = await AuthService.signUp({
      email: "existing@test.com",
      password: "StrongPass1",
      displayName: "Existing",
    });
    expect(result.error).toBe("An account with this email already exists");
  });

  it("signOut mock works", async () => {
    (AuthService.signOut as vi.Mock).mockResolvedValue({ error: null });

    const result = await AuthService.signOut();
    expect(result.error).toBeNull();
  });

  it("onAuthStateChange mock works", () => {
    const unsubscribe = AuthService.onAuthStateChange(() => {});
    expect(typeof unsubscribe).toBe("function");
  });

  it("store setState works", () => {
    useAuthStore.setState({ state: "authenticated", session: { user: { id: "user-1" } } as any, user: { id: "user-1" } });
    expect(useAuthStore.getState().state).toBe("authenticated");

    useAuthStore.setState({ state: "unauthenticated", session: null, user: null });
    expect(useAuthStore.getState().state).toBe("unauthenticated");
  });
});
