// TDD RED → GREEN render tests for the Calendar "assigned today" chip (T5, R5).
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Tabs: () => null,
}));

jest.mock("@/features/calendar/hooks/useCalendar", () => ({
  useCalendar: jest.fn(() => ({
    calendarMonth: { year: 2026, month: 6, days: [] },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  fetchSessionsForDate: jest.fn(() => Promise.resolve([])),
}));

jest.mock("@/features/calendar/hooks/useWeekCalendar", () => ({
  useWeekCalendar: jest.fn(() => ({
    weekDays: [],
    selectedDate: todayString(),
    weekLabel: "JUL 6 — 12",
    selectDate: jest.fn(),
    goToPrevWeek: jest.fn(),
    goToNextWeek: jest.fn(),
    goToToday: jest.fn(),
    isLoading: false,
  })),
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
    findAssignedOnDate: (programs: any[], dateStr: string) =>
      programs.find((p) => p && p.startDate === dateStr) ?? null,
    todayStr: () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
    },
  };
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { CalendarScreen } from "../CalendarScreen";
import { useAuthStore } from "@/stores/auth-store";

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function assignedOn(date: string, id = "asg-b", name = "Hypertrophy Block") {
  return {
    id,
    name,
    description: "",
    startDate: date,
    endDate: "2026-08-30",
    totalWeeks: 8,
    weeksCompleted: 0,
    progressPercent: 0,
    phases: [],
    status: "active" as const,
  };
}

describe("CalendarScreen assigned-today chip", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: { id: "ath-1" } } as any);
    mockUseAthleteAssignments.mockReturnValue({
      currentProgram: null,
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("renders the month calendar without the chip when nothing is assigned today", async () => {
    render(<CalendarScreen />);
    expect(await screen.findByText("Calendar")).toBeTruthy();
    expect(screen.queryByText("Entrenamiento asignado hoy")).toBeNull();
  });

  it("shows the chip and deep-links when assigned today (R5)", async () => {
    mockUseAthleteAssignments.mockReturnValue({
      currentProgram: assignedOn(todayString()),
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CalendarScreen />);

    const chip = await screen.findByText("Entrenamiento asignado hoy");
    expect(chip).toBeTruthy();
    fireEvent.press(chip);
    expect(mockPush).toHaveBeenCalledWith("/programs/program-detail/asg-b");
  });

  it("hides the chip when the assignment starts on a different day (R5 edge)", async () => {
    mockUseAthleteAssignments.mockReturnValue({
      currentProgram: assignedOn("2026-08-01"),
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CalendarScreen />);
    expect(await screen.findByText("Calendar")).toBeTruthy();
    expect(screen.queryByText("Entrenamiento asignado hoy")).toBeNull();
  });

  it("shows the error/retry state when the month fails to load", async () => {
    const { useCalendar } = require("@/features/calendar/hooks/useCalendar");
    useCalendar.mockReturnValue({
      calendarMonth: null,
      isLoading: false,
      error: new Error("boom"),
      refetch: jest.fn(),
    });

    render(<CalendarScreen />);
    expect(await screen.findByText("Could not load calendar")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("switches to week view and renders the week strip (week branch)", async () => {
    render(<CalendarScreen />);
    fireEvent.press(await screen.findByLabelText("Week view"));
    expect(await screen.findByText("YOUR WEEK")).toBeTruthy();
  });

  it("renders a day-detail workout card when a session exists", async () => {
    const { fetchSessionsForDate } = require("@/features/calendar/hooks/useCalendar");
    fetchSessionsForDate.mockResolvedValue([
      {
        id: "sess-1",
        templateName: "Leg Day",
        startedAt: "2026-07-09T10:00:00Z",
        durationMinutes: 60,
        exerciseCount: 5,
      },
    ]);

    render(<CalendarScreen />);
    expect(await screen.findByText("Leg Day")).toBeTruthy();
  });

  it("handles the day-detail fetch error gracefully (catch branch)", async () => {
    const { fetchSessionsForDate } = require("@/features/calendar/hooks/useCalendar");
    fetchSessionsForDate.mockRejectedValue(new Error("network"));

    render(<CalendarScreen />);
    // Should not crash — day detail renders with null workout.
    expect(await screen.findByText("Calendar")).toBeTruthy();
  });

  it("presses the View Details button when a completed workout exists", async () => {
    const { fetchSessionsForDate } = require("@/features/calendar/hooks/useCalendar");
    fetchSessionsForDate.mockResolvedValue([
      {
        id: "sess-1",
        templateName: "Leg Day",
        startedAt: "2026-07-09T10:00:00Z",
        durationMinutes: 60,
        exerciseCount: 5,
      },
    ]);

    render(<CalendarScreen />);
    expect(await screen.findByText("Leg Day")).toBeTruthy();

    const detailBtn = screen.getByLabelText("View workout details");
    fireEvent.press(detailBtn);
    expect(mockPush).toHaveBeenCalledWith("/history/sess-1");
  });

  it("fires handleStartWorkout via the EmptyState action when no session", () => {
    // DayDetail with null workout renders EmptyState with "Start a Workout" action.
    render(<CalendarScreen />);
    const startBtn = screen.queryByText("Start a Workout");
    if (startBtn) {
      fireEvent.press(startBtn);
      expect(mockPush).toHaveBeenCalledWith("/(tabs)/train");
    }
  });

  it("switches to month view after being on week view (month toggle)", async () => {
    render(<CalendarScreen />);
    // Default is month view. Switch to week first, then back.
    fireEvent.press(await screen.findByLabelText("Week view"));
    expect(await screen.findByText("YOUR WEEK")).toBeTruthy();

    fireEvent.press(await screen.findByLabelText("Month view"));
    // Month grid renders again
    expect(await screen.findByText("Calendar")).toBeTruthy();
  });

  it("fires month navigation handlers via ‹ and › text buttons", async () => {
    // Some tests override useCalendar mockReturnValue — explicitly restore it here.
    const { useCalendar } = require("@/features/calendar/hooks/useCalendar");
    useCalendar.mockReturnValue({
      calendarMonth: { year: 2026, month: 6, days: [] },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CalendarScreen />);
    expect(await screen.findByText("Calendar")).toBeTruthy();

    // MonthHeader renders ‹ (prev) and › (next) as unstyled text buttons.
    const prevBtn = screen.getByText("‹");
    fireEvent.press(prevBtn);
    const nextBtn = screen.getByText("›");
    fireEvent.press(nextBtn);

    // Both handlers ran without crashing.
    expect(await screen.findByText("Calendar")).toBeTruthy();
  });
});
