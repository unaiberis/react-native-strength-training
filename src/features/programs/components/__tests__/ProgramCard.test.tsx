/**
 * Tests for ProgramCard component.
 *
 * Validates rendering of program summary card with name, dates,
 * progress bar, weeks text, and status badge.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ProgramCard } from "../ProgramCard";
import type { ProgramSummary } from "../../program-types";

// ─── Fixtures ───────────────────────────────────────────────────────────

function createProgram(
  overrides: Partial<ProgramSummary> = {},
): ProgramSummary {
  return {
    id: "prog-1",
    name: "Summer Strength",
    description: "12-week strength building program",
    startDate: "2026-07-01",
    endDate: "2026-09-23",
    totalWeeks: 12,
    weeksCompleted: 2,
    progressPercent: 17,
    phases: [],
    status: "active",
    ...overrides,
  };
}

// ─── Suite ──────────────────────────────────────────────────────────────

describe("ProgramCard", () => {
  it("renders program name", () => {
    const program = createProgram({ name: "Fall Base" });
    const { getByText } = render(
      React.createElement(ProgramCard, { program }),
    );
    expect(getByText("Fall Base")).toBeTruthy();
  });

  it("renders description", () => {
    const program = createProgram({
      description: "A base-building mesocycle",
    });
    const { getByText } = render(
      React.createElement(ProgramCard, { program }),
    );
    expect(getByText("A base-building mesocycle")).toBeTruthy();
  });

  it("renders week progress text", () => {
    const program = createProgram({
      weeksCompleted: 4,
      totalWeeks: 12,
    });
    const { getByText } = render(
      React.createElement(ProgramCard, { program }),
    );
    expect(getByText("Week 4 of 12")).toBeTruthy();
  });

  it("renders progress percent", () => {
    const program = createProgram({ progressPercent: 33 });
    const { getByText } = render(
      React.createElement(ProgramCard, { program }),
    );
    expect(getByText("33%")).toBeTruthy();
  });

  it("renders status badge for active program", () => {
    const program = createProgram({ status: "active" });
    const { getByText } = render(
      React.createElement(ProgramCard, { program }),
    );
    expect(getByText("Active")).toBeTruthy();
  });

  it("renders status badge for completed program", () => {
    const program = createProgram({ status: "completed" });
    const { getByText } = render(
      React.createElement(ProgramCard, { program }),
    );
    expect(getByText("Completed")).toBeTruthy();
  });

  it("renders status badge for upcoming program", () => {
    const program = createProgram({ status: "upcoming" });
    const { getByText } = render(
      React.createElement(ProgramCard, { program }),
    );
    expect(getByText("Upcoming")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    const program = createProgram();
    const { getByText } = render(
      React.createElement(ProgramCard, { program, onPress }),
    );

    fireEvent.press(getByText("Summer Strength"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders date range", () => {
    const program = createProgram({
      startDate: "2026-07-01",
      endDate: "2026-09-23",
    });
    const { getByText } = render(
      React.createElement(ProgramCard, { program }),
    );

    // Should show something like "Jul 1 — Sep 23"
    expect(getByText(/Jul/i)).toBeTruthy();
    expect(getByText(/Sep/i)).toBeTruthy();
  });

  it("handles missing description gracefully", () => {
    const program = createProgram({ description: "" });
    const { queryByText } = render(
      React.createElement(ProgramCard, { program }),
    );
    // Should not crash — empty description is not rendered
    expect(queryByText(/base-building/)).toBeNull();
  });
});
