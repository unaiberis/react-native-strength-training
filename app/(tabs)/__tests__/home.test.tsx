import React from "react";
import { render, screen } from "@testing-library/react-native";

const mockUseAuth = jest.fn(() => ({
  user: { user_metadata: { display_name: "Sam" }, email: "sam@e.com" },
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: (...args: any[]) => mockUseAuth(...args),
}));

jest.mock("@/features/home/hooks/useHomeStats", () => ({
  useHomeStats: jest.fn(() => ({
    totalWorkouts: 12,
    totalSets: 340,
    thisWeekWorkouts: 3,
    bestE1RM: 120.5,
    recentSessions: [],
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
  })),
  relativeDate: (d: string) => d,
}));

const mockUseAthleteAssignments = jest.fn();
jest.mock("@/features/programs/hooks/useAthleteAssignments", () => {
  const todayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  };
  return {
    useAthleteAssignments: (...args: any[]) => mockUseAthleteAssignments(...args),
    findAssignedToday: (programs: any[]) => {
      const t = todayString();
      return programs.find((p) => p && p.startDate === t) ?? null;
    },
  };
});

import HomeScreen from "../home";
import HomeIndexScreen from "../index";

describe("Home screens do not show 'Best e1RM' (RED 3.1)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockImplementation(() => ({
      user: { user_metadata: { display_name: "Sam" }, email: "sam@e.com" },
    }));
    mockUseAthleteAssignments.mockReturnValue({
      currentProgram: null,
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("home.tsx does not render the 'Best e1RM' stat card", () => {
    render(<HomeScreen />);
    expect(screen.queryByText("Best e1RM")).toBeNull();
    // Other quick stats remain
    expect(screen.getByText("This Week")).toBeTruthy();
  });

  it("index.tsx does not render the 'Best e1RM' stat card", () => {
    render(<HomeIndexScreen />);
    expect(screen.queryByText("Best e1RM")).toBeNull();
    expect(screen.getByText("This Week")).toBeTruthy();
  });
});
