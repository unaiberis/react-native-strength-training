// TDD RED → GREEN unit tests for useAthleteAssignments pure mapping + derivation.
// Mock the PocketBase service so the client (ESM) is never loaded in node env,
// and listAssignments is fully controllable.
const mockListAssignments = jest.fn();

jest.mock("@/lib/pocketbase/services/program-assignments", () => ({
  listAssignmentsWithTemplateNames: (...args: any[]) => mockListAssignments(...args),
  listAssignments: jest.fn(),
}));

jest.mock("@/lib/pocketbase/services/templates", () => ({
  fetchTemplateNameMap: jest.fn().mockResolvedValue(new Map()),
}));

import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { mapAssignmentToProgramSummary, deriveCurrentAndUpcoming, useAthleteAssignments } from "../useAthleteAssignments";
import type { ProgramAssignmentRow } from "@/types/pocketbase";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const TODAY = new Date("2026-07-09T00:00:00Z");

function makeRow(overrides: Partial<ProgramAssignmentRow> = {}): ProgramAssignmentRow {
  const base: ProgramAssignmentRow = {
    id: "asg-1",
    athlete_id: "ath-1",
    coach_id: "coach-1",
    template_id: "tpl-1",
    assigned_at: "2026-06-01T00:00:00Z",
    started_at: "2026-06-01",
    completed_at: null,
    program_id: null,
    notes: null,
    team_id: null,
    status: "active",
    created: "2026-06-01T00:00:00Z",
    updated: "2026-06-01T00:00:00Z",
  };
  return { ...base, ...overrides };
}

describe("mapAssignmentToProgramSummary", () => {
  it("maps an active assignment into ProgramSummary (R1 happy path)", () => {
    const row = makeRow({ started_at: "2026-07-01" });
    const summary = mapAssignmentToProgramSummary(row, { today: TODAY });

    expect(summary.id).toBe("asg-1");
    expect(summary.name).toBe("Untitled Program");
    expect(summary.description).toBe("");
    expect(summary.startDate).toBe("2026-07-01");
    expect(summary.endDate).toBe("2026-08-26"); // +8 weeks
    expect(summary.totalWeeks).toBe(8);
    expect(summary.status).toBe("active");
    expect(summary.phases).toEqual([]);
  });

  it("honors totalWeeks override via MapOptions", () => {
    const row = makeRow({ started_at: "2026-07-01" });
    const summary = mapAssignmentToProgramSummary(row, {
      today: TODAY,
      totalWeeks: 12,
    });
    expect(summary.totalWeeks).toBe(12);
    expect(summary.endDate).toBe("2026-09-23");
    expect(summary.phases).toEqual([]);
  });

  it("uses placeholder name with empty phases (no template expand available)", () => {
    const row = makeRow();
    const summary = mapAssignmentToProgramSummary(row, { today: TODAY });
    expect(summary.name).toBe("Untitled Program");
    expect(summary.description).toBe("");
    expect(summary.phases).toEqual([]);
  });

  it("marks future started_at as upcoming status", () => {
    const row = makeRow({ started_at: "2026-08-01" });
    const summary = mapAssignmentToProgramSummary(row, { today: TODAY });
    expect(summary.status).toBe("upcoming");
  });

  it("maps completed row with past started_at to completed status", () => {
    const row = makeRow({ started_at: "2026-06-01", status: "completed" });
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

  it("picks the active assignment with the latest started_at <= today (R1 multiple active)", () => {
    const A = makeRow({ id: "asg-a", started_at: "2026-06-01" });
    const B = makeRow({
      id: "asg-b",
      started_at: "2026-07-05",
    });
    const C = makeRow({
      id: "asg-c",
      started_at: "2026-08-01",
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
    const cancelled = makeRow({ id: "asg-x", started_at: "2026-07-01", status: "cancelled" });
    const { currentProgram } = deriveCurrentAndUpcoming([cancelled], TODAY);
    expect(currentProgram).toBeNull();
  });

  it("surfaces completed past rows in pastPrograms", () => {
    const completed = makeRow({ id: "asg-done", started_at: "2026-06-01", status: "completed" });
    const { currentProgram, upcomingPrograms, pastPrograms } = deriveCurrentAndUpcoming(
      [completed],
      TODAY,
    );
    expect(currentProgram).toBeNull();
    expect(upcomingPrograms).toEqual([]);
    expect(pastPrograms).toHaveLength(1);
    expect(pastPrograms[0].id).toBe("asg-done");
    expect(pastPrograms[0].status).toBe("completed");
  });

  it("includes cancelled rows in pastPrograms but not in current/upcoming", () => {
    const cancelled = makeRow({ id: "asg-cancelled", started_at: "2026-06-01", status: "cancelled" });
    const { currentProgram, upcomingPrograms, pastPrograms } = deriveCurrentAndUpcoming(
      [cancelled],
      TODAY,
    );
    expect(currentProgram).toBeNull();
    expect(upcomingPrograms).toEqual([]);
    expect(pastPrograms).toHaveLength(1);
    expect(pastPrograms[0].id).toBe("asg-cancelled");
  });

  it("uses templateName when provided via rows", () => {
    const row = makeRow({
      started_at: "2026-07-01",
    });
    const rowWithName = { ...row, templateName: "Upper Body Strength" };
    const { currentProgram } = deriveCurrentAndUpcoming([rowWithName], TODAY);
    expect(currentProgram?.name).toBe("Upper Body Strength");
  });

  it("falls back to Untitled Program when templateName is missing", () => {
    const row = makeRow({ started_at: "2026-07-01" });
    const rowWithNullName = { ...row, templateName: null };
    const { currentProgram } = deriveCurrentAndUpcoming([rowWithNullName], TODAY);
    expect(currentProgram?.name).toBe("Untitled Program");
  });

  it("boundary: future-only assignment → current null, upcoming length 1", () => {
    const future = makeRow({ id: "asg-future", started_at: "2026-08-01" });
    const { currentProgram, upcomingPrograms } = deriveCurrentAndUpcoming(
      [future],
      TODAY,
    );
    expect(currentProgram).toBeNull();
    expect(upcomingPrograms).toHaveLength(1);
    expect(upcomingPrograms[0].id).toBe("asg-future");
  });

  it("upcoming-only assignment is not classified as current", () => {
    const future = makeRow({ id: "asg-future", started_at: "2026-08-01" });
    const { currentProgram } = deriveCurrentAndUpcoming([future], TODAY);
    expect(currentProgram).toBeNull();
  });
});

describe("useAthleteAssignments (hook)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: { id: "ath-1" } } as any);
  });

  it("calls listAssignmentsWithTemplateNames and surfaces current/upcoming/past programs", async () => {
    const B = makeRow({
      id: "asg-b",
      started_at: "2026-07-05",
    });
    const past = makeRow({
      id: "asg-past",
      started_at: "2026-06-01",
      status: "completed",
    });
    mockListAssignments.mockResolvedValue([B, past]);

    const { result } = renderHook(() => useAthleteAssignments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListAssignments).toHaveBeenCalledWith("ath-1");
    expect(result.current.currentProgram?.id).toBe("asg-b");
    expect(result.current.pastPrograms).toHaveLength(1);
    expect(result.current.pastPrograms[0].id).toBe("asg-past");
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
    expect(result.current.pastPrograms).toEqual([]);
  });

  it("propagates errors thrown by listAssignments", async () => {
    mockListAssignments.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useAthleteAssignments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
    expect(result.current.currentProgram).toBeNull();
    expect(result.current.pastPrograms).toEqual([]);
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

  it("refetch re-invokes listAssignments and sorts multiple upcoming by started_at", async () => {
    const futureA = makeRow({ id: "asg-a", started_at: "2026-09-01" });
    const futureB = makeRow({ id: "asg-b", started_at: "2026-08-01" });
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
