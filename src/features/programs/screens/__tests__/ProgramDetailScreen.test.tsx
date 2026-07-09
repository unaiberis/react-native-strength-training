// TDD render tests for ProgramDetailScreen (T4, R3).
// Mock useProgramDetail so no network / PocketBase ESM is loaded.
const mockUseProgramDetail = jest.fn();

jest.mock("@/features/programs/hooks/useProgramDetail", () => ({
  useProgramDetail: (...args: any[]) => mockUseProgramDetail(...args),
}));

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ProgramDetailScreen } from "../ProgramDetailScreen";
import type { ProgramSummary } from "../../hooks/usePrograms";

function makeProgram(
  overrides: Partial<ProgramSummary> = {},
): ProgramSummary {
  return {
    id: "asg-b",
    name: "Hypertrophy Block",
    description: "8-week linear progression",
    startDate: "2026-07-05",
    endDate: "2026-08-30",
    totalWeeks: 8,
    weeksCompleted: 0,
    progressPercent: 0,
    phases: [
      {
        id: "phase-tpl-1",
        name: "Hypertrophy Block",
        weekStart: 1,
        weekEnd: 8,
        workoutCount: 1,
      },
    ],
    status: "active",
    ...overrides,
  } as ProgramSummary;
}

describe("ProgramDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders real program data (title is NOT 'Program not found.') (R3 happy path)", () => {
    mockUseProgramDetail.mockReturnValue({
      program: makeProgram(),
      isLoading: false,
      error: null,
    });

    render(<ProgramDetailScreen programId="asg-b" />);

    expect(screen.getAllByText("Hypertrophy Block").length).toBeGreaterThan(0);
    expect(screen.getByText("8-week linear progression")).toBeTruthy();
    // Progress section renders real values.
    expect(screen.getByText("0%")).toBeTruthy();
    // Phase card renders the real derived phase.
    expect(screen.getByText("Weeks 1–8")).toBeTruthy();
    expect(screen.queryByText("Program not found.")).toBeNull();
  });

  it("renders without a description when one is absent", () => {
    mockUseProgramDetail.mockReturnValue({
      program: makeProgram({ description: "" }),
      isLoading: false,
      error: null,
    });

    render(<ProgramDetailScreen programId="asg-b" />);

    expect(screen.getAllByText("Hypertrophy Block").length).toBeGreaterThan(0);
    expect(screen.queryByText("8-week linear progression")).toBeNull();
  });

  it("shows a true not-found state when there is no program (R3/R6)", () => {
    mockUseProgramDetail.mockReturnValue({
      program: null,
      isLoading: false,
      error: null,
    });

    render(<ProgramDetailScreen programId="missing" />);

    expect(screen.getByText("Program not found.")).toBeTruthy();
  });

  it("renders an empty phases card (no throw) when the template is null (R3 edge)", () => {
    mockUseProgramDetail.mockReturnValue({
      // Null template → mapAssignmentToProgramSummary returns phases [].
      program: makeProgram({ phases: [], name: "Untitled Program" }),
      isLoading: false,
      error: null,
    });

    render(<ProgramDetailScreen programId="asg-x" />);

    expect(
      screen.getByText(/Program phases and workouts will appear/i),
    ).toBeTruthy();
  });

  it("shows a loading indicator while fetching", () => {
    mockUseProgramDetail.mockReturnValue({
      program: null,
      isLoading: true,
      error: null,
    });

    render(<ProgramDetailScreen programId="asg-b" />);

    expect(screen.getByText("Loading program...")).toBeTruthy();
    expect(screen.queryByText("Program not found.")).toBeNull();
  });

  it("renders a year-crossing date range without crashing (formatDateRange branch)", () => {
    mockUseProgramDetail.mockReturnValue({
      program: makeProgram({
        startDate: "2026-12-20",
        endDate: "2027-02-14",
      }),
      isLoading: false,
      error: null,
    });

    render(<ProgramDetailScreen programId="asg-b" />);

    expect(screen.getAllByText("Hypertrophy Block").length).toBeGreaterThan(0);
  });
});
