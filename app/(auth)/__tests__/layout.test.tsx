/**
 * Tests for AuthLayout — redirect logic.
 *
 * Covers the role source unification (SPEC-07) change:
 * redirect uses ONLY isTeamCoach (not role === "coach").
 */

import React from "react";
import { render, act } from "@testing-library/react-native";

// ─── Local mocks override the global jest.setup mocks ────────────────────────

const mockReplace = jest.fn();
jest.mock("expo-router", () => {
  const StackScreen = (_props: any) => null;
  const MockStack = ({ children, screenOptions }: any) => {
    // Stack renders children (the Stack.Screen components)
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View, null, children);
  };
  MockStack.Screen = StackScreen;
  MockStack.displayName = "Stack";

  return {
    useRouter: () => ({
      replace: mockReplace,
      push: jest.fn(),
      back: jest.fn(),
    }),
    useSegments: () => [],
    useLocalSearchParams: () => ({}),
    Stack: MockStack,
  };
});

let mockState: {
  state: string;
  isTeamCoach: boolean;
  isPendingSignupInfo: boolean;
} = {
  state: "unauthenticated",
  isTeamCoach: false,
  isPendingSignupInfo: false,
};

jest.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector?: any) =>
    selector ? selector(mockState) : mockState,
}));

import AuthLayout from "../_layout";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AuthLayout redirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {
      state: "unauthenticated",
      isTeamCoach: false,
      isPendingSignupInfo: false,
    };
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("redirects to coach when authenticated team coach", () => {
    mockState.state = "authenticated";
    mockState.isTeamCoach = true;

    render(<AuthLayout />);
    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/(coach)");
  });

  it("redirects to tabs when authenticated non-coach (athlete)", () => {
    mockState.state = "authenticated";
    mockState.isTeamCoach = false;

    render(<AuthLayout />);
    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
  });

  it("does NOT redirect when unauthenticated", () => {
    mockState.state = "unauthenticated";

    render(<AuthLayout />);
    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does NOT redirect when loading", () => {
    mockState.state = "loading";

    render(<AuthLayout />);
    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does NOT redirect when isPendingSignupInfo is true", () => {
    mockState.state = "authenticated";
    mockState.isTeamCoach = true;
    mockState.isPendingSignupInfo = true;

    render(<AuthLayout />);
    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
