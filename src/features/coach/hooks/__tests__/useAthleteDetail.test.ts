import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock the services
const mockGetAthlete = jest.fn();
const mockListAssignments = jest.fn();
jest.mock("@/lib/pocketbase/services/coach-athletes", () => ({
  getAthlete: (...args: any[]) => mockGetAthlete(...args),
  unlinkAthlete: jest.fn(),
}));
jest.mock("@/lib/pocketbase/services/program-assignments", () => ({
  listAssignmentsWithTemplateNames: (...args: any[]) => mockListAssignments(...args),
  listAssignments: jest.fn(),
}));
jest.mock("@/lib/pocketbase/services/templates", () => ({
  fetchTemplateNameMap: jest.fn().mockResolvedValue(new Map()),
}));

import { useAthleteDetail } from "../useAthleteDetail";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useAthleteDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches athlete profile and assignments", async () => {
    const athlete = {
      id: "a1",
      displayName: "Athlete One",
      email: "a1@test.com",
      role: "athlete" as const,
      coach: "coach-1",
      created: "2026-01-01T00:00:00Z",
      updated: "2026-01-01T00:00:00Z",
    };
    const assignments = [
      {
        id: "pa-1",
        athlete_id: "a1",
        coach_id: "coach-1",
        template_id: "tmpl-1",
        assigned_at: "2026-07-01T00:00:00Z",
        started_at: "2026-07-15",
        completed_at: null,
        program_id: null,
        notes: null,
        team_id: null,
        status: "active" as const,
        created: "2026-07-01T00:00:00Z",
        updated: "2026-07-01T00:00:00Z",
      },
    ];

    mockGetAthlete.mockResolvedValueOnce(athlete);
    mockListAssignments.mockResolvedValueOnce(assignments);

    const { result } = renderHook(() => useAthleteDetail("a1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetAthlete).toHaveBeenCalledWith("a1");
    expect(mockListAssignments).toHaveBeenCalledWith("a1");
    expect(result.current.athlete?.displayName).toBe("Athlete One");
    expect(result.current.assignments).toHaveLength(1);
  });

  it("handles undefined athleteId by disabling queries", async () => {
    const { result } = renderHook(() => useAthleteDetail(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.athlete).toBeNull();
    expect(result.current.assignments).toEqual([]);
  });

  it("handles athlete not found", async () => {
    mockGetAthlete.mockResolvedValueOnce(null);
    mockListAssignments.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useAthleteDetail("nonexistent"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.athlete).toBeNull();
    expect(result.current.assignments).toEqual([]);
  });
});
