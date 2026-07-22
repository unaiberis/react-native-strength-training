import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock the auth store
const mockUserId = "coach-1";
jest.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: any) =>
    selector({ user: { id: mockUserId }, isOnline: true }),
}));

// Mock services
const mockListAthletes = jest.fn();
jest.mock("@/lib/pocketbase/services/coach-athletes", () => ({
  listAthletes: (...args: any[]) => mockListAthletes(...args),
}));

const mockGetFeedbackCounts = jest.fn();
jest.mock("@/lib/pocketbase/services/feedback", () => ({
  getFeedbackCountsForAthletes: (...args: any[]) => mockGetFeedbackCounts(...args),
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

  it("attaches feedback counts to athletes", async () => {
    const athletes = [
      { id: "a1", displayName: "One", email: "a1@test.com", lastWorkoutDate: "2026-07-01T00:00:00Z", totalWorkouts: 10, thisWeekWorkouts: 2, complianceRate: 0.8, totalVolumeKg: 5000 },
      { id: "a2", displayName: "Two", email: "a2@test.com", lastWorkoutDate: "2026-07-02T00:00:00Z", totalWorkouts: 5, thisWeekWorkouts: 1, complianceRate: 0.5, totalVolumeKg: 2000 },
    ];
    mockListAthletes.mockResolvedValueOnce(athletes);
    mockGetFeedbackCounts.mockResolvedValueOnce(
      new Map([["a1", 3], ["a2", 1]]),
    );

    const { result } = renderHook(() => useCoachDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.athletes.length).toBe(2);
    });

    expect(result.current.athletes[0].feedbackCount).toBe(3);
    expect(result.current.athletes[1].feedbackCount).toBe(1);
    expect(mockGetFeedbackCounts).toHaveBeenCalledWith(["a1", "a2"]);
  });

  it("defaults feedback count to 0 when not in map", async () => {
    const athletes = [
      { id: "a1", displayName: "One", email: "a1@test.com", lastWorkoutDate: "2026-07-01T00:00:00Z", totalWorkouts: 10, thisWeekWorkouts: 2, complianceRate: 0.8, totalVolumeKg: 5000 },
    ];
    mockListAthletes.mockResolvedValueOnce(athletes);
    mockGetFeedbackCounts.mockResolvedValueOnce(new Map());

    const { result } = renderHook(() => useCoachDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.athletes.length).toBe(1);
    });

    expect(result.current.athletes[0].feedbackCount).toBe(0);
  });

  it("does not fetch feedback counts when there are no athletes", async () => {
    mockListAthletes.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useCoachDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetFeedbackCounts).not.toHaveBeenCalled();
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
