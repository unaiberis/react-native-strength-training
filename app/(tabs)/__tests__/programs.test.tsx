// Render tests for the Programs tab wired to real usePrograms data (T3).
const mockUsePrograms = jest.fn();

jest.mock("@/features/programs/hooks/usePrograms", () => ({
  usePrograms: (...args: any[]) => mockUsePrograms(...args),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import ProgramsScreen from "../programs";

function currentProgram(name = "Hypertrophy Block") {
  return {
    id: "asg-b",
    name,
    description: "8-week plan",
    startDate: "2026-07-05",
    endDate: "2026-08-30",
    totalWeeks: 8,
    weeksCompleted: 0,
    progressPercent: 0,
    phases: [
      {
        id: "phase-tpl-1",
        name,
        weekStart: 1,
        weekEnd: 8,
        workoutCount: 1,
      },
    ],
    status: "active" as const,
  };
}

function upcomingProgram(name = "Peaking Phase") {
  return {
    id: "asg-c",
    name,
    description: "3-week plan",
    startDate: "2026-08-01",
    endDate: "2026-08-22",
    totalWeeks: 3,
    weeksCompleted: 0,
    progressPercent: 0,
    phases: [],
    status: "upcoming" as const,
  };
}

describe("ProgramsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the current program card with Active status when assigned", () => {
    mockUsePrograms.mockReturnValue({
      currentProgram: currentProgram(),
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProgramsScreen />);

    expect(screen.getByText("Hypertrophy Block")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("renders upcoming programs under the Upcoming section", () => {
    mockUsePrograms.mockReturnValue({
      currentProgram: currentProgram(),
      upcomingPrograms: [upcomingProgram()],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProgramsScreen />);

    expect(screen.getAllByText("Upcoming").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Peaking Phase")).toBeTruthy();
  });

  it("shows the EmptyState when there are 0 assignments", () => {
    mockUsePrograms.mockReturnValue({
      currentProgram: null,
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProgramsScreen />);

    expect(screen.getByText("No Program Assigned")).toBeTruthy();
  });

  it("shows EmptyState in the current slot when only an upcoming program exists", () => {
    mockUsePrograms.mockReturnValue({
      currentProgram: null,
      upcomingPrograms: [upcomingProgram()],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProgramsScreen />);

    expect(screen.getByText("No Program Assigned")).toBeTruthy();
    expect(screen.getByText("Peaking Phase")).toBeTruthy();
  });

  it("shows the skeleton while loading", () => {
    mockUsePrograms.mockReturnValue({
      currentProgram: null,
      upcomingPrograms: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProgramsScreen />);

    // No crash; loading branch renders the skeleton instead of the list.
    expect(screen.queryByText("No Program Assigned")).toBeNull();
  });

  it("invokes refetch on pull-to-refresh", () => {
    const refetch = jest.fn();
    mockUsePrograms.mockReturnValue({
      currentProgram: currentProgram(),
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch,
    });

    const { ScrollView, RefreshControl } = require("react-native");
    const { UNSAFE_getByType } = render(<ProgramsScreen />);

    const scroll = UNSAFE_getByType(ScrollView);
    const refreshControl = scroll.props.refreshControl;
    expect(refreshControl).toBeTruthy();
    // RefreshControl is passed as a prop (not a rendered child), so invoke its
    // onRefresh handler directly to verify the pull-to-refresh wiring.
    refreshControl.props.onRefresh();

    expect(refetch).toHaveBeenCalled();
  });

  it("fires navigation press handlers (current + upcoming + routines) without crashing", () => {
    mockUsePrograms.mockReturnValue({
      currentProgram: currentProgram(),
      upcomingPrograms: [upcomingProgram()],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { UNSAFE_getAllByType } = render(<ProgramsScreen />);

    // Exercise every inline onPress handler so the branches are covered.
    UNSAFE_getAllByType(Button).forEach((btn: any) =>
      fireEvent.press(btn),
    );
    UNSAFE_getAllByType(Card).forEach((card: any) =>
      fireEvent.press(card),
    );
  });
});
