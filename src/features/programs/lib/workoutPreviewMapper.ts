/**
 * Pure mapping: a coach template (`TemplateWithExercises`) + a resolved
 * exercise-id → name map into the existing `WorkoutPreviewData` shape used by
 * the `WorkoutPreview` component.
 *
 * Single-block fallback (D5): one `straight_set` block named "Workout"
 * containing every template exercise, with sets/reps/rest pulled from the
 * template exercise rows. Name resolution happens outside this function
 * (via `getExercise` batch) and is passed in as `nameMap` so the mapping
 * stays pure and unit-testable.
 */

import type { TemplateWithExercises } from "../../../lib/pocketbase/services/templates";
import type {
  WorkoutBlockExercise,
  WorkoutPreviewData,
} from "../components/WorkoutPreview";

export function mapTemplateToWorkoutPreview(
  tpl: TemplateWithExercises,
  nameMap: Record<string, string>,
): WorkoutPreviewData {
  const exercises: WorkoutBlockExercise[] = tpl.exercises.map((ex) => ({
    id: ex.id,
    name: nameMap[ex.exercise_id] ?? ex.exercise_id,
    targetSets: ex.target_sets,
    targetReps: ex.target_reps,
    restSeconds: ex.rest_seconds,
    notes: ex.notes ?? undefined,
  }));

  return {
    id: tpl.id,
    name: tpl.name,
    description: tpl.description ?? undefined,
    blocks:
      exercises.length === 0
        ? []
        : [
            {
              id: `block-${tpl.id}`,
              name: "Workout",
              type: "straight_set",
              exercises,
            },
          ],
  };
}
