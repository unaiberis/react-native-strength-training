import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock the auth store
const mockUserId = "coach-1";
jest.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: any) =>
    selector({ user: { id: mockUserId }, isOnline: true }),
}));

// Mock the service
const mockListAthletes = jest.fn();
jest.mock("@/lib/pocketbase/services/coach-athletes", () => ({
  listAthletes: (...args: any[]) => mockListAthletes(...args),
}));

import { useCoachDashboard } from "../useCoachDashboard";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useCoachDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns athlete summaries from listAthletes", async () => {
    const athletes = [
      {
        id: "a1",
        displayName: "Athlete One",
        email: "a1@test.com",
        lastWorkoutDate: "2026-07-01T00:00:00Z",
        totalWorkouts: 10,
        thisWeekWorkouts: 2,
        complianceRate: 0.8,
        totalVolumeKg: 5000,
      },
    ];
    mockListAthletes.mockResolvedValueOnce(athletes);

    const { result } = renderHook(() => useCoachDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListAthletes).toHaveBeenCalledWith("coach-1");
    expect(result.current.athletes).toHaveLength(1);
    expect(result.current.activeCount).toBe(1);
    expect(result.current.inactiveCount).toBe(0);
    expect(result.current.totalAthletes).toBe(1);
  });

  it("returns empty state when no athletes", async () => {
    mockListAthletes.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useCoachDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.athletes).toEqual([]);
    expect(result.current.activeCount).toBe(0);
    expect(result.current.totalAthletes).toBe(0);
  });

  it("handles errors gracefully", async () => {
    mockListAthletes.mockRejectedValueOnce(new Error("Fetch failed"));

    const { result } = renderHook(() => useCoachDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.athletes).toEqual([]);
  });
});
