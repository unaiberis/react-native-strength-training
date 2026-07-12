// RED → GREEN tests for the coach per-athlete calendar screen.

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "ath-1" }),
  useSegments: () => [],
  Stack: { Screen: () => null },
  Tabs: () => null,
}));

jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn(() => ({
      getFullList: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue({ name: "test" }),
    })),
  },
}));

const mockUseAthleteDetail = jest.fn();
jest.mock("@/features/coach/hooks/useAthleteDetail", () => ({
  useAthleteDetail: (...args: any[]) => mockUseAthleteDetail(...args),
  useUnlinkAthlete: jest.fn(() => ({ mutate: jest.fn() })),
}));

const mockUseAthleteCalendar = jest.fn();
jest.mock("@/features/coach/hooks/useAthleteCalendar", () => ({
  useAthleteCalendar: (...args: any[]) => mockUseAthleteCalendar(...args),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import CoachAthleteCalendarScreen from "../[id]/calendar";

function makeCalendarMonth(assignments: { date: string; id: string }[]) {
  // Build a minimal CalendarMonth skeleton for test assertions
  const days = [];
  // 31 days in July 2026
  for (let d = 1; d <= 31; d++) {
    const dateStr = `2026-07-${String(d).padStart(2, "0")}`;
    const matching = assignments.find((a) => a.date === dateStr);
    days.push({
      date: dateStr,
      day: d,
      isCurrentMonth: true,
      isToday: false,
      workoutCount: matching ? 1 : 0,
      workoutSessionIds: matching ? [matching.id] : [],
    });
  }
  // Add overflow days to reach 42
  for (let d = 1; days.length < 42; d++) {
    const dateStr = `2026-08-${String(d).padStart(2, "0")}`;
    days.push({
      date: dateStr,
      day: d,
      isCurrentMonth: false,
      isToday: false,
      workoutCount: 0,
      workoutSessionIds: [],
    });
  }
  return { year: 2026, month: 6, days };
}

describe("CoachAthleteCalendarScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAthleteDetail.mockReturnValue({
      athlete: { id: "ath-1", displayName: "Sam Jones" },
      assignments: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseAthleteCalendar.mockReturnValue({
      calendarMonth: makeCalendarMonth([]),
      isLoading: false,
      assignments: [],
      refetch: jest.fn(),
    });
  });

  it("renders the calendar grid with month navigation", () => {
    render(<CoachAthleteCalendarScreen />);
    // Stack.Screen header is mocked, but the calendar grid renders
    expect(screen.getByText("‹")).toBeTruthy();
    expect(screen.getByText("›")).toBeTruthy();
  });

  it("renders without crashing in loading state", () => {
    mockUseAthleteCalendar.mockReturnValue({
      calendarMonth: null,
      isLoading: true,
      assignments: [],
      refetch: jest.fn(),
    });
    // Should render without throwing
    expect(() => render(<CoachAthleteCalendarScreen />)).not.toThrow();
  });

  it("navigates to assign with date param when tapping an empty date", () => {
    render(<CoachAthleteCalendarScreen />);

    // Day 15 only appears once in the July grid (no overflow conflicts)
    const day15 = screen.getByText("15");
    fireEvent.press(day15);

    expect(mockPush).toHaveBeenCalledWith(
      "/(coach)/assign?athleteId=ath-1&athleteName=Sam%20Jones&date=2026-07-15",
    );
  });

  it("navigates to assignment detail when tapping a date with an assignment", () => {
    mockUseAthleteCalendar.mockReturnValue({
      calendarMonth: makeCalendarMonth([{ date: "2026-07-15", id: "asg-1" }]),
      isLoading: false,
      assignments: [
        {
          id: "asg-1",
          athlete_id: "ath-1",
          started_at: "2026-07-15",
          status: "active",
        },
      ],
      refetch: jest.fn(),
    });

    render(<CoachAthleteCalendarScreen />);

    // Day 15 only appears once in the July grid
    const day15 = screen.getByText("15");
    fireEvent.press(day15);

    expect(mockPush).toHaveBeenCalledWith("/(coach)/assignment/asg-1");
  });
});
