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

function rowWithTemplate(templateName = "Hypertrophy Block") {
  return {
    id: "asg-b",
    athlete: "ath-1",
    coach: "coach-1",
    template: "tpl-1",
    start_date: "2026-07-05",
    team_id: null,
    status: "active" as const,
    created: "2026-07-01T00:00:00Z",
    updated: "2026-07-01T00:00:00Z",
    expand: {
      template: {
        id: "tpl-1",
        user_id: "coach-1",
        name: templateName,
        description: "8-week plan",
        program_block_id: null,
        is_public: false,
        created: "",
        updated: "",
      },
    },
  };
}

describe("useProgramDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls getAssignment(id) and maps the template name into program.name", async () => {
    mockGetAssignment.mockResolvedValue(rowWithTemplate("Strength Phase"));

    const { result } = renderHook(() => useProgramDetail("asg-b"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetAssignment).toHaveBeenCalledWith("asg-b");
    expect(result.current.program?.name).toBe("Strength Phase");
    expect(result.current.program?.phases).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("null-guards when expand.template is absent (no throw, phases empty)", async () => {
    const row = {
      ...rowWithTemplate(),
      expand: { template: null },
    };
    mockGetAssignment.mockResolvedValue(row);

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
