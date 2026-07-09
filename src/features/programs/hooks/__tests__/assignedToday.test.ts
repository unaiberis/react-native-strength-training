// TDD RED → GREEN unit tests for the assigned-today pure selectors (T5).
// These let Home/Calendar surface a chip when an assignment start_date
// matches a given day, without dragging React/network into the test.
// Mock the PocketBase service so the ESM client is never loaded in node env.
jest.mock("@/lib/pocketbase/services/program-assignments", () => ({
  listAssignments: jest.fn(),
}));

import {
  todayStr,
  findAssignedOnDate,
  findAssignedToday,
} from "../useAthleteAssignments";
import type { ProgramSummary } from "../usePrograms";

function makeProgram(
  overrides: Partial<ProgramSummary> = {},
): ProgramSummary {
  return {
    id: "asg-1",
    name: "Hypertrophy Block",
    description: "",
    startDate: "2026-07-09",
    endDate: "2026-08-30",
    totalWeeks: 8,
    weeksCompleted: 0,
    progressPercent: 0,
    phases: [],
    status: "active",
    ...overrides,
  } as ProgramSummary;
}

describe("todayStr", () => {
  it("formats a Date as YYYY-MM-DD in local time", () => {
    expect(todayStr(new Date(2026, 6, 9))).toBe("2026-07-09");
    expect(todayStr(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(todayStr(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("findAssignedOnDate", () => {
  it("returns the program whose startDate matches the given date", () => {
    const prog = makeProgram({ startDate: "2026-07-09" });
    const result = findAssignedOnDate([prog], "2026-07-09");
    expect(result?.id).toBe("asg-1");
  });

  it("ignores programs whose startDate differs", () => {
    const prog = makeProgram({ startDate: "2026-07-05" });
    const result = findAssignedOnDate([prog], "2026-07-09");
    expect(result).toBeNull();
  });

  it("skips null entries and picks the matching one among several", () => {
    const a = makeProgram({ id: "asg-a", startDate: "2026-07-01" });
    const b = makeProgram({ id: "asg-b", startDate: "2026-07-09" });
    const c = makeProgram({ id: "asg-c", startDate: "2026-07-20" });
    const result = findAssignedOnDate([a, null, b, c], "2026-07-09");
    expect(result?.id).toBe("asg-b");
  });

  it("returns null for an empty list", () => {
    expect(findAssignedOnDate([], "2026-07-09")).toBeNull();
  });
});

describe("findAssignedToday", () => {
  it("matches against local today", () => {
    const prog = makeProgram({ startDate: "2026-07-09" });
    const result = findAssignedToday([prog], new Date(2026, 6, 9));
    expect(result?.id).toBe("asg-1");
  });

  it("returns null when nothing starts today", () => {
    const prog = makeProgram({ startDate: "2026-08-01" });
    const result = findAssignedToday([prog], new Date(2026, 6, 9));
    expect(result).toBeNull();
  });
});
