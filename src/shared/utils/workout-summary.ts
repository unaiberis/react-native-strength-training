/**
 * Workout Summary Calculation Utilities
 *
 * Pure functions for computing post-workout summary metrics from session
 * and set data. No React/RN dependencies — testable in Node.
 */

import { calculateTonnage } from "./pr-calc";

// ─── Types ───────────────────────────────────────────────────────────────

export interface ExerciseBreakdownEntry {
  exerciseId: string;
  exerciseName: string;
  bestSet: { weight: number; reps: number; estimatedOneRm: number } | null;
  isPr: boolean;
}

export interface WorkoutSummary {
  totalSets: number;
  totalVolume: number; // kg (weight × reps across all sets)
  duration: number; // minutes
  exerciseBreakdown: ExerciseBreakdownEntry[];
}

// ─── Epley Formula ───────────────────────────────────────────────────────

/**
 * Estimate 1RM using the Epley formula.
 *
 *   e1RM = weight × (1 + reps / 30)
 *
 * Returns 0 when reps or weight are non-positive.
 */
export function estimateOneRm(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return weight * (1 + reps / 30);
}

// ─── Summary Computation ─────────────────────────────────────────────────

/**
 * Compute a full workout summary from session metadata and logged sets.
 *
 * Groups sets by exercise_id, finds the best set per exercise (by e1RM),
 * and optionally compares against previous PRs to flag new records.
 *
 * @param session     - Session metadata (started_at, completed_at)
 * @param sets        - All logged sets across exercises
 * @param previousPrs - Map of exercise_id → best previous estimated 1RM
 */
export function computeWorkoutSummary(
  session: { started_at?: string; completed_at?: string },
  sets: Array<{ exercise_id: string; weight: number; reps: number; exercise_name?: string }>,
  previousPrs?: Record<string, number>,
): WorkoutSummary {
  const totalSets = sets.length;

  // Total volume = Σ(weight × reps) across ALL sets
  const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

  // Duration in minutes
  let duration = 0;
  if (session.started_at) {
    const start = new Date(session.started_at).getTime();
    const end = session.completed_at
      ? new Date(session.completed_at).getTime()
      : Date.now();
    duration = Math.max(0, Math.round((end - start) / 60000));
  }

  // Group sets by exercise_id
  const exerciseMap = new Map<string, typeof sets>();
  for (const s of sets) {
    const group = exerciseMap.get(s.exercise_id) ?? [];
    group.push(s);
    exerciseMap.set(s.exercise_id, group);
  }

  // Build breakdown per exercise
  const exerciseBreakdown: ExerciseBreakdownEntry[] = [];

  for (const [exerciseId, exSets] of exerciseMap) {
    const exerciseName = exSets[0]?.exercise_name ?? "";

    let bestSet: { weight: number; reps: number; estimatedOneRm: number } | null = null;
    let bestE1RM = 0;

    for (const s of exSets) {
      const e1rm = estimateOneRm(s.weight, s.reps);
      if (e1rm > bestE1RM) {
        bestE1RM = e1rm;
        bestSet = { weight: s.weight, reps: s.reps, estimatedOneRm: e1rm };
      }
    }

    // Check if this is a PR vs previous best
    const isPr =
      bestSet !== null &&
      previousPrs !== undefined &&
      bestSet.estimatedOneRm > (previousPrs[exerciseId] ?? 0);

    exerciseBreakdown.push({ exerciseId, exerciseName, bestSet, isPr });
  }

  return { totalSets, totalVolume, duration, exerciseBreakdown };
}
