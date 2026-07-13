import React from "react";
import { render, screen } from "@testing-library/react-native";
import { useAuthStore } from "@/stores/auth-store";

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
}));

// Import after mocks are declared (jest hoists jest.mock anyway).
import WelcomeScreen from "../index";

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Reset store to a clean baseline to avoid cross-test contamination.
  useAuthStore.setState({
    state: "loading",
    role: null,
    isTeamCoach: false,
  });
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("WelcomeScreen auth-aware redirect", () => {
  it("authenticated athlete redirects to /(tabs)/home exactly once", () => {
    useAuthStore.setState({
      state: "authenticated",
      role: "athlete",
      isTeamCoach: false,
    });

    render(<WelcomeScreen />);

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/home");
  });

  it("authenticated coach redirects to /(coach) exactly once", () => {
    useAuthStore.setState({
      state: "authenticated",
      role: "coach",
      isTeamCoach: false,
    });

    render(<WelcomeScreen />);

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/(coach)");
  });

  it("authenticated team-coach athlete redirects to /(coach)", () => {
    useAuthStore.setState({
      state: "authenticated",
      role: "athlete",
      isTeamCoach: true,
    });

    render(<WelcomeScreen />);

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/(coach)");
  });

  it("unauthenticated user sees welcome UI and does NOT redirect", () => {
    useAuthStore.setState({
      state: "unauthenticated",
      role: null,
      isTeamCoach: false,
    });

    render(<WelcomeScreen />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText("Inicia sesión")).toBeTruthy();
  });

  it("loading user sees logo-only splash and does NOT redirect", () => {
    useAuthStore.setState({
      state: "loading",
      role: null,
      isTeamCoach: false,
    });

    render(<WelcomeScreen />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryByText("Inicia sesión")).toBeNull();
  });
});
