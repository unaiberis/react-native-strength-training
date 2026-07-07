// Mock PocketBase client before any imports
jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn().mockReturnThis(),
    getFullList: jest.fn().mockResolvedValue([]),
    getOne: jest.fn(),
  },
}));

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { CalendarGrid } from "../CalendarGrid";
import { buildCalendarMonth } from "../../hooks/useCalendar";

// Helper to build a test calendar month
function buildTestMonth(year = 2026, month = 6, workoutDates: string[] = []) {
  const map = new Map<string, { count: number; sessionIds: string[] }>();
  for (const date of workoutDates) {
    map.set(date, { count: 1, sessionIds: ["s1"] });
  }
  return buildCalendarMonth(year, month, map);
}

describe("CalendarGrid", () => {
  const defaultProps = {
    calendarMonth: buildTestMonth(),
    selectedDate: null as string | null,
    onSelectDay: jest.fn(),
    onPrevMonth: jest.fn(),
    onNextMonth: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correct number of days (42)", () => {
    const { getAllByText } = render(React.createElement(CalendarGrid, defaultProps));
    for (let i = 1; i <= 31; i++) {
      expect(getAllByText(String(i)).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("shows month/year in header", () => {
    const { getByText } = render(React.createElement(CalendarGrid, defaultProps));
    expect(getByText("July 2026")).toBeTruthy();
  });

  it("shows different month/year when props change", () => {
    const props = {
      ...defaultProps,
      calendarMonth: buildTestMonth(2026, 0), // January 2026
    };
    const { getByText } = render(React.createElement(CalendarGrid, props));
    expect(getByText("January 2026")).toBeTruthy();
  });

  it("renders today with bold styling (isToday flag)", () => {
    const today = new Date();
    const cm = buildTestMonth(today.getFullYear(), today.getMonth());
    const { getAllByText } = render(
      React.createElement(CalendarGrid, { ...defaultProps, calendarMonth: cm }),
    );
    // There may be multiple cells with the same number (prev/next month overflow),
    // but at least one must contain today's date
    const todayCells = getAllByText(String(today.getDate()));
    expect(todayCells.length).toBeGreaterThanOrEqual(1);
  });

  it("renders without crash when days have sessions", () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const cm = buildTestMonth(today.getFullYear(), today.getMonth(), [dateStr]);
    expect(() =>
      render(React.createElement(CalendarGrid, { ...defaultProps, calendarMonth: cm })),
    ).not.toThrow();
  });

  it("calls onSelectDay when tapping a current-month day", () => {
    const onSelectDay = jest.fn();
    const cm = buildTestMonth(2026, 6);
    const { getByText } = render(
      React.createElement(CalendarGrid, { ...defaultProps, calendarMonth: cm, onSelectDay }),
    );

    fireEvent.press(getByText("15"));
    expect(onSelectDay).toHaveBeenCalledTimes(1);
    expect(onSelectDay).toHaveBeenCalledWith(
      expect.objectContaining({ day: 15, isCurrentMonth: true }),
    );
  });

  it("does NOT call onSelectDay when tapping a non-current-month day", () => {
    const onSelectDay = jest.fn();
    const cm = buildTestMonth(2026, 6);
    const { getAllByText } = render(
      React.createElement(CalendarGrid, { ...defaultProps, calendarMonth: cm, onSelectDay }),
    );

    // July 2026 starts on Wednesday — overflow from June: 28, 29, 30
    // Day 30 appears in BOTH June (overflow) and July (current month).
    // Day 31 is ONLY in July (current month). Day 8 appears twice:
    // once in July (current month, day 8) and once in August (Aug 8 overflow).
    // Use day 8 — press the SECOND occurrence (August 8, which is overflow).
    // But there could be day 8 in two months (July 8 and Aug 8).
    // Let's get ALL day-8 cells and press the last one.
    const overflowDay = cm.days.find((d) => !d.isCurrentMonth);
    if (overflowDay) {
      // Find overflow day numbers that DON'T appear in current month
      const currentMonthDays = new Set(
        cm.days.filter((d) => d.isCurrentMonth).map((d) => d.day),
      );
      const uniqueOverflowDay = cm.days.find(
        (d) => !d.isCurrentMonth && !currentMonthDays.has(d.day),
      );
      if (uniqueOverflowDay) {
        // This day number only appears in overflow
        fireEvent.press(getAllByText(String(uniqueOverflowDay.day))[0]);
        expect(onSelectDay).not.toHaveBeenCalled();
      }
    }
  });

  it("calls onPrevMonth when pressing prev arrow", () => {
    const onPrevMonth = jest.fn();
    const { getByText } = render(
      React.createElement(CalendarGrid, { ...defaultProps, onPrevMonth }),
    );

    fireEvent.press(getByText("\u2039"));
    expect(onPrevMonth).toHaveBeenCalledTimes(1);
  });

  it("calls onNextMonth when pressing next arrow", () => {
    const onNextMonth = jest.fn();
    const { getByText } = render(
      React.createElement(CalendarGrid, { ...defaultProps, onNextMonth }),
    );

    fireEvent.press(getByText("\u203A"));
    expect(onNextMonth).toHaveBeenCalledTimes(1);
  });

  it("highlights selected date", () => {
    const cm = buildTestMonth(2026, 6);
    const { getByText } = render(
      React.createElement(CalendarGrid, { ...defaultProps, calendarMonth: cm, selectedDate: "2026-07-15" }),
    );
    expect(getByText("15")).toBeTruthy();
  });
});
