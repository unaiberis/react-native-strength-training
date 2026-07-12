// Mock PocketBase client before any imports
jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn().mockReturnThis(),
    getFullList: jest.fn().mockResolvedValue([]),
    getOne: jest.fn(),
  },
}));

// Mock expo-sqlite before any imports (needed by database.ts via dynamic import)
const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    getAllAsync: mockGetAllAsync,
    execAsync: jest.fn(),
    getFirstAsync: mockGetFirstAsync,
    closeAsync: jest.fn(),
  }),
}));

// Mock auth store
jest.mock("@/stores/auth-store", () => ({
  useAuthStore: jest.fn((selector: any) => {
    const state = { user: { id: "user-123" } };
    return selector ? selector(state) : state;
  }),
}));

import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProfileStats } from "../useProfileStats";
import { resetDb } from "@/lib/db/database";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useProfileStats", () => {
  beforeAll(() => {
    // Fix the system date so streak calculations are deterministic
    jest.useFakeTimers({ now: new Date("2026-07-07T12:00:00Z") });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetDb();
  });

  it("returns zero stats when no completed sessions exist", async () => {
    mockGetAllAsync.mockResolvedValue([]);
    mockGetFirstAsync.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProfileStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      totalWorkouts: 0,
      currentStreak: 0,
      personalRecords: 0,
      totalVolume: 0,
    });
  });

  it("computes total workouts from completed sessions", async () => {
    mockGetAllAsync.mockResolvedValue([
      { workout_date: "2026-07-07" },
      { workout_date: "2026-07-05" },
      { workout_date: "2026-07-03" },
    ]);
    mockGetFirstAsync.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProfileStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalWorkouts).toBe(3);
  });

  it("computes streak from consecutive days", async () => {
    // Today is July 7, 2026 (set in test env)
    mockGetAllAsync.mockResolvedValue([
      { workout_date: "2026-07-07" },
      { workout_date: "2026-07-06" },
      { workout_date: "2026-07-05" },
      { workout_date: "2026-07-03" }, // gap here
    ]);
    mockGetFirstAsync.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProfileStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // streak: Jul 7, 6, 5 = 3 days (Jul 4 missing breaks the streak)
    expect(result.current.data?.currentStreak).toBe(3);
  });

  it("returns streak of 0 when latest workout is older than yesterday", async () => {
    mockGetAllAsync.mockResolvedValue([
      { workout_date: "2026-07-05" },
      { workout_date: "2026-07-04" },
    ]);
    mockGetFirstAsync.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProfileStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Jul 5 is 2 days before Jul 7 — streak broken
    expect(result.current.data?.currentStreak).toBe(0);
  });

  it("returns streak of 1 for a single workout today", async () => {
    mockGetAllAsync.mockResolvedValue([
      { workout_date: "2026-07-07" },
    ]);
    mockGetFirstAsync.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProfileStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.currentStreak).toBe(1);
  });

  it("computes total volume from exercise_sets", async () => {
    mockGetAllAsync.mockResolvedValue([
      { workout_date: "2026-07-07" },
      { workout_date: "2026-07-06" },
    ]);
    mockGetFirstAsync.mockResolvedValue({ total: 12500 });

    const { result } = renderHook(() => useProfileStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalVolume).toBe(12500);
  });

  it("computes personal records count from distinct exercises", async () => {
    mockGetAllAsync.mockResolvedValue([
      { workout_date: "2026-07-07" },
    ]);
    // First getFirstAsync call (volume) returns undefined
    // Second getFirstAsync call (PRs) returns { count: 12 }
    mockGetFirstAsync
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ count: 12 });

    const { result } = renderHook(() => useProfileStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.personalRecords).toBe(12);
  });

  it("handles query error gracefully", async () => {
    mockGetAllAsync.mockRejectedValue(new Error("DB error"));

    const { result } = renderHook(() => useProfileStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it("does not fetch when user is not authenticated", async () => {
    // Override auth store mock for this test
    const authStore = require("@/stores/auth-store");
    authStore.useAuthStore.mockImplementation((selector: any) => {
      const state = { user: null };
      return selector ? selector(state) : state;
    });

    const { result } = renderHook(() => useProfileStats(), {
      wrapper: createWrapper(),
    });

    // Should not be loading (query is disabled)
    expect(result.current.isFetching).toBe(false);
    // queryFn should NOT have been called
    expect(mockGetAllAsync).not.toHaveBeenCalled();
  });
});
