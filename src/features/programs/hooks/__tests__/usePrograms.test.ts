// Tests for usePrograms delegating to useAthleteAssignments (T2).
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { usePrograms } from "../usePrograms";
import { computeProgramProgress } from "../../program-types";

// Mock the athlete-assignments hook so usePrograms is an isolated delegation.
const mockUseAthleteAssignments = jest.fn();

jest.mock("../useAthleteAssignments", () => ({
  useAthleteAssignments: (...args: any[]) => mockUseAthleteAssignments(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("usePrograms", () => {
  beforeEach(() => jest.clearAllMocks());

  it("delegates currentProgram / upcomingPrograms / isLoading / error unchanged", () => {
    const fixture = {
      currentProgram: {
        id: "asg-1",
        name: "Hypertrophy Block",
        description: "",
        startDate: "2026-07-01",
        endDate: "2026-08-26",
        totalWeeks: 8,
        weeksCompleted: 0,
        progressPercent: 0,
        phases: [],
        status: "active" as const,
      },
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    };
    mockUseAthleteAssignments.mockReturnValue(fixture);

    const { result } = renderHook(() => usePrograms(), {
      wrapper: createWrapper(),
    });

    expect(result.current.currentProgram).toBe(fixture.currentProgram);
    expect(result.current.upcomingPrograms).toBe(fixture.upcomingPrograms);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("keeps the ProgramSummary return shape stable", () => {
    const fixture = {
      currentProgram: null,
      upcomingPrograms: [],
      isLoading: true,
      error: undefined,
      refetch: jest.fn(),
    };
    mockUseAthleteAssignments.mockReturnValue(fixture);

    const { result } = renderHook(() => usePrograms(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveProperty("currentProgram");
    expect(result.current).toHaveProperty("upcomingPrograms");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
  });
});

describe("computeProgramProgress", () => {
  it("returns 0 before start", () => {
    const r = computeProgramProgress("2026-08-01", "2026-09-26", 8);
    expect(r.weeksCompleted).toBe(0);
    expect(r.progressPercent).toBe(0);
  });

  it("returns 100 after end", () => {
    const r = computeProgramProgress("2026-01-01", "2026-02-26", 8);
    expect(r.weeksCompleted).toBe(8);
    expect(r.progressPercent).toBe(100);
  });

  it("computes partial progress mid-program", () => {
    const r = computeProgramProgress("2026-07-01", "2026-08-26", 8);
    expect(r.weeksCompleted).toBeGreaterThanOrEqual(0);
    expect(r.progressPercent).toBeGreaterThan(0);
    expect(r.progressPercent).toBeLessThanOrEqual(100);
  });
});
