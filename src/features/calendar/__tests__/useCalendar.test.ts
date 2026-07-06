import { describe, it, expect } from "vitest";
import { buildCalendarMonth } from "../hooks/useCalendar";

describe("buildCalendarMonth", () => {
  it("returns correct number of days (42 for 6-week grid)", () => {
    // January 2026 starts on Thursday
    const result = buildCalendarMonth(2026, 0, new Map());
    expect(result.days).toHaveLength(42);
    expect(result.year).toBe(2026);
    expect(result.month).toBe(0);
  });

  it("marks today correctly", () => {
    const today = new Date();
    const result = buildCalendarMonth(
      today.getFullYear(),
      today.getMonth(),
      new Map(),
    );
    const todayDay = result.days.find((d) => d.isToday);
    expect(todayDay).toBeDefined();
    expect(todayDay!.day).toBe(today.getDate());
    expect(todayDay!.isCurrentMonth).toBe(true);
  });

  it("sets workoutCount from workoutMap", () => {
    const year = 2026;
    const month = 5; // June
    const workoutMap = new Map<string, { count: number; sessionIds: string[] }>();
    workoutMap.set("2026-06-15", { count: 2, sessionIds: ["s1", "s2"] });
    workoutMap.set("2026-06-20", { count: 1, sessionIds: ["s3"] });

    const result = buildCalendarMonth(year, month, workoutMap);

    const day15 = result.days.find((d) => d.date === "2026-06-15");
    expect(day15).toBeDefined();
    expect(day15!.workoutCount).toBe(2);
    expect(day15!.workoutSessionIds).toEqual(["s1", "s2"]);

    const day20 = result.days.find((d) => d.date === "2026-06-20");
    expect(day20).toBeDefined();
    expect(day20!.workoutCount).toBe(1);
    expect(day20!.workoutSessionIds).toEqual(["s3"]);
  });

  it("shows zero workoutCount for days not in map", () => {
    const result = buildCalendarMonth(2026, 6, new Map());
    const someDay = result.days.find((d) => d.date === "2026-07-15");
    expect(someDay).toBeDefined();
    expect(someDay!.workoutCount).toBe(0);
    expect(someDay!.workoutSessionIds).toEqual([]);
  });

  it("includes previous month overflow days", () => {
    // May 2026 starts on Friday — overflow shows Apr 26-30
    const result = buildCalendarMonth(2026, 4, new Map());
    const prevMonthDays = result.days.filter((d) => !d.isCurrentMonth && d.date < "2026-05-01");
    expect(prevMonthDays.length).toBeGreaterThan(0);
    for (const day of prevMonthDays) {
      expect(day.isCurrentMonth).toBe(false);
    }
  });

  it("includes next month overflow days", () => {
    // May 2026 has 31 days, ends on Sunday — need overflow into June
    const result = buildCalendarMonth(2026, 4, new Map());
    const nextMonthDays = result.days.filter((d) => !d.isCurrentMonth && d.date > "2026-05-31");
    expect(nextMonthDays.length).toBeGreaterThan(0);
    for (const day of nextMonthDays) {
      expect(day.isCurrentMonth).toBe(false);
    }
  });

  it("handles December to January overflow correctly", () => {
    // December 2026
    const result = buildCalendarMonth(2026, 11, new Map());
    const nextMonthDays = result.days.filter((d) => d.date > "2026-12-31");
    for (const day of nextMonthDays) {
      expect(day.date).toMatch(/^2027-01-/);
    }
  });

  it("returns empty sessionIds array for days with no workouts", () => {
    const result = buildCalendarMonth(2026, 0, new Map());
    const day = result.days.find((d) => d.isCurrentMonth && d.day === 15);
    expect(day).toBeDefined();
    expect(day!.workoutSessionIds).toEqual([]);
  });
});
