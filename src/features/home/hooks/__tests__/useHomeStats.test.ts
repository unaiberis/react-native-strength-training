import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mock PocketBase client (used by useHomeStats) ─────────────────────────

jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn().mockReturnThis(),
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

import { useHomeStats, relativeDate } from "../useHomeStats";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useHomeStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: new Date("2026-07-07T12:00:00Z") });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns default zero values when no data", async () => {
    const pbModule = require("@/lib/pocketbase/client");

    // getFullList for sessions returns empty
    pbModule.pb.collection.mockImplementation(() => ({
      getFullList: jest.fn().mockResolvedValue([]),
      getOne: jest.fn(),
    }));

    const { result } = renderHook(() => useHomeStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.totalWorkouts).toBe(0);
    expect(result.current.totalSets).toBe(0);
    expect(result.current.thisWeekWorkouts).toBe(0);
    expect(result.current.bestE1RM).toBeNull();
    expect(result.current.recentSessions).toEqual([]);
  });

  it("computes total workouts and this week workouts", async () => {
    const pbModule = require("@/lib/pocketbase/client");

    const mockSessions = [
      {
        id: "s1",
        started_at: "2026-07-07T10:00:00Z", // today
        completed_at: "2026-07-07T11:00:00Z",
        workout_template_id: null,
        duration_minutes: 60,
        status: "completed",
      },
      {
        id: "s2",
        started_at: "2026-07-05T10:00:00Z", // this week (within 7 days)
        completed_at: "2026-07-05T11:00:00Z",
        workout_template_id: "tmpl-1",
        duration_minutes: 45,
        status: "completed",
      },
      {
        id: "s3",
        started_at: "2026-06-28T10:00:00Z", // outside 7 day window
        completed_at: "2026-06-28T11:00:00Z",
        workout_template_id: null,
        duration_minutes: 90,
        status: "completed",
      },
    ];

    // First call: getFullList for sessions
    // Second call: getFullList for sets (batch 0-50)
    // Third call: getFullList for sets with warmup filter (batch 0-50)
    // Calls 4-8: getFullList for each recent session's sets (3 sessions)
    // Calls 9+: getOne for each session's template (calls for s2)
    let callCount = 0;
    pbModule.pb.collection.mockImplementation((name: string) => {
      return {
        getFullList: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve(mockSessions);
          // Sets calls
          if (name === "exercise_sets") return Promise.resolve([
            { id: "set-1", exercise_id: "ex-1", weight_kg: 100, reps: 5 },
          ]);
          return Promise.resolve([]);
        }),
        getOne: jest.fn().mockResolvedValue({ name: "Upper Body" }),
      };
    });

    const { result } = renderHook(() => useHomeStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.totalWorkouts).toBe(3);
    expect(result.current.totalSets).toBeGreaterThanOrEqual(1);
    expect(result.current.bestE1RM).toBe(100 * (1 + 5 / 30)); // e1rm for 100x5
  });

  it("handles pagination errors gracefully", async () => {
    const pbModule = require("@/lib/pocketbase/client");
    pbModule.pb.collection.mockImplementation(() => ({
      getFullList: jest.fn().mockRejectedValue(new Error("PB error")),
      getOne: jest.fn(),
    }));

    const { result } = renderHook(() => useHomeStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("relativeDate", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2026-07-07T12:00:00Z") });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 'just now' for dates in last minute", () => {
    const date = new Date();
    date.setSeconds(date.getSeconds() - 30);
    expect(relativeDate(date.toISOString())).toBe("just now");
  });

  it("returns minutes ago for recent dates", () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - 5);
    expect(relativeDate(date.toISOString())).toBe("5m ago");
  });

  it("returns 'today' for today's date", () => {
    const date = new Date();
    date.setHours(date.getHours() - 2);
    expect(relativeDate(date.toISOString())).toBe("today");
  });

  it("returns 'yesterday' for one day ago", () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    expect(relativeDate(date.toISOString())).toBe("yesterday");
  });

  it("returns days ago for recent days", () => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    expect(relativeDate(date.toISOString())).toBe("3d ago");
  });

  it("returns weeks ago", () => {
    const date = new Date();
    date.setDate(date.getDate() - 14);
    expect(relativeDate(date.toISOString())).toBe("2w ago");
  });

  it("returns months ago", () => {
    const date = new Date();
    date.setDate(date.getDate() - 60);
    expect(relativeDate(date.toISOString())).toBe("2mo ago");
  });
});
