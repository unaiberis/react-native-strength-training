// TDD RED → GREEN unit tests for mapTemplateToWorkoutPreview (T4, D5).
// Pure function — no mocks needed. Maps a TemplateWithExercises + an
// exercise-id→name map into the existing WorkoutPreviewData shape.
import { mapTemplateToWorkoutPreview } from "../workoutPreviewMapper";
import type { TemplateWithExercises } from "../../../lib/pocketbase/services/templates";

function makeTpl(
  overrides: Partial<TemplateWithExercises> = {},
): TemplateWithExercises {
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
    ],
    ...overrides,
  } as TemplateWithExercises;
}

describe("mapTemplateToWorkoutPreview", () => {
  it("maps a template into a single straight_set block with sets/reps/rest", () => {
    const tpl = makeTpl();
    const data = mapTemplateToWorkoutPreview(tpl, { "ex-1": "Squat" });

    expect(data.id).toBe("tpl-a");
    expect(data.name).toBe("Day A");
    expect(data.description).toBe("Leg day");
    expect(data.blocks).toHaveLength(1);

    const block = data.blocks[0];
    expect(block.type).toBe("straight_set");
    expect(block.name).toBe("Workout");
    expect(block.exercises).toHaveLength(1);
    expect(block.exercises[0]).toEqual({
      id: "te-1",
      name: "Squat",
      targetSets: 4,
      targetReps: 8,
      restSeconds: 120,
      notes: undefined,
    });
  });

  it("returns blocks:[] when the template has no exercises (R4 edge)", () => {
    const tpl = makeTpl({ exercises: [] });
    const data = mapTemplateToWorkoutPreview(tpl, {});
    expect(data.blocks).toEqual([]);
  });

  it("falls back to exercise_id when the name is missing from the map", () => {
    const tpl = makeTpl();
    const data = mapTemplateToWorkoutPreview(tpl, {});
    expect(data.blocks[0].exercises[0].name).toBe("ex-1");
  });

  it("carries notes through when present", () => {
    const tpl = makeTpl({
      exercises: [
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
          notes: "Control the tempo",
        },
      ],
    });
    const data = mapTemplateToWorkoutPreview(tpl, { "ex-2": "Bench Press" });
    expect(data.blocks[0].exercises[0].name).toBe("Bench Press");
    expect(data.blocks[0].exercises[0].notes).toBe("Control the tempo");
  });
});
