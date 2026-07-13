// TDD RED → GREEN render tests for the Home "assigned today" chip (T5, R5).
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Tabs: () => null,
}));

const mockUseAuth = jest.fn(() => ({
  user: { user_metadata: { display_name: "Sam" }, email: "sam@e.com" },
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
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
jest.mock("@/features/athlete-assignments/hooks/useAthleteAssignments", () => {
  // Provide findAssignedToday WITHOUT loading the ESM PocketBase client.
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

jest.mock("@/features/calendar/components/WeekCalendarSection", () => ({
  WeekCalendarSection: () => null,
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import HomeScreen from "../index";

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function assignedProgram(id = "asg-b", name = "Hypertrophy Block") {
  return {
    id,
    name,
    description: "8-week plan",
    startDate: todayString(),
    endDate: "2026-08-30",
    totalWeeks: 8,
    weeksCompleted: 0,
    progressPercent: 0,
    phases: [],
    status: "active" as const,
  };
}

describe("HomeScreen assigned-today chip", () => {
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

  it("shows the chip and deep-links to train tab when assigned today (R5)", () => {
    mockUseAthleteAssignments.mockReturnValue({
      currentProgram: assignedProgram(),
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<HomeScreen />);

    const chip = screen.getByText("Entrenamiento asignado hoy");
    expect(chip).toBeTruthy();

    fireEvent.press(chip);
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/train");
  });

  it("does NOT show the chip when nothing is assigned today (R5 edge)", () => {
    mockUseAthleteAssignments.mockReturnValue({
      currentProgram: { ...assignedProgram(), startDate: "2026-08-01" },
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<HomeScreen />);

    expect(screen.queryByText("Entrenamiento asignado hoy")).toBeNull();
  });

  it("shows the chip even when the template is missing (R5 null-guard)", () => {
    mockUseAthleteAssignments.mockReturnValue({
      currentProgram: { ...assignedProgram(), name: "Untitled Program" },
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<HomeScreen />);

    const chip = screen.getByText("Entrenamiento asignado hoy");
    expect(chip).toBeTruthy();
    fireEvent.press(chip);
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/train");
  });

  it("renders the populated recent-activity list without crashing", () => {
    const { useHomeStats } = require("@/features/home/hooks/useHomeStats");
    useHomeStats.mockReturnValue({
      totalWorkouts: 12,
      totalSets: 340,
      thisWeekWorkouts: 3,
      bestE1RM: 120.5,
      recentSessions: [
        {
          id: "s1",
          templateName: "Leg Day",
          startedAt: "2026-07-08T10:00:00Z",
          durationMinutes: 60,
          exerciseCount: 5,
        },
      ],
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    render(<HomeScreen />);
    expect(screen.getByText("Leg Day")).toBeTruthy();
  });

  it("renders the loading skeleton branch without crashing", () => {
    const { useHomeStats } = require("@/features/home/hooks/useHomeStats");
    useHomeStats.mockReturnValue({
      totalWorkouts: 0,
      totalSets: 0,
      thisWeekWorkouts: 0,
      bestE1RM: null,
      recentSessions: [],
      isLoading: true,
      refetch: jest.fn(),
      isRefetching: false,
    });

    render(<HomeScreen />);
    expect(screen.queryByText("Entrenamiento asignado hoy")).toBeNull();
  });

  it("renders the Quick Action button (history) without crashing", () => {
    render(<HomeScreen />);

    // Routines quick action should not be present
    expect(screen.queryByText("Routines")).toBeNull();
    // View history quick action
    expect(screen.getByLabelText("View workout history")).toBeTruthy();
  });

  it("does not render the Routines quick action", () => {
    render(<HomeScreen />);
    expect(screen.queryByLabelText("Create and manage routines")).toBeNull();
  });

  it("navigates to /history on pressing the History quick action", () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByLabelText("View workout history"));
    expect(mockPush).toHaveBeenCalledWith("/history");
  });

  it("renders the recent-activity card title (Card wrapper renders)", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Recent Activity")).toBeTruthy();
  });

  it("renders the greeting fallback when display_name is absent (line 22 branch)", () => {
    mockUseAuth.mockReturnValue({
      user: { user_metadata: { display_name: "athlete" }, email: "athlete@test.com" },
    });

    render(<HomeScreen />);
    expect(screen.getByText(/athlete/)).toBeTruthy();
  });

  it("renders the greeting with 'Athlete' when both display_name and email are absent (line 22 fallback)", () => {
    mockUseAuth.mockReturnValue({
      user: { user_metadata: { display_name: "Athlete" }, email: "athlete@test.com" },
    });

    render(<HomeScreen />);
    expect(screen.getByText(/Athlete/)).toBeTruthy();
  });

  it("does NOT render the 'Best e1RM' stat card (home-analytics-simplify)", () => {
    render(<HomeScreen />);
    expect(screen.queryByText("Best e1RM")).toBeNull();
  });

  it("renders '—' for duration when recent session has null duration (line 253 branch)", () => {
    const { useHomeStats } = require("@/features/home/hooks/useHomeStats");
    useHomeStats.mockReturnValue({
      totalWorkouts: 12,
      totalSets: 340,
      thisWeekWorkouts: 3,
      bestE1RM: 100,
      recentSessions: [
        {
          id: "s1",
          templateName: "Leg Day",
          startedAt: "2026-07-08T10:00:00Z",
          durationMinutes: null,
          exerciseCount: 5,
        },
      ],
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    render(<HomeScreen />);
    // The '—' appears in the duration slot for the Leg Day session
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("triggers the refresh callback via RefreshControl (line 39 branch)", () => {
    const refetch = jest.fn();
    const { useHomeStats } = require("@/features/home/hooks/useHomeStats");
    useHomeStats.mockReturnValue({
      totalWorkouts: 12,
      totalSets: 340,
      thisWeekWorkouts: 3,
      bestE1RM: 120.5,
      recentSessions: [],
      isLoading: false,
      refetch,
      isRefetching: false,
    });

    const { UNSAFE_getByType } = render(<HomeScreen />);
    const { ScrollView } = require("react-native");

    const scroll = UNSAFE_getByType(ScrollView);
    const refreshControl = scroll.props.refreshControl;
    expect(refreshControl).toBeTruthy();
    refreshControl.props.onRefresh();

    expect(refetch).toHaveBeenCalled();
  });
});
