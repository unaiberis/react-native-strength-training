/**
 * Workout Summary Calculation Utilities
 *
 * Pure functions for computing post-workout summary metrics from
 * session data. No React/RN dependencies — testable in Node.
 */
import {
  calculateTonnage,
  findBestSetByE1RM,
} from "./pr-calc";
import type { LoggedSet } from "../../stores/session-store";

// ─── Types ───────────────────────────────────────────────────────────────

export interface ExerciseSummary {
  exerciseId: string;
  exerciseName: string;
  loggedSets: number;
  targetSets: number;
  /** Best set by estimated 1RM */
  bestSet: { weightKg: number; reps: number; e1rm: number; volume: number } | null;
  /** Total tonnage for this exercise */
  tonnage: number;
}

export interface WorkoutSummary {
  totalSets: number;
  totalExercises: number;
  completedExercises: number;
  durationMinutes: number;
  totalVolume: number;
  exerciseSummaries: ExerciseSummary[];
}

// ─── Computation ─────────────────────────────────────────────────────────

/**
 * Compute a full workout summary from session store data.
 *
 * Pure function — no hooks, no side effects. Suitable for testing.
 *
 * @param exercises - List of exercises with their logged sets
 * @param startedAt - ISO date string of session start, or null
 */
export function computeWorkoutSummary(
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    targetSets: number;
    loggedSets: LoggedSet[];
  }>,
  startedAt: string | null,
): WorkoutSummary {
  const totalSets = exercises.reduce((sum, ex) => sum + ex.loggedSets.length, 0);
  const totalExercises = exercises.length;
  const completedExercises = exercises.filter((ex) => ex.loggedSets.length > 0).length;

  const durationMinutes = startedAt
    ? Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)
    : 0;

  const exerciseSummaries: ExerciseSummary[] = exercises.map((ex) => {
    const workingSets = ex.loggedSets.filter((s) => s.weightKg > 0 && s.reps > 0);
    const bestSet = workingSets.length > 0 ? findBestSetByE1RM(workingSets) : null;
    const tonnage = calculateTonnage(
      workingSets.map((s) => ({ weightKg: s.weightKg, reps: s.reps })),
    );

    return {
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      loggedSets: ex.loggedSets.length,
      targetSets: ex.targetSets,
      bestSet: bestSet
        ? {
            weightKg: bestSet.weightKg,
            reps: bestSet.reps,
            e1rm: Math.round(bestSet.e1rm * 10) / 10,
            volume: bestSet.volume,
          }
        : null,
      tonnage,
    };
  });

  const totalVolume = exerciseSummaries.reduce((sum, es) => sum + es.tonnage, 0);

  return {
    totalSets,
    totalExercises,
    completedExercises,
    durationMinutes,
    totalVolume,
    exerciseSummaries,
  };
}
