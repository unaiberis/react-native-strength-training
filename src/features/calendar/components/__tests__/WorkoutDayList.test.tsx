/**
 * Tests for WorkoutDayList component.
 *
 * Validates rendering of workout items, empty state with CTA,
 * and press handlers for detail navigation and start workout.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { WorkoutDayList } from "../WorkoutDayList";
import type { WorkoutSummary } from "../../hooks/useSessionsForDate";

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeWorkout(overrides: Partial<WorkoutSummary> = {}): WorkoutSummary {
  return {
    id: "sess-1",
    templateName: "Upper Body",
    status: "completed",
    startedAt: "2026-07-08T10:00:00.000Z",
    durationMinutes: 60,
    exerciseCount: 4,
    ...overrides,
  };
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe("WorkoutDayList", () => {
  const defaultProps = {
    sessions: [] as WorkoutSummary[],
    date: "2026-07-08",
    onStartWorkout: jest.fn(),
    onViewDetail: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("with sessions", () => {
    it("renders a list of workout items", () => {
      const sessions = [
        makeWorkout({ id: "s1", templateName: "Upper Body" }),
        makeWorkout({ id: "s2", templateName: "Leg Day" }),
      ];

      const { getByText } = render(
        React.createElement(WorkoutDayList, { ...defaultProps, sessions }),
      );

      expect(getByText("Upper Body")).toBeTruthy();
      expect(getByText("Leg Day")).toBeTruthy();
    });

    it("renders the formatted date header", () => {
      const sessions = [makeWorkout()];

      const { getByText } = render(
        React.createElement(WorkoutDayList, { ...defaultProps, sessions }),
      );

      // Should contain July and 8 in the date header
      expect(getByText(/July|Jul/i)).toBeTruthy();
    });

    it("calls onViewDetail when tapping a workout item", () => {
      const onViewDetail = jest.fn();
      const sessions = [
        makeWorkout({ id: "sess-detail", templateName: "Push Day" }),
      ];

      const { getByText } = render(
        React.createElement(WorkoutDayList, {
          ...defaultProps,
          sessions,
          onViewDetail,
        }),
      );

      fireEvent.press(getByText("Push Day"));
      expect(onViewDetail).toHaveBeenCalledWith("sess-detail");
    });

    it("renders status badges for each workout", () => {
      const sessions = [
        makeWorkout({ status: "completed" }),
        makeWorkout({ id: "s2", status: "active", templateName: "Pull Day" }),
        makeWorkout({ id: "s3", status: "assigned", templateName: "Cardio" }),
      ];

      const { getByText } = render(
        React.createElement(WorkoutDayList, { ...defaultProps, sessions }),
      );

      expect(getByText("Completed")).toBeTruthy();
      expect(getByText("In Progress")).toBeTruthy();
      expect(getByText("Assigned")).toBeTruthy();
    });

    it("renders duration and exercise count", () => {
      const sessions = [makeWorkout({ durationMinutes: 45, exerciseCount: 5 })];

      const { getByText } = render(
        React.createElement(WorkoutDayList, { ...defaultProps, sessions }),
      );

      expect(getByText("45 min")).toBeTruthy();
      expect(getByText("5 exercises")).toBeTruthy();
    });

    it("handles singular exercise count", () => {
      const sessions = [makeWorkout({ exerciseCount: 1 })];

      const { getByText } = render(
        React.createElement(WorkoutDayList, { ...defaultProps, sessions }),
      );

      expect(getByText("1 exercise")).toBeTruthy();
    });

    it("falls back to 'Free Workout' when templateName is null", () => {
      const sessions = [makeWorkout({ templateName: null })];

      const { getByText } = render(
        React.createElement(WorkoutDayList, { ...defaultProps, sessions }),
      );

      expect(getByText("Free Workout")).toBeTruthy();
    });
  });

  describe("empty state", () => {
    it("renders empty state when no sessions", () => {
      const { getByText } = render(
        React.createElement(WorkoutDayList, { ...defaultProps, sessions: [] }),
      );

      expect(
        getByText("Rest day — No workout scheduled"),
      ).toBeTruthy();
    });

    it("renders 'Start a Workout' CTA button in empty state", () => {
      const onStartWorkout = jest.fn();

      const { getByText } = render(
        React.createElement(WorkoutDayList, {
          ...defaultProps,
          sessions: [],
          onStartWorkout,
        }),
      );

      fireEvent.press(getByText("Start a Workout"));
      expect(onStartWorkout).toHaveBeenCalledTimes(1);
    });
  });
});
