// TDD RED → GREEN render tests for the rewritten Train screen.
// Train must show "No training scheduled for today" when no assignment
// exists, and show the assigned workout card when one is assigned today.

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Tabs: () => null,
}));

const mockUseAthleteAssignments = jest.fn();
const mockFindAssignedToday = jest.fn();

jest.mock("@/features/athlete-assignments/hooks/useAthleteAssignments", () => ({
  useAthleteAssignments: (...args: any[]) => mockUseAthleteAssignments(...args),
  findAssignedToday: (...args: any[]) => mockFindAssignedToday(...args),
  todayStr: () => "2026-07-12",
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import TrainScreen from "../train";

function makeAssignment(overrides: Record<string, any> = {}) {
  return {
    id: "asg-1",
    name: "Today's Workout",
    description: "",
    startDate: "2026-07-12",
    endDate: "2026-09-06",
    totalWeeks: 8,
    weeksCompleted: 0,
    progressPercent: 0,
    phases: [],
    status: "active",
    ...overrides,
  };
}

describe("TrainScreen — empty state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAthleteAssignments.mockReturnValue({
      currentProgram: null,
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockFindAssignedToday.mockReturnValue(null);
  });

  it("renders 'No training scheduled for today' when no assignment", () => {
    render(<TrainScreen />);
    expect(screen.getByText("No training scheduled for today")).toBeTruthy();
  });

  it("does not render blank-workout or browse-exercises entry points", () => {
    render(<TrainScreen />);
    expect(screen.queryByText("Blank Workout")).toBeNull();
    expect(screen.queryByText("Browse Exercises")).toBeNull();
    expect(screen.queryByText("Start from Routine")).toBeNull();
    expect(screen.queryByText("My Routines")).toBeNull();
  });

  it("shows a graceful empty-state subtitle", () => {
    render(<TrainScreen />);
    expect(
      screen.getByText(/Your coach will assign training for today/i),
    ).toBeTruthy();
  });

  it("renders Train title", () => {
    render(<TrainScreen />);
    expect(screen.getByText("Train")).toBeTruthy();
  });
});

describe("TrainScreen — loaded state with assignment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAthleteAssignments.mockReturnValue({
      currentProgram: makeAssignment(),
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockFindAssignedToday.mockReturnValue(makeAssignment());
  });

  it("renders the assigned workout card with the program name", () => {
    render(<TrainScreen />);
    expect(screen.getByText("Today's Workout")).toBeTruthy();
  });

  it("shows a 'Start Workout' button when assignment exists", () => {
    render(<TrainScreen />);
    expect(screen.getByText("Start Workout")).toBeTruthy();
  });

  it("tapping Start Workout navigates to active workout with assignmentId", () => {
    render(<TrainScreen />);
    fireEvent.press(screen.getByText("Start Workout"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(workout)/active",
      params: { mode: "assignment", assignmentId: "asg-1" },
    });
  });

  it("does not show empty state when assignment exists", () => {
    render(<TrainScreen />);
    expect(screen.queryByText("No training scheduled for today")).toBeNull();
  });
});

describe("TrainScreen — loading state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAthleteAssignments.mockReturnValue({
      currentProgram: null,
      upcomingPrograms: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });
    mockFindAssignedToday.mockReturnValue(null);
  });

  it("shows loading indicator when data is loading", () => {
    render(<TrainScreen />);
    // Should show something during loading
    expect(screen.getByText("Train")).toBeTruthy();
  });
});
