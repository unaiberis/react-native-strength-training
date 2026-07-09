// TDD render tests for PhaseCard (T4 — render real phase data).
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PhaseCard } from "../PhaseCard";
import type { ProgramPhaseSummary } from "../../program-types";

function makePhase(
  overrides: Partial<ProgramPhaseSummary> = {},
): ProgramPhaseSummary {
  return {
    id: "phase-tpl-1",
    name: "Hypertrophy Block",
    weekStart: 1,
    weekEnd: 8,
    workoutCount: 1,
    ...overrides,
  } as ProgramPhaseSummary;
}

describe("PhaseCard", () => {
  it("renders the real phase name, week range, and workout count", () => {
    render(<PhaseCard phase={makePhase()} />);

    expect(screen.getByText("Hypertrophy Block")).toBeTruthy();
    expect(screen.getByText("Weeks 1–8")).toBeTruthy();
    expect(screen.getByText("1 workout")).toBeTruthy();
  });

  it("shows the assigned workout count when expanded (active phase)", () => {
    render(<PhaseCard phase={makePhase()} isActive />);

    expect(screen.getByText("1 workout assigned")).toBeTruthy();
  });

  it("expands on tap to reveal the assigned count when not active", () => {
    render(<PhaseCard phase={makePhase({ workoutCount: 2 })} />);

    // Collapsed by default → detail hidden.
    expect(screen.queryByText("2 workouts assigned")).toBeNull();

    const header = screen.getByLabelText(/Hypertrophy Block/);
    fireEvent.press(header);

    expect(screen.getByText("2 workouts assigned")).toBeTruthy();
  });

  it("reflects zero assigned workouts gracefully", () => {
    render(<PhaseCard phase={makePhase({ workoutCount: 0 })} isActive />);

    expect(screen.getByText("No workouts scheduled yet")).toBeTruthy();
  });
});
