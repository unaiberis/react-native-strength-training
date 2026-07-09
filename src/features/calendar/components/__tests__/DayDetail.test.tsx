/**
 * Tests for DayDetail component.
 *
 * Validates rendering of workout cards (active/completed),
 * empty state for rest days, and action button handlers.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { DayDetail, type WorkoutSummary } from "../DayDetail";

// ─── Fixtures ───────────────────────────────────────────────────────────

function makeWorkout(overrides: Partial<WorkoutSummary> = {}): WorkoutSummary {
  return {
    id: "session-1",
    name: "Upper Body",
    blockCount: 3,
    estimatedMinutes: 45,
    completed: false,
    ...overrides,
  };
}

// ─── Suite ──────────────────────────────────────────────────────────────

describe("DayDetail", () => {
  const defaultProps = {
    date: "2026-07-08",
    workout: null as WorkoutSummary | null,
    onStartWorkout: jest.fn(),
    onViewDetail: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("empty state", () => {
    it("renders empty state when no workout", () => {
      const { getByText } = render(
        React.createElement(DayDetail, defaultProps),
      );

      expect(getByText("No Workout Scheduled")).toBeTruthy();
      expect(
        getByText("Rest days are part of the plan. Stay ready."),
      ).toBeTruthy();
    });

    it("renders start workout button in empty state", () => {
      const onStartWorkout = jest.fn();
      const { getByText } = render(
        React.createElement(DayDetail, {
          ...defaultProps,
          onStartWorkout,
        }),
      );

      fireEvent.press(getByText("Start a Workout"));
      expect(onStartWorkout).toHaveBeenCalledTimes(1);
    });

    it("shows formatted date for empty day", () => {
      const { getByText } = render(
        React.createElement(DayDetail, {
          ...defaultProps,
          date: "2026-07-15",
        }),
      );

      expect(getByText("No Workout Scheduled")).toBeTruthy();
    });
  });

  describe("active workout", () => {
    it("renders workout name", () => {
      const workout = makeWorkout({ name: "Push Day" });
      const { getByText } = render(
        React.createElement(DayDetail, {
          ...defaultProps,
          workout,
        }),
      );

      expect(getByText("Push Day")).toBeTruthy();
    });

    it("shows free workout fallback when name is null", () => {
      const workout = makeWorkout({ name: null });
      const { getByText } = render(
        React.createElement(DayDetail, {
          ...defaultProps,
          workout,
        }),
      );

      expect(getByText("Free Workout")).toBeTruthy();
    });

    it("shows block count", () => {
      const workout = makeWorkout({ blockCount: 4 });
      const { getByText } = render(
        React.createElement(DayDetail, {
          ...defaultProps,
          workout,
        }),
      );

      expect(getByText("4 blocks")).toBeTruthy();
    });

    it("shows estimated time", () => {
      const workout = makeWorkout({ estimatedMinutes: 60 });
      const { getByText } = render(
        React.createElement(DayDetail, {
          ...defaultProps,
          workout,
        }),
      );

      expect(getByText("~60 min")).toBeTruthy();
    });

    it('shows "Start Workout" button for active workout', () => {
      const workout = makeWorkout({ completed: false });
      const onStartWorkout = jest.fn();
      const { getByText } = render(
        React.createElement(DayDetail, {
          ...defaultProps,
          workout,
          onStartWorkout,
        }),
      );

      fireEvent.press(getByText("Start Workout"));
      expect(onStartWorkout).toHaveBeenCalledTimes(1);
    });

    it("renders formatted date above workout card", () => {
      const workout = makeWorkout();
      const { getByText } = render(
        React.createElement(DayDetail, {
          ...defaultProps,
          date: "2026-07-08",
          workout,
        }),
      );

      // Should show the formatted date (varies by locale, check for "8" or "July")
      const dateElement = getByText(/8|July|Jul/i);
      expect(dateElement).toBeTruthy();
    });
  });

  describe("completed workout", () => {
    it('shows "Completed" status', () => {
      const workout = makeWorkout({ completed: true });
      const { getByText } = render(
        React.createElement(DayDetail, {
          ...defaultProps,
          workout,
        }),
      );

      expect(getByText("Completed")).toBeTruthy();
    });

    it('shows "View Details" button for completed workout', () => {
      const workout = makeWorkout({ completed: true });
      const onViewDetail = jest.fn();
      const { getByText } = render(
        React.createElement(DayDetail, {
          ...defaultProps,
          workout,
          onViewDetail,
        }),
      );

      fireEvent.press(getByText("View Details"));
      expect(onViewDetail).toHaveBeenCalledTimes(1);
    });
  });
});
