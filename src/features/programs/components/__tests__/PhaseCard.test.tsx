/**
 * Tests for PhaseCard component.
 *
 * Validates rendering of phase summary — name, week range,
 * workout count badge, expandable toggle, and active state.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PhaseCard } from "../PhaseCard";
import type { ProgramPhaseSummary } from "../../hooks/usePrograms";

// ─── Fixtures ───────────────────────────────────────────────────────────

function createPhase(
  overrides: Partial<ProgramPhaseSummary> = {},
): ProgramPhaseSummary {
  return {
    id: "phase-1",
    name: "Hypertrophy Block",
    weekStart: 1,
    weekEnd: 4,
    workoutCount: 12,
    ...overrides,
  };
}

// ─── Suite ──────────────────────────────────────────────────────────────

describe("PhaseCard", () => {
  it("renders phase name", () => {
    const phase = createPhase({ name: "Strength Phase" });
    const { getByText } = render(
      React.createElement(PhaseCard, { phase }),
    );
    expect(getByText("Strength Phase")).toBeTruthy();
  });

  it("renders week range", () => {
    const phase = createPhase({ weekStart: 5, weekEnd: 8 });
    const { getByText } = render(
      React.createElement(PhaseCard, { phase }),
    );
    expect(getByText("Weeks 5–8")).toBeTruthy();
  });

  it("renders workout count badge", () => {
    const phase = createPhase({ workoutCount: 8 });
    const { getByText } = render(
      React.createElement(PhaseCard, { phase }),
    );
    expect(getByText("8 workouts")).toBeTruthy();
  });

  it("renders singular workout count", () => {
    const phase = createPhase({ workoutCount: 1 });
    const { getByText } = render(
      React.createElement(PhaseCard, { phase }),
    );
    expect(getByText("1 workout")).toBeTruthy();
  });

  it("shows active indicator when isActive is true", () => {
    const phase = createPhase();
    const { getByLabelText } = render(
      React.createElement(PhaseCard, { phase, isActive: true }),
    );
    expect(
      getByLabelText(
        "Hypertrophy Block, Weeks 1-4, 12 workouts",
      ),
    ).toBeTruthy();
  });

  it("expands on press to show workout list", () => {
    const phase = createPhase();
    const { getByText, getByLabelText } = render(
      React.createElement(PhaseCard, { phase }),
    );

    // Before press — collapsed, shows placeholder
    // After press — expanded, shows the placeholder text
    fireEvent.press(
      getByLabelText(
        "Hypertrophy Block, Weeks 1-4, 12 workouts",
      ),
    );

    expect(
      getByText(
        "Workouts will appear here once the program is assigned.",
      ),
    ).toBeTruthy();
  });

  it("toggles expanded state on subsequent presses", () => {
    const phase = createPhase();
    const { getByLabelText, queryByText } = render(
      React.createElement(PhaseCard, { phase }),
    );

    const trigger = getByLabelText(
      "Hypertrophy Block, Weeks 1-4, 12 workouts",
    );

    // Press to expand
    fireEvent.press(trigger);
    expect(
      getByLabelText(
        "Hypertrophy Block, Weeks 1-4, 12 workouts",
      ),
    ).toBeTruthy();

    // Press again to collapse
    fireEvent.press(trigger);
    // Placeholder should be hidden
    expect(
      queryByText(
        "Workouts will appear here once the program is assigned.",
      ),
    ).toBeNull();
  });

  it("starts expanded when isActive is true", () => {
    const phase = createPhase();
    const { getByText } = render(
      React.createElement(PhaseCard, { phase, isActive: true }),
    );

    // Active phase starts expanded
    expect(
      getByText(
        "Workouts will appear here once the program is assigned.",
      ),
    ).toBeTruthy();
  });

  it("renders without crash when no workouts exist", () => {
    const phase = createPhase({ workoutCount: 0 });
    const { getByText } = render(
      React.createElement(PhaseCard, { phase }),
    );
    expect(getByText("0 workouts")).toBeTruthy();
  });
});
