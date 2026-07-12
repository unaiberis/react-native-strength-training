/**
 * Tests for WeekCalendarSection component.
 *
 * Validates rendering of week strip, workout list, empty state,
 * loading skeletons, and the "Today" button.
 */

// ─── Mocks (before imports) ──────────────────────────────────────────────

const mockUseWeekCalendar = jest.fn();
const mockUseSessionsForDate = jest.fn();

jest.mock("../../hooks/useWeekCalendar", () => ({
  useWeekCalendar: (...args: any[]) => mockUseWeekCalendar(...args),
}));

jest.mock("../../hooks/useSessionsForDate", () => ({
  useSessionsForDate: (...args: any[]) => mockUseSessionsForDate(...args),
}));

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Tabs: () => null,
}));

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { WeekCalendarSection } from "../WeekCalendarSection";
import type { WeekDay } from "../../hooks/useWeekCalendar";

// ─── Fixtures ───────────────────────────────────────────────────────────────

function buildWeekDays(): WeekDay[] {
  return [
    { date: "2026-07-06", dayName: "M", dayNumber: 6, isToday: false, isSelected: false, hasWorkout: false, hasCompletedWorkout: false },
    { date: "2026-07-07", dayName: "T", dayNumber: 7, isToday: false, isSelected: false, hasWorkout: true, hasCompletedWorkout: false },
    { date: "2026-07-08", dayName: "W", dayNumber: 8, isToday: true, isSelected: true, hasWorkout: true, hasCompletedWorkout: true },
    { date: "2026-07-09", dayName: "T", dayNumber: 9, isToday: false, isSelected: false, hasWorkout: false, hasCompletedWorkout: false },
    { date: "2026-07-10", dayName: "F", dayNumber: 10, isToday: false, isSelected: false, hasWorkout: false, hasCompletedWorkout: false },
    { date: "2026-07-11", dayName: "S", dayNumber: 11, isToday: false, isSelected: false, hasWorkout: false, hasCompletedWorkout: false },
    { date: "2026-07-12", dayName: "S", dayNumber: 12, isToday: false, isSelected: false, hasWorkout: false, hasCompletedWorkout: false },
  ];
}

function defaultWeekCalendar() {
  return {
    weekDays: buildWeekDays(),
    selectedDate: "2026-07-08",
    weekLabel: "JUL 6 — 12",
    selectDate: jest.fn(),
    goToPrevWeek: jest.fn(),
    goToNextWeek: jest.fn(),
    goToToday: jest.fn(),
    isLoading: false,
  };
}

function defaultSessionsForDate() {
  return {
    sessions: [
      { id: "sess-1", templateName: "Upper Body", status: "completed" as const, startedAt: "2026-07-08T10:00:00.000Z", durationMinutes: 60, exerciseCount: 4 },
    ],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  };
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe("WeekCalendarSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWeekCalendar.mockReturnValue(defaultWeekCalendar());
    mockUseSessionsForDate.mockReturnValue(defaultSessionsForDate());
  });

  it("renders week strip with 7 days", () => {
    const { getByText } = render(React.createElement(WeekCalendarSection));

    // Day abbreviations
    expect(getByText("M")).toBeTruthy();
    expect(getByText("W")).toBeTruthy();
    expect(getByText("F")).toBeTruthy();
    // Week label
    expect(getByText("JUL 6 — 12")).toBeTruthy();
  });

  it("renders workout list when sessions exist", () => {
    const { getByText } = render(React.createElement(WeekCalendarSection));

    expect(getByText("Upper Body")).toBeTruthy();
    expect(getByText("Completed")).toBeTruthy();
  });

  it("renders empty state when no sessions", () => {
    mockUseSessionsForDate.mockReturnValue({
      ...defaultSessionsForDate(),
      sessions: [],
    });

    const { getByText } = render(React.createElement(WeekCalendarSection));

    expect(getByText("Rest day — No workout scheduled")).toBeTruthy();
  });

  it("renders loading skeleton when week is loading", () => {
    mockUseWeekCalendar.mockReturnValue({
      ...defaultWeekCalendar(),
      isLoading: true,
    });

    const { queryByText } = render(React.createElement(WeekCalendarSection));

    // The skeleton state should NOT render the week label
    expect(queryByText("JUL 6 — 12")).toBeNull();
  });

  it("renders loading skeleton when sessions are loading", () => {
    mockUseSessionsForDate.mockReturnValue({
      ...defaultSessionsForDate(),
      isLoading: true,
      sessions: [],
    });

    const { queryByText } = render(React.createElement(WeekCalendarSection));

    // Week strip should still show (week data loaded), but no sessions
    expect(queryByText("Upper Body")).toBeNull();
  });

  it("'Today' button calls goToToday", () => {
    const goToToday = jest.fn();
    mockUseWeekCalendar.mockReturnValue({
      ...defaultWeekCalendar(),
      goToToday,
    });

    const { getByText } = render(React.createElement(WeekCalendarSection));

    // Find and press the "Today" button
    fireEvent.press(getByText("Today"));
    expect(goToToday).toHaveBeenCalledTimes(1);
  });

  it("renders error state when query fails", () => {
    mockUseSessionsForDate.mockReturnValue({
      ...defaultSessionsForDate(),
      error: new Error("Failed to fetch"),
      sessions: [],
    });

    const { getByText } = render(React.createElement(WeekCalendarSection));

    // Should show the empty/error state
    expect(getByText("Rest day — No workout scheduled")).toBeTruthy();
  });

  it("selecting a day calls selectDate", () => {
    const selectDate = jest.fn();
    mockUseWeekCalendar.mockReturnValue({
      ...defaultWeekCalendar(),
      selectDate,
    });

    const { getByLabelText } = render(React.createElement(WeekCalendarSection));

    // Press a day cell — "M 6" is Monday July 6
    fireEvent.press(getByLabelText("M 6"));
    expect(selectDate).toHaveBeenCalledWith("2026-07-06");
  });

  // ── Navigation callbacks ─────────────────────────────────────────────

  it("navigates to /(tabs)/train when pressing 'Start a Workout' in empty state", () => {
    mockUseSessionsForDate.mockReturnValue({
      ...defaultSessionsForDate(),
      sessions: [],
    });

    const { getByText } = render(React.createElement(WeekCalendarSection));

    fireEvent.press(getByText("Start a Workout"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/train");
  });

  it("navigates to history when tapping a completed workout", () => {
    mockUseSessionsForDate.mockReturnValue({
      ...defaultSessionsForDate(),
      sessions: [
        { id: "sess-completed", templateName: "Leg Day", status: "completed", startedAt: "2026-07-08T10:00:00.000Z", durationMinutes: 60, exerciseCount: 4 },
      ],
    });

    const { getByText } = render(React.createElement(WeekCalendarSection));

    fireEvent.press(getByText("Leg Day"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/history/sess-completed");
  });

  it("navigates to train tab when tapping an assigned workout", () => {
    mockUseSessionsForDate.mockReturnValue({
      ...defaultSessionsForDate(),
      sessions: [
        { id: "sess-assigned", templateName: "Future Workout", status: "assigned", startedAt: null, durationMinutes: null, exerciseCount: 0 },
      ],
    });

    const { getByText } = render(React.createElement(WeekCalendarSection));

    fireEvent.press(getByText("Future Workout"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/train");
  });

  it("navigates to active workout when tapping an in-progress workout", () => {
    mockUseSessionsForDate.mockReturnValue({
      ...defaultSessionsForDate(),
      sessions: [
        { id: "sess-active", templateName: "Push Day", status: "active", startedAt: "2026-07-08T10:00:00.000Z", durationMinutes: 30, exerciseCount: 3 },
      ],
    });

    const { getByText } = render(React.createElement(WeekCalendarSection));

    fireEvent.press(getByText("Push Day"));
    expect(mockPush).toHaveBeenCalledWith("/(workout)/active");
  });
});
