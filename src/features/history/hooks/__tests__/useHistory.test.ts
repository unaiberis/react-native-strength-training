import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mock Auth Store ────────────────────────────────────────────────────────

const mockUserId = "user-123";
jest.mock("@/stores/auth-store", () => ({
  useAuthStore: jest.fn((selector: any) => {
    const state = { user: { id: mockUserId }, isOnline: true };
    return selector ? selector(state) : state;
  }),
}));

// ─── Mock Sessions Service ───────────────────────────────────────────────────

const mockListSessions = jest.fn();
const mockGetSessionDetail = jest.fn();
const mockGetWorkoutSession = jest.fn();

jest.mock("@/lib/pocketbase/services/sessions", () => ({
  __esModule: true,
  listSessions: (...args: any[]) => mockListSessions(...args),
  getSessionDetail: (...args: any[]) => mockGetSessionDetail(...args),
  getWorkoutSession: (...args: any[]) => mockGetWorkoutSession(...args),
  createSession: jest.fn(),
  logSet: jest.fn(),
  completeSession: jest.fn(),
  cancelSession: jest.fn(),
  updateSessionDuration: jest.fn(),
}));

import { useHistory, useSessionDetail, usePrefetchSession } from "../useHistory";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockSessions = [
  {
    id: "s1",
    workout_template_id: "tmpl-1",
    status: "completed" as const,
    started_at: "2026-07-07T10:00:00Z",
    completed_at: "2026-07-07T11:00:00Z",
    duration_minutes: 60,
    notes: null,
  },
  {
    id: "s2",
    workout_template_id: null,
    status: "completed" as const,
    started_at: "2026-07-05T10:00:00Z",
    completed_at: "2026-07-05T11:30:00Z",
    duration_minutes: 90,
    notes: "Felt strong",
  },
];

describe("useHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches paginated session list", async () => {
    mockListSessions.mockResolvedValueOnce({ data: mockSessions, count: 2 });

    const { result } = renderHook(() => useHistory(0), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListSessions).toHaveBeenCalledWith(mockUserId, {
      status: "completed",
      exerciseId: undefined,
      fromDate: undefined,
      toDate: undefined,
      page: 0,
      pageSize: 20,
    });
    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);
  });

  it("returns empty sessions array when no data", async () => {
    mockListSessions.mockResolvedValueOnce({ data: [], count: 0 });

    const { result } = renderHook(() => useHistory(0), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.sessions).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.totalPages).toBe(0);
  });

  it("computes hasMore correctly", async () => {
    // 25 items with PAGE_SIZE=20 → hasMore=true
    const items = Array.from({ length: 25 }, (_, i) => ({
      id: `s${i}`,
      workout_template_id: null,
      status: "completed" as const,
      started_at: `2026-07-${String(7 - i).padStart(2, "0")}T10:00:00Z`,
      completed_at: `2026-07-${String(7 - i).padStart(2, "0")}T11:00:00Z`,
      duration_minutes: 60,
      notes: null,
    }));
    mockListSessions.mockResolvedValueOnce({ data: items, count: 25 });

    const { result } = renderHook(() => useHistory(0), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.sessions).toHaveLength(25);
    expect(result.current.totalCount).toBe(25);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.totalPages).toBe(2);
  });

  it("computes hasMore = false when on last page", async () => {
    // PAGE_SIZE=20, count=15 → hasMore=false
    mockListSessions.mockResolvedValueOnce({ data: mockSessions, count: 2 });

    const { result } = renderHook(() => useHistory(0), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.totalCount).toBe(2);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.totalPages).toBe(1);
  });

  it("passes date filters to service", async () => {
    mockListSessions.mockResolvedValueOnce({ data: mockSessions, count: 2 });

    const { result } = renderHook(
      () => useHistory(0, { fromDate: "2026-07-01", toDate: "2026-07-31" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListSessions).toHaveBeenCalledWith(mockUserId, {
      status: "completed",
      exerciseId: undefined,
      fromDate: "2026-07-01",
      toDate: "2026-07-31",
      page: 0,
      pageSize: 20,
    });
  });

  it("passes exerciseId filter to service", async () => {
    mockListSessions.mockResolvedValueOnce({ data: [mockSessions[0]], count: 1 });

    const { result } = renderHook(
      () => useHistory(0, { exerciseId: "ex-1" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListSessions).toHaveBeenCalledWith(mockUserId, {
      status: "completed",
      exerciseId: "ex-1",
      fromDate: undefined,
      toDate: undefined,
      page: 0,
      pageSize: 20,
    });
  });

  it("handles service error", async () => {
    mockListSessions.mockRejectedValueOnce(new Error("Fetch failed"));

    const { result } = renderHook(() => useHistory(0), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});

describe("useSessionDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches session detail by id", async () => {
    const detail = {
      id: "s1",
      status: "completed",
      started_at: "2026-07-07T10:00:00Z",
      completed_at: "2026-07-07T11:00:00Z",
      sets: [{ id: "set-1", exercise_id: "ex-1", set_number: 1, weight_kg: 100, reps: 5 }],
      exerciseNames: { "ex-1": "Bench Press" },
      groupedSets: { "ex-1": [{ id: "set-1", exercise_id: "ex-1", set_number: 1, weight_kg: 100, reps: 5 }] },
    };
    mockGetSessionDetail.mockResolvedValueOnce(detail);

    const { result } = renderHook(() => useSessionDetail("s1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetSessionDetail).toHaveBeenCalledWith("s1");
    expect(result.current.data).toEqual(detail);
  });

  it("is disabled when sessionId is undefined", () => {
    const { result } = renderHook(() => useSessionDetail(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockGetSessionDetail).not.toHaveBeenCalled();
  });

  it("returns null when session not found", async () => {
    mockGetSessionDetail.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useSessionDetail("missing"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });
});

describe("usePrefetchSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a prefetch function that can be called", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const prefetchSpy = jest.spyOn(queryClient, "prefetchQuery");

    function wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result } = renderHook(() => usePrefetchSession(), {
      wrapper,
    });

    expect(typeof result.current).toBe("function");

    result.current("s1");

    expect(prefetchSpy).toHaveBeenCalled();
  });

  it("calls prefetch with correct query key", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const prefetchSpy = jest.spyOn(queryClient, "prefetchQuery");

    function wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result } = renderHook(() => usePrefetchSession(), {
      wrapper,
    });

    result.current("s1");

    expect(prefetchSpy).toHaveBeenCalled();
    const callArgs = prefetchSpy.mock.calls[0][0] as any;
    expect(callArgs.queryKey).toContain("workout-history");
    expect(callArgs.queryKey).toContain("detail");
    expect(callArgs.queryKey).toContain("s1");
  });
});
