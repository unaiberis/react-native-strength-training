// Mock PocketBase client before any imports
jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn().mockReturnThis(),
    getFullList: jest.fn().mockResolvedValue([]),
    getOne: jest.fn(),
  },
}));

import { buildCalendarMonth } from "../useCalendar";

describe("buildCalendarMonth", () => {
  it("builds a 42-day grid for a given month", () => {
    // July 2026 starts on Wednesday (getDay = 3)
    const result = buildCalendarMonth(2026, 6, new Map());
    expect(result.days).toHaveLength(42);
    expect(result.year).toBe(2026);
    expect(result.month).toBe(6);
  });

  it("marks days with workouts", () => {
    const workoutMap = new Map<string, { count: number; sessionIds: string[] }>();
    workoutMap.set("2026-07-15", { count: 1, sessionIds: ["s1"] });
    workoutMap.set("2026-07-20", { count: 2, sessionIds: ["s2", "s3"] });

    const result = buildCalendarMonth(2026, 6, workoutMap);
    const day15 = result.days.find((d) => d.date === "2026-07-15");
    const day20 = result.days.find((d) => d.date === "2026-07-20");
    const day10 = result.days.find((d) => d.date === "2026-07-10");

    expect(day15?.workoutCount).toBe(1);
    expect(day15?.workoutSessionIds).toEqual(["s1"]);
    expect(day20?.workoutCount).toBe(2);
    expect(day20?.workoutSessionIds).toEqual(["s2", "s3"]);
    expect(day10?.workoutCount).toBe(0);
  });

  it("returns empty month with no dots and no crash", () => {
    // February 2025 has 28 days
    const result = buildCalendarMonth(2025, 1, new Map());
    const currentMonthDays = result.days.filter((d) => d.isCurrentMonth);
    expect(currentMonthDays).toHaveLength(28);
    currentMonthDays.forEach((d) => {
      expect(d.workoutCount).toBe(0);
    });
  });

  it("marks today correctly", () => {
    const today = new Date();
    const result = buildCalendarMonth(
      today.getFullYear(),
      today.getMonth(),
      new Map(),
    );
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const todayDay = result.days.find((d) => d.date === todayStr);
    expect(todayDay?.isToday).toBe(true);

    // Non-today days should not be marked
    const otherDays = result.days.filter((d) => d.date !== todayStr);
    expect(otherDays.every((d) => !d.isToday)).toBe(true);
  });

  it("includes overflow days from previous and next months", () => {
    // July 2026 starts on Wednesday — Mon-based index = 2
    const result = buildCalendarMonth(2026, 6, new Map());
    // First 2 days should be from June (Mon, Tue overflow)
    const prevMonthDays = result.days.slice(0, 2);
    expect(prevMonthDays.every((d) => !d.isCurrentMonth)).toBe(true);
    // Current month starts at index 2
    const currentIndex = result.days.findIndex((d) => d.isCurrentMonth && d.day === 1);
    expect(currentIndex).toBe(2);
  });
});
