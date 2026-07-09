// TDD RED → GREEN unit tests for useAthleteAssignments pure mapping + derivation.
// Mock the PocketBase service so the client (ESM) is never loaded in node env,
// and listAssignments is fully controllable.
const mockListAssignments = jest.fn();

jest.mock("@/lib/pocketbase/services/program-assignments", () => ({
  listAssignments: (...args: any[]) => mockListAssignments(...args),
}));

import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { mapAssignmentToProgramSummary, deriveCurrentAndUpcoming, useAthleteAssignments } from "../useAthleteAssignments";
import type { AssignmentWithTemplate } from "../useAthleteAssignments";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const TODAY = new Date("2026-07-09T00:00:00Z");

function makeRow(overrides: Partial<AssignmentWithTemplate> = {}): AssignmentWithTemplate {
  const base: AssignmentWithTemplate = {
    id: "asg-1",
    athlete: "ath-1",
    coach: "coach-1",
    template: "tpl-1",
    start_date: "2026-06-01",
    team_id: null,
    status: "active",
    created: "2026-06-01T00:00:00Z",
    updated: "2026-06-01T00:00:00Z",
    expand: {
      template: {
        id: "tpl-1",
        user_id: "coach-1",
        name: "Hypertrophy Block",
        description: "8-week plan",
        program_block_id: null,
        is_public: false,
        created: "2026-06-01T00:00:00Z",
        updated: "2026-06-01T00:00:00Z",
      },
    },
  };
  return { ...base, ...overrides };
}

describe("mapAssignmentToProgramSummary", () => {
  it("maps an active assignment with template into ProgramSummary (R1 happy path)", () => {
    const row = makeRow({ start_date: "2026-07-01" });
    const summary = mapAssignmentToProgramSummary(row, { today: TODAY });

    expect(summary.id).toBe("asg-1");
    expect(summary.name).toBe("Hypertrophy Block");
    expect(summary.description).toBe("8-week plan");
    expect(summary.startDate).toBe("2026-07-01");
    expect(summary.endDate).toBe("2026-08-26"); // +8 weeks
    expect(summary.totalWeeks).toBe(8);
    expect(summary.status).toBe("active");
    expect(summary.phases).toHaveLength(1);
    expect(summary.phases[0]).toEqual({
      id: "phase-tpl-1",
      name: "Hypertrophy Block",
      weekStart: 1,
      weekEnd: 8,
      workoutCount: 1,
    });
  });

  it("honors totalWeeks override via MapOptions", () => {
    const row = makeRow({ start_date: "2026-07-01" });
    const summary = mapAssignmentToProgramSummary(row, {
      today: TODAY,
      totalWeeks: 12,
    });
    expect(summary.totalWeeks).toBe(12);
    expect(summary.endDate).toBe("2026-09-23");
    expect(summary.phases[0].weekEnd).toBe(12);
  });

  it("null-guards a missing template (no throw, empty phases, placeholder name)", () => {
    const row = makeRow({ expand: { template: null } });
    let summary;
    expect(() => {
      summary = mapAssignmentToProgramSummary(row, { today: TODAY });
    }).not.toThrow();

    expect(summary!.name).toBe("Untitled Program");
    expect(summary!.description).toBe("");
    expect(summary!.phases).toEqual([]);
  });

  it("null-guards an absent expand block", () => {
    const { expand, ...rest } = makeRow();
    const row: AssignmentWithTemplate = { ...rest } as AssignmentWithTemplate;
    const summary = mapAssignmentToProgramSummary(row, { today: TODAY });
    expect(summary.phases).toEqual([]);
    expect(summary.name).toBe("Untitled Program");
  });

  it("marks future start_date as upcoming status", () => {
    const row = makeRow({ start_date: "2026-08-01" });
    const summary = mapAssignmentToProgramSummary(row, { today: TODAY });
    expect(summary.status).toBe("upcoming");
  });

  it("maps completed row with past start_date to completed status", () => {
    const row = makeRow({ start_date: "2026-06-01", status: "completed" });
    const summary = mapAssignmentToProgramSummary(row, { today: TODAY });
    expect(summary.status).toBe("completed");
  });
});

describe("deriveCurrentAndUpcoming", () => {
  it("returns empty results for 0 assignments", () => {
    const { currentProgram, upcomingPrograms } = deriveCurrentAndUpcoming([], TODAY);
    expect(currentProgram).toBeNull();
    expect(upcomingPrograms).toEqual([]);
  });

  it("picks the active assignment with the latest start_date <= today (R1 multiple active)", () => {
    const A = makeRow({ id: "asg-a", start_date: "2026-06-01" });
    const B = makeRow({
      id: "asg-b",
      start_date: "2026-07-05",
      expand: {
        template: {
          id: "tpl-b",
          user_id: "coach-1",
          name: "Strength Phase",
          description: "4-week plan",
          program_block_id: null,
          is_public: false,
          created: "",
          updated: "",
        },
      },
    });
    const C = makeRow({
      id: "asg-c",
      start_date: "2026-08-01",
      expand: {
        template: {
          id: "tpl-c",
          user_id: "coach-1",
          name: "Peaking Phase",
          description: "3-week plan",
          program_block_id: null,
          is_public: false,
          created: "",
          updated: "",
        },
      },
    });

    const { currentProgram, upcomingPrograms } = deriveCurrentAndUpcoming(
      [A, B, C],
      TODAY,
    );

    expect(currentProgram?.id).toBe("asg-b");
    expect(upcomingPrograms).toHaveLength(1);
    expect(upcomingPrograms[0].id).toBe("asg-c");
  });

  it("skips cancelled rows", () => {
    const cancelled = makeRow({ id: "asg-x", start_date: "2026-07-01", status: "cancelled" });
    const { currentProgram } = deriveCurrentAndUpcoming([cancelled], TODAY);
    expect(currentProgram).toBeNull();
  });

  it("does not surface completed past rows", () => {
    const completed = makeRow({ id: "asg-done", start_date: "2026-06-01", status: "completed" });
    const { currentProgram, upcomingPrograms } = deriveCurrentAndUpcoming(
      [completed],
      TODAY,
    );
    expect(currentProgram).toBeNull();
    expect(upcomingPrograms).toEqual([]);
  });

  it("boundary: future-only assignment → current null, upcoming length 1", () => {
    const future = makeRow({ id: "asg-future", start_date: "2026-08-01" });
    const { currentProgram, upcomingPrograms } = deriveCurrentAndUpcoming(
      [future],
      TODAY,
    );
    expect(currentProgram).toBeNull();
    expect(upcomingPrograms).toHaveLength(1);
    expect(upcomingPrograms[0].id).toBe("asg-future");
  });

  it("upcoming-only assignment is not classified as current", () => {
    const future = makeRow({ id: "asg-future", start_date: "2026-08-01" });
    const { currentProgram } = deriveCurrentAndUpcoming([future], TODAY);
    expect(currentProgram).toBeNull();
  });
});

describe("useAthleteAssignments (hook)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: { id: "ath-1" } as any });
  });

  it("calls listAssignments(user.id) and surfaces the current program", async () => {
    const B = makeRow({
      id: "asg-b",
      start_date: "2026-07-05",
      expand: {
        template: {
          id: "tpl-b",
          user_id: "coach-1",
          name: "Strength Phase",
          description: "4-week plan",
          program_block_id: null,
          is_public: false,
          created: "",
          updated: "",
        },
      },
    });
    mockListAssignments.mockResolvedValue([B]);

    const { result } = renderHook(() => useAthleteAssignments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListAssignments).toHaveBeenCalledWith("ath-1");
    expect(result.current.currentProgram?.id).toBe("asg-b");
    expect(result.current.error).toBeNull();
  });

  it("returns empty state when listAssignments resolves to []", async () => {
    mockListAssignments.mockResolvedValue([]);

    const { result } = renderHook(() => useAthleteAssignments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.currentProgram).toBeNull();
    expect(result.current.upcomingPrograms).toEqual([]);
  });

  it("propagates errors thrown by listAssignments", async () => {
    mockListAssignments.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useAthleteAssignments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
    expect(result.current.currentProgram).toBeNull();
  });

  it("does not call listAssignments when user is absent (enabled guard)", async () => {
    useAuthStore.setState({ user: null });
    mockListAssignments.mockResolvedValue([]);

    const { result } = renderHook(() => useAthleteAssignments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListAssignments).not.toHaveBeenCalled();
    expect(result.current.currentProgram).toBeNull();
  });

  it("refetch re-invokes listAssignments and sorts multiple upcoming by start_date", async () => {
    const futureA = makeRow({ id: "asg-a", start_date: "2026-09-01" });
    const futureB = makeRow({ id: "asg-b", start_date: "2026-08-01" });
    mockListAssignments.mockResolvedValue([futureA, futureB]);

    const { result } = renderHook(() => useAthleteAssignments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Earliest upcoming first.
    expect(result.current.upcomingPrograms[0].id).toBe("asg-b");

    mockListAssignments.mockClear();
    result.current.refetch();
    await waitFor(() => expect(mockListAssignments).toHaveBeenCalledTimes(1));
  });
});
