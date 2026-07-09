// TDD RED → GREEN render tests for WorkoutPreviewScreen (T4, R4, D5).
// Mock useTemplate + getExercise so no network / PocketBase ESM is loaded.
const mockUseTemplate = jest.fn();
const mockGetExercise = jest.fn();

jest.mock("@/features/routines/hooks/useTemplates", () => ({
  useTemplate: (...args: any[]) => mockUseTemplate(...args),
}));
jest.mock("@/lib/pocketbase/services/exercises", () => ({
  getExercise: (...args: any[]) => mockGetExercise(...args),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import { WorkoutPreviewScreen } from "../WorkoutPreviewScreen";
import type { TemplateWithExercises } from "../../../lib/pocketbase/services/templates";

function makeTemplate(): TemplateWithExercises {
  return {
    id: "tpl-a",
    user_id: "coach-1",
    name: "Day A",
    description: "Leg day",
    program_block_id: null,
    is_public: false,
    created: "",
    updated: "",
    exercises: [
      {
        id: "te-1",
        workout_template_id: "tpl-a",
        exercise_id: "ex-1",
        sort_order: 0,
        target_sets: 4,
        target_reps: 8,
        target_rpe_low: null,
        target_rpe_high: null,
        rest_seconds: 120,
        notes: null,
      },
      {
        id: "te-2",
        workout_template_id: "tpl-a",
        exercise_id: "ex-2",
        sort_order: 1,
        target_sets: 3,
        target_reps: 10,
        target_rpe_low: null,
        target_rpe_high: null,
        rest_seconds: 90,
        notes: null,
      },
    ],
  } as TemplateWithExercises;
}

describe("WorkoutPreviewScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetExercise.mockImplementation((id: string) =>
      Promise.resolve({ id, name: id === "ex-1" ? "Squat" : "Bench Press" }),
    );
  });

  it("renders the real workout preview with resolved exercise names (R4 happy path)", async () => {
    mockUseTemplate.mockReturnValue({
      data: makeTemplate(),
      isLoading: false,
      error: null,
    });

    render(<WorkoutPreviewScreen workoutId="tpl-a" />);

    // Title comes from the real template.
    expect(screen.getByText("Day A")).toBeTruthy();
    // Exercise names resolved via getExercise batch (D5).
    await waitFor(() => {
      expect(screen.getByText("Squat")).toBeTruthy();
      expect(screen.getByText("Bench Press")).toBeTruthy();
    });
    // The permanent placeholder must be gone.
    expect(screen.queryByText(/Workout details will appear here/i)).toBeNull();
  });

  it("renders an empty preview for a template with no exercises (R4 edge)", () => {
    const tpl = makeTemplate();
    tpl.exercises = [];
    mockUseTemplate.mockReturnValue({ data: tpl, isLoading: false, error: null });

    render(<WorkoutPreviewScreen workoutId="tpl-empty" />);

    expect(screen.getByText("Day A")).toBeTruthy();
    expect(screen.queryByText(/Workout details will appear here/i)).toBeNull();
  });

  it("shows an error state (not the silent placeholder) when the fetch fails (R4 edge)", () => {
    mockUseTemplate.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("404"),
    });

    render(<WorkoutPreviewScreen workoutId="tpl-missing" />);

    expect(screen.getByText("Workout not found.")).toBeTruthy();
    expect(screen.queryByText(/Workout details will appear here/i)).toBeNull();
  });

  it("shows a loading state while the template is fetching", () => {
    mockUseTemplate.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<WorkoutPreviewScreen workoutId="tpl-a" />);

    expect(screen.getByText("Loading workout...")).toBeTruthy();
  });

  it("passes onStartWorkout through to the preview (no crash)", async () => {
    const onStartWorkout = jest.fn();
    mockUseTemplate.mockReturnValue({
      data: makeTemplate(),
      isLoading: false,
      error: null,
    });

    render(
      <WorkoutPreviewScreen workoutId="tpl-a" onStartWorkout={onStartWorkout} />,
    );

    await waitFor(() => expect(screen.getByText("Squat")).toBeTruthy());
    // Component renders the Start Workout button without throwing.
    expect(screen.queryByText("Start Workout")).toBeTruthy();
  });
});
