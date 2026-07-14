/**
 * Tests for useSessionsForDate hook.
 *
 * Validates fetching sessions for a specific date from SQLite (native)
 * or PocketBase (web), including merging assigned workouts from
 * useAthleteAssignments.
 */

// ─── Mocks (before imports) ──────────────────────────────────────────────

const mockGetAllAsync = jest.fn();

jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn().mockReturnThis(),
    getFullList: jest.fn(),
    getOne: jest.fn(),
  },
}));

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    getAllAsync: mockGetAllAsync,
    execAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    closeAsync: jest.fn(),
  }),
}));

const mockUseAthleteAssignments = jest.fn();
jest.mock("@/features/athlete-assignments/hooks/useAthleteAssignments", () => {
  const actual = jest.requireActual(
    "@/features/athlete-assignments/hooks/useAthleteAssignments",
  );
  return {
    ...actual,
    useAthleteAssignments: (...args: any[]) => mockUseAthleteAssignments(...args),
  };
});

import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Platform } from "react-native";
import { useSessionsForDate } from "../useSessionsForDate";
import { resetDb } from "@/lib/db/database";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

/** Create a mock SQLite session row. */
function makeSessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "sess-1",
    template_id: "tmpl-1",
    template_name: "Upper Body",
    status: "completed",
    started_at: "2026-07-08T10:00:00.000Z",
    duration_seconds: 3600,
    exercise_count: 4,
    ...overrides,
  };
}

/** Default mock for useAthleteAssignments with no assignments. */
function defaultAssignments() {
  return {
    currentProgram: null,
    upcomingPrograms: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  };
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe("useSessionsForDate", () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date("2026-07-08T12:00:00Z") });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetDb();
    mockUseAthleteAssignments.mockReturnValue(defaultAssignments());
    // Default Platform.OS is "ios" from jest.setup.ts → SQLite path
  });

  // ── Happy path: returns sessions for a date ───────────────────────────

  it("returns sessions for a date with data (SQLite)", async () => {
    mockGetAllAsync.mockResolvedValue([makeSessionRow()]);

    const { result } = renderHook(() => useSessionsForDate("2026-07-08"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).toBe("sess-1");
    expect(result.current.sessions[0].templateName).toBe("Upper Body");
    expect(result.current.sessions[0].status).toBe("completed");
    expect(result.current.sessions[0].startedAt).toBe("2026-07-08T10:00:00.000Z");
    expect(result.current.sessions[0].durationMinutes).toBe(60);
    expect(result.current.sessions[0].exerciseCount).toBe(4);
  });

  it("handles null template_name and null duration_seconds from SQLite", async () => {
    mockGetAllAsync.mockResolvedValue([
      makeSessionRow({
        template_id: null,
        template_name: null,
        duration_seconds: null,
      }),
    ]);

    const { result } = renderHook(() => useSessionsForDate("2026-07-08"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].templateName).toBeNull();
    expect(result.current.sessions[0].durationMinutes).toBeNull();
  });

  // ── Empty array for date with no data ─────────────────────────────────

  it("returns empty array when no sessions exist for the date", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useSessionsForDate("2026-07-09"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.sessions).toEqual([]);
  });

  // ── Null date ─────────────────────────────────────────────────────────

  it("returns empty array when date is null", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useSessionsForDate(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.sessions).toEqual([]);
    expect(mockGetAllAsync).not.toHaveBeenCalled();
  });

  // ── Includes assigned workouts from assignments ───────────────────────

  it("includes assigned (not started) workouts from athlete assignments", async () => {
    mockGetAllAsync.mockResolvedValue([
      makeSessionRow({
        id: "sess-existing",
        template_name: "Leg Day",
        status: "active",
      }),
    ]);

    mockUseAthleteAssignments.mockReturnValue({
      currentProgram: {
        id: "asg-1",
        name: "Hypertrophy Block",
        description: "",
        startDate: "2026-07-08",
        endDate: "2026-08-30",
        totalWeeks: 8,
        weeksCompleted: 0,
        progressPercent: 0,
        phases: [],
        status: "active",
      },
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useSessionsForDate("2026-07-08"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have 2 sessions: the active one from DB + the assigned one
    expect(result.current.sessions).toHaveLength(2);
    const assigned = result.current.sessions.find((s) => s.id === "asg-1");
    expect(assigned).toBeDefined();
    expect(assigned!.status).toBe("assigned");
    expect(assigned!.templateName).toBe("Hypertrophy Block");
    expect(assigned!.startedAt).toBeNull();
  });

  it("does not duplicate assigned workout when it already exists in DB", async () => {
    mockGetAllAsync.mockResolvedValue([
      makeSessionRow({
        id: "asg-1",
        template_name: "Hypertrophy Block",
        status: "active",
      }),
    ]);

    mockUseAthleteAssignments.mockReturnValue({
      currentProgram: {
        id: "asg-1",
        name: "Hypertrophy Block",
        startDate: "2026-07-08",
        endDate: "2026-08-30",
        totalWeeks: 8,
        weeksCompleted: 0,
        progressPercent: 0,
        phases: [],
        status: "active",
      },
      upcomingPrograms: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useSessionsForDate("2026-07-08"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have only 1 session (no duplicate)
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).toBe("asg-1");
    expect(result.current.sessions[0].status).toBe("active"); // from DB, not overwritten
  });

  // ── Loading state ─────────────────────────────────────────────────────

  it("returns loading state as true while fetching", async () => {
    // Don't resolve the query immediately
    mockGetAllAsync.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSessionsForDate("2026-07-08"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  // ── Error state ───────────────────────────────────────────────────────

  it("returns error state when the query fails", async () => {
    mockGetAllAsync.mockRejectedValue(new Error("DB connection failed"));

    const { result } = renderHook(() => useSessionsForDate("2026-07-08"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.sessions).toEqual([]);
    expect(result.current.error).toBeDefined();
  });

  // ── Refetch ───────────────────────────────────────────────────────────

  it("refetch triggers a new query", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useSessionsForDate("2026-07-08"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const initialCallCount = mockGetAllAsync.mock.calls.length;

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      // After refetch, the query should have been called again
      expect(mockGetAllAsync.mock.calls.length).toBeGreaterThanOrEqual(
        initialCallCount + 1,
      );
    });
  });

    // ── Web platform (PocketBase) ─────────────────────────────────────────

  it("queries PocketBase on web platform", async () => {
    // Set a userId for web queries to be enabled
    const authStoreModule = require("@/stores/auth-store");
    authStoreModule.useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" },
    });

    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, "OS", { get: () => "web" });

    // Get the pb mock and set up getFullList to return empty
    const { pb } = require("@/lib/pocketbase/client");
    (pb.getFullList as jest.Mock).mockResolvedValue([]);
    (pb.getOne as jest.Mock).mockRejectedValue(new Error("not found"));

    const { result } = renderHook(() => useSessionsForDate("2026-07-08"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(pb.collection).toHaveBeenCalledWith("workout_sessions");
    expect(result.current.sessions).toEqual([]);

    // Restore Platform
    Object.defineProperty(Platform, "OS", {
      get: () => originalPlatform,
    });

    // Reset auth store
    authStoreModule.useAuthStore.setState({
      user: null,
    });
  });

  it("returns sessions with template and exercise count from PocketBase", async () => {
    const authStoreModule = require("@/stores/auth-store");
    authStoreModule.useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" },
    });

    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, "OS", { get: () => "web" });

    const { pb } = require("@/lib/pocketbase/client");

    // First getFullList call: workout_sessions
    (pb.getFullList as jest.Mock).mockResolvedValueOnce([
      { id: "pb-sess-1", started_at: "2026-07-08T10:00:00.000Z", status: "completed", workout_template_id: "tmpl-1" },
    ]);
    // getFullList call via fetchTemplateNames: workout_templates batch lookup
    (pb.getFullList as jest.Mock).mockResolvedValueOnce([{ id: "tmpl-1", name: "Leg Day" }]);
    // Second getFullList call: exercise_sets
    (pb.getFullList as jest.Mock).mockResolvedValueOnce([
      { id: "set-1", exercise_id: "ex-1" },
      { id: "set-2", exercise_id: "ex-1" },
      { id: "set-3", exercise_id: "ex-2" },
    ]);

    const { result } = renderHook(() => useSessionsForDate("2026-07-08"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).toBe("pb-sess-1");
    expect(result.current.sessions[0].templateName).toBe("Leg Day");
    expect(result.current.sessions[0].status).toBe("completed");
    expect(result.current.sessions[0].exerciseCount).toBe(2); // 2 unique exercises

    // Restore Platform
    Object.defineProperty(Platform, "OS", {
      get: () => originalPlatform,
    });

    authStoreModule.useAuthStore.setState({ user: null });
  });

  it("handles PB template fetch error gracefully", async () => {
    const authStoreModule = require("@/stores/auth-store");
    authStoreModule.useAuthStore.setState({
      user: { id: "user-1", email: "test@test.com" },
    });

    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, "OS", { get: () => "web" });

    const { pb } = require("@/lib/pocketbase/client");

    // Session with template_id that will fail to fetch
    (pb.getFullList as jest.Mock).mockResolvedValueOnce([
      { id: "pb-sess-2", started_at: "2026-07-08T11:00:00.000Z", status: "active", workout_template_id: "deleted-tmpl" },
    ]);
    // getFullList via fetchTemplateNames rejects — template deleted
    (pb.getFullList as jest.Mock).mockRejectedValueOnce(new Error("not found"));
    // exercise sets
    (pb.getFullList as jest.Mock).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useSessionsForDate("2026-07-08"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].templateName).toBeNull();
    expect(result.current.sessions[0].status).toBe("active");

    // Restore Platform
    Object.defineProperty(Platform, "OS", {
      get: () => originalPlatform,
    });

    authStoreModule.useAuthStore.setState({ user: null });
  });
});
