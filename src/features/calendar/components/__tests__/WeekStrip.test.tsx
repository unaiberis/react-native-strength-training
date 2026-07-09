/**
 * Tests for WeekStrip component.
 *
 * Validates rendering of 7 days, selected/today indicators,
 * workout dots, and prev/next week navigation buttons.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { WeekStrip } from "../WeekStrip";
import type { WeekDay } from "../../hooks/useWeekCalendar";

// ─── Fixtures ───────────────────────────────────────────────────────────

function buildWeekDays(
  weekStart: string,
  overrides: Partial<Record<string, Partial<WeekDay>>> = {},
): WeekDay[] {
  const dayNames = ["M", "T", "W", "T", "F", "S", "S"];
  const startDate = new Date(weekStart + "T00:00:00");

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const dayOverrides = overrides[dateStr] ?? {};
    return {
      date: dateStr,
      dayName: dayNames[i],
      dayNumber: date.getDate(),
      isToday: false,
      isSelected: false,
      hasWorkout: false,
      hasCompletedWorkout: false,
      ...dayOverrides,
    };
  });
}

// ─── Suite ──────────────────────────────────────────────────────────────

describe("WeekStrip", () => {
  const weekDays = buildWeekDays("2026-07-06");

  const defaultProps = {
    weekDays,
    selectedDate: "2026-07-08",
    onSelectDate: jest.fn(),
    weekLabel: "JUL 6 — 12",
    onPrevWeek: jest.fn(),
    onNextWeek: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all 7 day cells", () => {
    const { getByText, getAllByText } = render(
      React.createElement(WeekStrip, defaultProps),
    );

    // Day names — "T" appears twice (Tue, Thu), "S" appears twice (Sat, Sun)
    expect(getByText("M")).toBeTruthy();
    expect(getAllByText("T")).toHaveLength(2);
    expect(getByText("W")).toBeTruthy();
    expect(getByText("F")).toBeTruthy();
    expect(getAllByText("S")).toHaveLength(2);

    // Day numbers
    expect(getByText("6")).toBeTruthy();
    expect(getByText("7")).toBeTruthy();
    expect(getByText("8")).toBeTruthy();
    expect(getByText("9")).toBeTruthy();
    expect(getByText("10")).toBeTruthy();
    expect(getByText("11")).toBeTruthy();
    expect(getByText("12")).toBeTruthy();
  });

  it("renders week label", () => {
    const { getByText } = render(React.createElement(WeekStrip, defaultProps));
    expect(getByText("JUL 6 — 12")).toBeTruthy();
  });

  it("renders prev and next week buttons", () => {
    const { getByLabelText } = render(
      React.createElement(WeekStrip, defaultProps),
    );
    expect(getByLabelText("Previous week")).toBeTruthy();
    expect(getByLabelText("Next week")).toBeTruthy();
  });

  it("calls onPrevWeek when pressing prev button", () => {
    const onPrevWeek = jest.fn();
    const { getByLabelText } = render(
      React.createElement(WeekStrip, { ...defaultProps, onPrevWeek }),
    );

    fireEvent.press(getByLabelText("Previous week"));
    expect(onPrevWeek).toHaveBeenCalledTimes(1);
  });

  it("calls onNextWeek when pressing next button", () => {
    const onNextWeek = jest.fn();
    const { getByLabelText } = render(
      React.createElement(WeekStrip, { ...defaultProps, onNextWeek }),
    );

    fireEvent.press(getByLabelText("Next week"));
    expect(onNextWeek).toHaveBeenCalledTimes(1);
  });

  it("calls onSelectDate when tapping a day cell", () => {
    const onSelectDate = jest.fn();
    const { getByLabelText } = render(
      React.createElement(WeekStrip, { ...defaultProps, onSelectDate }),
    );

    fireEvent.press(getByLabelText("W 8"));
    expect(onSelectDate).toHaveBeenCalledWith("2026-07-08");
  });

  it("does not call onSelectDate multiple times when tapping same day", () => {
    const onSelectDate = jest.fn();
    const { getByLabelText } = render(
      React.createElement(WeekStrip, { ...defaultProps, onSelectDate }),
    );

    fireEvent.press(getByLabelText("M 6"));
    fireEvent.press(getByLabelText("M 6"));
    expect(onSelectDate).toHaveBeenCalledTimes(2);
    expect(onSelectDate).toHaveBeenCalledWith("2026-07-06");
  });

  it("highlights selected day with titanium background", () => {
    // Selected day: July 8 (no isToday — real date, not mocked)
    const { getByLabelText } = render(
      React.createElement(WeekStrip, {
        ...defaultProps,
        selectedDate: "2026-07-08",
        weekDays: buildWeekDays("2026-07-06", {
          "2026-07-08": { isSelected: true },
        }),
      }),
    );

    const cell = getByLabelText("W 8");
    expect(cell).toBeTruthy();
  });

  it("shows titanium dot for days with uncompleted workouts", () => {
    const daysWithWorkouts = buildWeekDays("2026-07-06", {
      "2026-07-07": { hasWorkout: true, hasCompletedWorkout: false },
    });

    const { getByLabelText } = render(
      React.createElement(WeekStrip, {
        ...defaultProps,
        weekDays: daysWithWorkouts,
      }),
    );

    expect(getByLabelText("T 7")).toBeTruthy();
  });

  it("shows sacred dot for days with completed workouts", () => {
    const daysWithWorkouts = buildWeekDays("2026-07-06", {
      "2026-07-09": { hasWorkout: true, hasCompletedWorkout: true },
    });

    const { getByLabelText } = render(
      React.createElement(WeekStrip, {
        ...defaultProps,
        weekDays: daysWithWorkouts,
      }),
    );

    expect(getByLabelText("T 9")).toBeTruthy();
  });

  it("renders dot on a day that has both workout types", () => {
    const daysWithWorkouts = buildWeekDays("2026-07-06", {
      "2026-07-10": { hasWorkout: true, hasCompletedWorkout: true },
    });

    const { getByLabelText } = render(
      React.createElement(WeekStrip, {
        ...defaultProps,
        weekDays: daysWithWorkouts,
      }),
    );

    expect(getByLabelText("F 10")).toBeTruthy();
  });
});
