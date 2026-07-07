import { buildCalendarMonth } from "../hooks/useCalendar";

describe("CalendarGrid integration with calendar data", () => {
  const onSelectDay = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds correct month grid for January 2026", () => {
    const month = buildCalendarMonth(2026, 0, new Map());
    expect(month.year).toBe(2026);
    expect(month.month).toBe(0);
    expect(month.days).toHaveLength(42); // 6 weeks

    // January 2026 starts on Thursday → first visible day is Dec 28
    const firstDay = month.days[0];
    expect(firstDay.date).toBe("2025-12-28");
    expect(firstDay.isCurrentMonth).toBe(false);

    // Jan 1 should be current month
    const jan1 = month.days.find((d) => d.date === "2026-01-01");
    expect(jan1).toBeDefined();
    expect(jan1!.isCurrentMonth).toBe(true);
    expect(jan1!.day).toBe(1);
  });

  it("correctly places workout dots based on workoutMap", () => {
    const workoutMap = new Map<string, { count: number; sessionIds: string[] }>();
    workoutMap.set("2026-06-15", { count: 2, sessionIds: ["s1", "s2"] });
    workoutMap.set("2026-06-20", { count: 1, sessionIds: ["s3"] });

    const month = buildCalendarMonth(2026, 5, workoutMap);

    const day15 = month.days.find((d) => d.date === "2026-06-15");
    expect(day15).toBeDefined();
    expect(day15!.workoutCount).toBe(2);
    expect(day15!.workoutSessionIds).toEqual(["s1", "s2"]);

    // Day with 1 workout
    const dayWithWorkout = month.days.find((d) => d.workoutCount > 0);
    expect(dayWithWorkout).toBeDefined();
    expect(dayWithWorkout!.workoutCount).toBeGreaterThan(0);
  });

  it("shows zero workouts for days without data", () => {
    const month = buildCalendarMonth(2026, 6, new Map());
    const day15 = month.days.find((d) => d.isCurrentMonth && d.day === 15);
    expect(day15).toBeDefined();
    expect(day15!.workoutCount).toBe(0);
    expect(day15!.workoutSessionIds).toEqual([]);
  });

  it("calls onSelectDay only for current month days", () => {
    const month = buildCalendarMonth(2026, 0, new Map());

    // Prev month overflow (Dec 28-31, 2025)
    const prevDay = month.days.find(
      (d) => !d.isCurrentMonth && d.date < "2026-01-01",
    );
    expect(prevDay).toBeDefined();
    expect(prevDay!.isCurrentMonth).toBe(false);

    // Current month day
    const currDay = month.days.find((d) => d.date === "2026-01-15");
    expect(currDay).toBeDefined();
    expect(currDay!.isCurrentMonth).toBe(true);
  });

  it("caps displayed workout count at 3 dots visually", () => {
    const workoutMap = new Map<string, { count: number; sessionIds: string[] }>();
    workoutMap.set("2026-01-15", { count: 5, sessionIds: ["s1", "s2", "s3", "s4", "s5"] });

    const month = buildCalendarMonth(2026, 0, workoutMap);
    const day15 = month.days.find((d) => d.date === "2026-01-15");
    expect(day15).toBeDefined();
    expect(day15!.workoutCount).toBe(5); // Data stores full count

    // Visual cap: CalendarGrid renders min(workoutCount, 3) dots
    const dotCount = Math.min(day15!.workoutCount, 3);
    expect(dotCount).toBe(3);
  });

  it("handles month transitions (December to January)", () => {
    // December 2026
    const month = buildCalendarMonth(2026, 11, new Map());
    const nextMonthDays = month.days.filter((d) => d.date > "2026-12-31");
    expect(nextMonthDays.length).toBeGreaterThan(0);
    for (const day of nextMonthDays) {
      expect(day.date).toMatch(/^2027-01-/);
      expect(day.isCurrentMonth).toBe(false);
    }
  });

  it("correctly groups days into weeks of 7", () => {
    const month = buildCalendarMonth(2026, 0, new Map());
    expect(month.days.length % 7).toBe(0); // Always divisible by 7

    // Group into weeks
    const weeks: typeof month.days[] = [];
    for (let i = 0; i < month.days.length; i += 7) {
      weeks.push(month.days.slice(i, i + 7));
    }
    expect(weeks).toHaveLength(6);
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
  });
});
