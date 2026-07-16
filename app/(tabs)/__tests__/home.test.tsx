import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import type { RecentSession } from "@/features/home/hooks/useHomeStats";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Tabs: () => null,
}));

const mockUseAuth = jest.fn<{ user: { user_metadata: { display_name?: string; email?: string } } }, []>(() => ({
  user: { user_metadata: { display_name: "Sam" }, email: "sam@e.com" },
}));

const mockUseHomeStats = jest.fn(() => defaultStats());

function defaultStats() {
  return {
    totalWorkouts: 12,
    totalSets: 340,
    thisWeekWorkouts: 3,
    bestE1RM: 120.5,
    recentSessions: [] as RecentSession[],
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
  };
}

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/features/home/hooks/useHomeStats", () => ({
  useHomeStats: () => mockUseHomeStats(),
  relativeDate: (d: string) => d,
}));

const mockUseAthleteAssignments = jest.fn();
jest.mock("@/features/athlete-assignments/hooks/useAthleteAssignments", () => {
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

// Mock WeekCalendarSection to avoid hook dependencies in existing tests
jest.mock("@/features/calendar/components/WeekCalendarSection", () => ({
  WeekCalendarSection: () => null,
}));

import HomeScreen from "../home";

function setStats(overrides: Partial<ReturnType<typeof defaultStats>>) {
  mockUseHomeStats.mockReturnValue({ ...defaultStats(), ...overrides });
}

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
    setStats({});
  });

  it("home.tsx does not render the 'Best e1RM' stat card", () => {
    render(<HomeScreen />);
    expect(screen.queryByText("Best e1RM")).toBeNull();
    expect(screen.getByText("This Week")).toBeTruthy();
  });

});

describe("home.tsx branch coverage", () => {
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

  it("renders the loading skeleton when isLoading", () => {
    setStats({ isLoading: true });
    render(<HomeScreen />);
    expect(screen.getByText("Quick Stats")).toBeTruthy();
    // No crash on skeleton branch
  });

  it("renders recent sessions when present", () => {
    setStats({
      recentSessions: [
        {
          id: "s1",
          templateName: "Leg Day",
          startedAt: "2026-07-08T10:00:00Z",
          durationMinutes: 60,
          exerciseCount: 5,
        },
      ],
    });
    render(<HomeScreen />);
    expect(screen.getByText("Leg Day")).toBeTruthy();
    expect(screen.getByText("Recent Activity")).toBeTruthy();
  });

  it("renders the empty recent-activity message when no sessions", () => {
    setStats({ recentSessions: [] });
    render(<HomeScreen />);
    expect(
      screen.getByText(/Complete a workout to see your recent activity/i),
    ).toBeTruthy();
  });

  it("does not render the Routines quick action chip (home.tsx)", () => {
    setStats({});
    render(<HomeScreen />);
    expect(screen.queryByLabelText("Create and manage routines")).toBeNull();
    expect(screen.queryByText("Routines")).toBeNull();
  });

  it("presses the History quick action (home.tsx)", () => {
    setStats({});
    render(<HomeScreen />);
    fireEvent.press(screen.getByLabelText("View workout history"));
    expect(mockPush).toHaveBeenCalledWith("/history");
  });

  it("uses the greeting fallback when display_name and email absent", () => {
    mockUseAuth.mockReturnValue({ user: { user_metadata: {} } });
    setStats({});
    render(<HomeScreen />);
    expect(screen.getByText(/Athlete/)).toBeTruthy();
  });

  it("triggers refresh via RefreshControl", () => {
    const refetch = jest.fn();
    setStats({ refetch });
    const { UNSAFE_getByType } = render(<HomeScreen />);
    const { ScrollView } = require("react-native");
    const scroll = UNSAFE_getByType(ScrollView);
    scroll.props.refreshControl.props.onRefresh();
    expect(refetch).toHaveBeenCalled();
  });
});
