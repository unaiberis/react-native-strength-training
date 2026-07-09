// Tests for useProgramDetail rewired to getAssignment (T2).
const mockGetAssignment = jest.fn();

jest.mock("@/lib/pocketbase/services/program-assignments", () => ({
  getAssignment: (...args: any[]) => mockGetAssignment(...args),
  listAssignments: jest.fn(),
}));

import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProgramDetail } from "../useProgramDetail";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function rowWithTemplate() {
  return {
    id: "asg-b",
    athlete_id: "ath-1",
    coach_id: "coach-1",
    template_id: "tpl-1",
    assigned_at: "2026-07-01T00:00:00Z",
    started_at: "2026-07-05",
    completed_at: null,
    program_id: null,
    notes: null,
    team_id: null,
    status: "active" as const,
    created: "2026-07-01T00:00:00Z",
    updated: "2026-07-01T00:00:00Z",
  };
}

describe("useProgramDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls getAssignment(id) and returns program with placeholder name", async () => {
    mockGetAssignment.mockResolvedValue(rowWithTemplate());

    const { result } = renderHook(() => useProgramDetail("asg-b"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetAssignment).toHaveBeenCalledWith("asg-b");
    expect(result.current.program?.name).toBe("Untitled Program");
    expect(result.current.program?.phases).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("handles missing data gracefully (no throw, phases empty)", async () => {
    mockGetAssignment.mockResolvedValue(rowWithTemplate());

    const { result } = renderHook(() => useProgramDetail("asg-x"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.program?.phases).toEqual([]);
    expect(result.current.program?.name).toBe("Untitled Program");
  });

  it("falls back to program=null on hard error", async () => {
    mockGetAssignment.mockRejectedValue(new Error("not found"));

    const { result } = renderHook(() => useProgramDetail("asg-missing"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.program).toBeNull();
    expect(result.current.error).toBeDefined();
  });
});
