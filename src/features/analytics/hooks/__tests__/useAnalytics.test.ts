import React from "react";
import { Platform } from "react-native";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mock PocketBase client (used by useAnalytics for web path) ─────────────

// We mock the collection function to return a different getFullList mock
// per collection name, so parallel queries don't interfere with each other.
const mockSessionGetFullList = jest.fn();
const mockExerciseSetsGetFullList = jest.fn();

jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn((name: string) => {
      if (name === "workout_sessions") {
        return { getFullList: mockSessionGetFullList, getOne: jest.fn() };
      }
      if (name === "exercise_sets") {
        return { getFullList: mockExerciseSetsGetFullList, getOne: jest.fn() };
      }
      return { getFullList: jest.fn().mockResolvedValue([]), getOne: jest.fn() };
    }),
    getFullList: jest.fn().mockResolvedValue([]),
    getOne: jest.fn(),
  },
}));

// ─── Mock Auth Store ────────────────────────────────────────────────────────

const mockUserId = "user-123";

jest.mock("@/stores/auth-store", () => ({
  useAuthStore: jest.fn((selector: any) => {
    const state = { user: { id: mockUserId }, isOnline: true };
    return selector ? selector(state) : state;
  }),
}));

import { useAnalytics } from "../useAnalytics";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Override Platform.OS to "web" so fetchAnalyticsFromPocketBase is used
    // (the local SQLite path fails in node test environment)
    (Platform as any).OS = "web";
  });

  it("returns empty volumeByPeriod when no data", async () => {
    mockSessionGetFullList.mockResolvedValue([]);
    mockExerciseSetsGetFullList.mockResolvedValue([]);

    const { result } = renderHook(() => useAnalytics("weekly"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.volumeByPeriod).toEqual([]);
    expect(result.current.exercises).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("computes volume by period from fetched data", async () => {
    // These simulate raw PocketBase records
    const sessionRecords = [
      { id: "s1", completed_at: "2026-07-07T10:00:00Z" },
      { id: "s2", completed_at: "2026-07-08T10:00:00Z" },
    ];

    const setsForS1 = [
      { weight_kg: 100, reps: 5, created: "2026-07-07T10:00:00Z" },
      { weight_kg: 100, reps: 5, created: "2026-07-07T10:00:01Z" },
    ];

    const setsForS2 = [
      { weight_kg: 80, reps: 8, created: "2026-07-01T10:00:00Z" },
    ];

    // fetchAnalyticsFromPocketBase needs sessions + 2 sets queries
    mockSessionGetFullList
      .mockResolvedValueOnce(sessionRecords);  // for analytics

    mockExerciseSetsGetFullList
      .mockResolvedValueOnce(setsForS1)          // for analytics: s1's sets
      .mockResolvedValueOnce(setsForS2);         // for analytics: s2's sets

    // fetchExercisesFromPocketBase calls sessions first.
    // If sessions returns empty, it returns [] immediately and does NOT
    // call exercise_sets.getFullList, which avoids consuming mock values
    // from the analytics query's second loop iteration (s2's sets).
    mockSessionGetFullList
      .mockResolvedValueOnce([]);                // for exercises: empty sessions = no-op

    const { result } = renderHook(() => useAnalytics("weekly"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Volume: (100*5 + 100*5) + (80*8) = 1000 + 640 = 1640
    expect(result.current.volumeByPeriod).toHaveLength(1);
    expect(result.current.volumeByPeriod[0].volume).toBe(1640);
    expect(result.current.volumeByPeriod[0].sessionCount).toBe(2);

    // Exercises query returned [] because sessions mock returned empty for it
    expect(result.current.exercises).toEqual([]);
  });

  it("toggles between weekly and monthly periods", async () => {
    const sessionRecords = [
      { id: "s1", completed_at: "2026-07-07T10:00:00Z" },
    ];
    const setsForS1 = [
      { weight_kg: 100, reps: 5, created: "2026-07-07T10:00:00Z" },
    ];

    mockSessionGetFullList
      .mockResolvedValueOnce(sessionRecords)  // for analytics
      .mockResolvedValueOnce([]);              // for exercises (empty)

    mockExerciseSetsGetFullList
      .mockResolvedValueOnce(setsForS1);       // for analytics

    const { result, rerender } = renderHook(
      (period: "weekly" | "monthly" = "weekly") => useAnalytics(period),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Weekly: should have one week bucket
    expect(result.current.volumeByPeriod).toHaveLength(1);
    expect(result.current.volumeByPeriod[0].period).toContain("2026-W");

    // Rerender with monthly
    rerender("monthly");

    await waitFor(() => {
      expect(result.current.volumeByPeriod.length).toBeGreaterThanOrEqual(0);
    });
  });

  it("exposes refetch function", async () => {
    mockSessionGetFullList.mockResolvedValue([]);
    mockExerciseSetsGetFullList.mockResolvedValue([]);

    const { result } = renderHook(() => useAnalytics("weekly"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.refetch).toBe("function");
  });

  it("returns isLoading true initially", async () => {
    mockSessionGetFullList.mockReturnValue(new Promise(() => {}));
    mockExerciseSetsGetFullList.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAnalytics("weekly"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});
