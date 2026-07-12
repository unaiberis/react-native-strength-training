/**
 * Tests for useWeekCalendar hook.
 *
 * Mocks expo-sqlite for the in-memory DB and validates week generation,
 * navigation, workout detection, and date selection.
 */

// Mock expo-sqlite before any imports (needed by database.ts via dynamic import)
const mockGetAllAsync = jest.fn();

jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn().mockReturnThis(),
    getFullList: jest.fn().mockResolvedValue([]),
    getOne: jest.fn(),
  },
}));

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    getAllAsync: mockGetAllAsync,
    execAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    closeAsync: jest.fn(),
  }),
}));

import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWeekCalendar } from "../useWeekCalendar";
import { resetDb } from "@/lib/db/database";

// ─── Helpers ────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

/**
 * Parse a date string to get a Date at local midnight.
 */
function parseISODate(str: string): Date {
  return new Date(str + "T00:00:00");
}

/**
 * Get Monday of the week containing dateStr.
 */
function getExpectedMonday(dateStr: string): string {
  const d = parseISODate(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ─── Suite ──────────────────────────────────────────────────────────────

describe("useWeekCalendar", () => {
  beforeAll(() => {
    // Fix the system date so week generation is deterministic
    jest.useFakeTimers({ now: new Date("2026-07-08T12:00:00Z") });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetDb();
  });

  it("generates 7 week days starting on Monday", async () => {
    // July 8, 2026 is Wednesday → week starts Monday July 6
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useWeekCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.weekDays).toHaveLength(7);
    // Week starts Monday July 6, 2026
    expect(result.current.weekDays[0].date).toBe("2026-07-06");
    expect(result.current.weekDays[0].dayName).toBe("M");
    expect(result.current.weekDays[0].dayNumber).toBe(6);
    // Week ends Sunday July 12
    expect(result.current.weekDays[6].date).toBe("2026-07-12");
    expect(result.current.weekDays[6].dayName).toBe("S");
    expect(result.current.weekDays[6].dayNumber).toBe(12);
  });

  it("generates correct week label for same-month week", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useWeekCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // July 6 — July 12 (same month)
    expect(result.current.weekLabel).toBe("JUL 6 — 12");
  });

  it("generates correct week label for cross-month week", async () => {
    // July 8 is inside a week that's entirely July 6-12, let's test
    // a cross-month scenario by using goToPrevWeek to go back to
    // June 29 - July 5 week
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useWeekCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.goToPrevWeek();
    });

    // Week of June 29 (Mon) - July 5 (Sun)
    await waitFor(() => {
      expect(result.current.weekDays[0].date).toBe("2026-06-29");
    });
    expect(result.current.weekLabel).toContain("JUN");
    expect(result.current.weekLabel).toContain("JUL");
  });

  it("marks today correctly", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useWeekCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Today is July 8 (from fake timers)
    const today = result.current.weekDays.find((d) => d.date === "2026-07-08");
    expect(today?.isToday).toBe(true);

    const otherDays = result.current.weekDays.filter(
      (d) => d.date !== "2026-07-08",
    );
    expect(otherDays.every((d) => !d.isToday)).toBe(true);
  });

  it("selects today by default", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useWeekCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.selectedDate).toBe("2026-07-08");
  });

  it("marks selected date on all weekDays", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useWeekCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(
      result.current.weekDays.find((d) => d.date === "2026-07-08")?.isSelected,
    ).toBe(true);

    act(() => {
      result.current.selectDate("2026-07-10");
    });

    expect(result.current.selectedDate).toBe("2026-07-10");
    expect(
      result.current.weekDays.find((d) => d.date === "2026-07-10")?.isSelected,
    ).toBe(true);
    expect(
      result.current.weekDays.find((d) => d.date === "2026-07-08")?.isSelected,
    ).toBe(false);
  });

  it("navigates to previous week", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useWeekCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.goToPrevWeek();
    });

    await waitFor(() => {
      expect(result.current.weekDays[0].date).toBe("2026-06-29");
    });
    expect(result.current.weekDays[6].date).toBe("2026-07-05");
  });

  it("navigates to next week", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useWeekCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.goToNextWeek();
    });

    await waitFor(() => {
      expect(result.current.weekDays[0].date).toBe("2026-07-13");
    });
    expect(result.current.weekDays[6].date).toBe("2026-07-19");
  });

  it("goes back to today with goToToday", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useWeekCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.goToNextWeek();
      result.current.goToNextWeek();
    });

    act(() => {
      result.current.goToToday();
    });

    await waitFor(() => {
      expect(result.current.weekDays[0].date).toBe("2026-07-06");
    });
    expect(result.current.selectedDate).toBe("2026-07-08");
  });

  it("marks days with completed workouts", async () => {
    mockGetAllAsync.mockResolvedValue([
      { workout_date: "2026-07-06", has_completed: 1 },
      { workout_date: "2026-07-08", has_completed: 1 },
    ]);

    const { result } = renderHook(() => useWeekCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const mon = result.current.weekDays.find((d) => d.date === "2026-07-06");
    const wed = result.current.weekDays.find((d) => d.date === "2026-07-08");
    const tue = result.current.weekDays.find((d) => d.date === "2026-07-07");

    expect(mon?.hasWorkout).toBe(true);
    expect(mon?.hasCompletedWorkout).toBe(true);
    expect(wed?.hasWorkout).toBe(true);
    expect(wed?.hasCompletedWorkout).toBe(true);
    expect(tue?.hasWorkout).toBe(false);
    expect(tue?.hasCompletedWorkout).toBe(false);
  });

  it("marks days with non-completed workouts", async () => {
    mockGetAllAsync.mockResolvedValue([
      { workout_date: "2026-07-09", has_completed: 0 }, // active workout, not completed
    ]);

    const { result } = renderHook(() => useWeekCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const thu = result.current.weekDays.find((d) => d.date === "2026-07-09");
    expect(thu?.hasWorkout).toBe(true);
    expect(thu?.hasCompletedWorkout).toBe(false);
  });

  it("refetches when week changes (different query key)", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useWeekCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetAllAsync).toHaveBeenCalledTimes(1);
    const firstCall = mockGetAllAsync.mock.calls[0][1];

    act(() => {
      result.current.goToNextWeek();
    });

    await waitFor(() => {
      // Should have a new query with different date params
      expect(mockGetAllAsync).toHaveBeenCalledTimes(2);
    });
    const secondCall = mockGetAllAsync.mock.calls[1][1];
    expect(secondCall).not.toEqual(firstCall);
  });

  it("handles empty DB (no sessions)", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useWeekCalendar(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(
      result.current.weekDays.every((d) => !d.hasWorkout),
    ).toBe(true);
    expect(
      result.current.weekDays.every((d) => !d.hasCompletedWorkout),
    ).toBe(true);
  });
});
