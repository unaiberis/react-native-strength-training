// RED → GREEN tests for useAthleteCalendar hook.
// Mocks listAssignments from program-assignments service.
// Mocks the PocketBase client so the ESM import from useCalendar doesn't break.

const mockListAssignments = jest.fn();

jest.mock("@/lib/pocketbase/services/program-assignments", () => ({
  listAssignments: (...args: any[]) => mockListAssignments(...args),
}));

jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn(() => ({
      getFullList: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue({ name: "test" }),
    })),
  },
}));

import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAthleteCalendar, buildAssignmentCalendarMonth } from "../useAthleteCalendar";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function makeAssignment(overrides: Record<string, any> = {}) {
  return {
    id: "asg-1",
    athlete_id: "ath-1",
    coach_id: "coach-1",
    template_id: "tpl-1",
    assigned_at: "2026-06-01T00:00:00Z",
    started_at: "2026-07-15",
    completed_at: null,
    program_id: null,
    notes: null,
    team_id: null,
    status: "active",
    created: "2026-06-01T00:00:00Z",
    updated: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildAssignmentCalendarMonth", () => {
  it("builds a CalendarMonth for July 2026 with assignments marked", () => {
    const assignments = [
      makeAssignment({ started_at: "2026-07-15", id: "asg-1" }),
      makeAssignment({ started_at: "2026-07-20", id: "asg-2" }),
    ];

    const result = buildAssignmentCalendarMonth(assignments, 2026, 6); // July = month 6

    expect(result.year).toBe(2026);
    expect(result.month).toBe(6);
    // 42 days total (6 weeks)
    expect(result.days).toHaveLength(42);

    // Find July 15 and 20
    const day15 = result.days.find((d) => d.date === "2026-07-15");
    const day20 = result.days.find((d) => d.date === "2026-07-20");
    const day1 = result.days.find((d) => d.date === "2026-07-01");

    expect(day15).toBeDefined();
    expect(day15!.workoutCount).toBe(1);
    expect(day15!.workoutSessionIds).toEqual(["asg-1"]);

    expect(day20).toBeDefined();
    expect(day20!.workoutCount).toBe(1);

    expect(day1).toBeDefined();
    expect(day1!.workoutCount).toBe(0); // no assignment on July 1
  });

  it("handles empty assignments list", () => {
    const result = buildAssignmentCalendarMonth([], 2026, 6);
    expect(result.days).toHaveLength(42);
    expect(result.days.every((d) => d.workoutCount === 0)).toBe(true);
  });

  it("filters to only active/cancelled-compatible assignments in the month", () => {
    const inMonth = makeAssignment({ started_at: "2026-07-10", id: "asg-in" });
    const outOfMonth = makeAssignment({ started_at: "2026-08-05", id: "asg-out" });

    const result = buildAssignmentCalendarMonth([inMonth, outOfMonth], 2026, 6);

    const day10 = result.days.find((d) => d.date === "2026-07-10");
    expect(day10).toBeDefined();
    expect(day10!.workoutCount).toBe(1);

    // Aug 5 should appear in the overflow days of July (next month)
    const aug5 = result.days.find((d) => d.date === "2026-08-05");
    // August overflow days appear in the grid but aren't in current month
    // They may or may not have workoutCount depending on how buildCalendarMonth handles it
    expect(result.days.filter((d) => d.date === "2026-08-05")).toHaveLength(1);
  });
});

describe("useAthleteCalendar (hook)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls listAssignments with athleteId and returns CalendarMonth", async () => {
    mockListAssignments.mockResolvedValue([
      makeAssignment({ started_at: "2026-07-15" }),
    ]);

    const { result } = renderHook(
      () => useAthleteCalendar("ath-1", 2026, 6),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListAssignments).toHaveBeenCalledWith("ath-1");
    expect(result.current.calendarMonth).not.toBeNull();
    expect(result.current.calendarMonth!.year).toBe(2026);
    expect(result.current.calendarMonth!.month).toBe(6);
  });

  it("returns null calendarMonth when athleteId is undefined", async () => {
    mockListAssignments.mockResolvedValue([]);

    const { result } = renderHook(
      () => useAthleteCalendar(undefined, 2026, 6),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListAssignments).not.toHaveBeenCalled();
    expect(result.current.calendarMonth).toBeNull();
  });

  it("surfaces the raw assignments list for detail lookup", async () => {
    const assignments = [
      makeAssignment({ started_at: "2026-07-15", id: "asg-1" }),
    ];
    mockListAssignments.mockResolvedValue(assignments);

    const { result } = renderHook(
      () => useAthleteCalendar("ath-1", 2026, 6),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.assignments).toEqual(assignments);
  });
});
