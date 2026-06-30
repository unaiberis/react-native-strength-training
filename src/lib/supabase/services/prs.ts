import { supabase } from "../client";
import {
  calculateE1RM,
  calculateVolume,
  calculateTonnage,
  detectPRs,
  isTonnagePR,
} from "../../../shared/utils/pr-calc";

// ─── Row Types ────────────────────────────────────────────────────────────

export type PRType =
  | "one_rep_max"
  | "estimated_one_rep_max"
  | "best_volume_set"
  | "best_tonnage"
  | "best_reps_at_weight";

export interface PersonalRecordRow {
  id: string;
  user_id: string;
  exercise_id: string;
  pr_type: PRType;
  value: number;
  reps: number | null;
  weight_kg: number | null;
  workout_session_id: string;
  achieved_at: string;
  created_at: string;
}

export interface PRWithExercise extends PersonalRecordRow {
  exerciseName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Fetch all completed sets for a given session, grouped by exercise_id.
 * Filters out warmup sets.
 */
async function getSessionSetsByExercise(
  sessionId: string,
): Promise<Map<string, { weightKg: number; reps: number }[]>> {
  const { data, error } = await supabase
    .from("exercise_sets")
    .select("exercise_id, weight_kg, reps")
    .eq("workout_session_id", sessionId)
    .eq("is_warmup", false)
    .order("set_number", { ascending: true });

  if (error) throw new Error(error.message);

  const map = new Map<string, { weightKg: number; reps: number }[]>();

  for (const row of data ?? []) {
    const sets = map.get(row.exercise_id) ?? [];
    sets.push({ weightKg: Number(row.weight_kg), reps: row.reps });
    map.set(row.exercise_id, sets);
  }

  return map;
}

/**
 * Fetch the session's user_id.
 */
async function getSessionUserId(sessionId: string): Promise<string> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Session not found");
  return data.user_id;
}

// ─── Existing PR values per exercise ──────────────────────────────────────

interface ExistingPRs {
  oneRepMax?: number;
  estimatedOneRepMax?: number;
  bestVolumeSet?: number;
  bestTonnage?: number;
}

/**
 * Load the best existing PR values for a given exercise (best across all types).
 */
async function getExistingPRs(
  userId: string,
  exerciseId: string,
): Promise<ExistingPRs> {
  const { data, error } = await supabase
    .from("personal_records")
    .select("pr_type, value")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId);

  if (error) throw new Error(error.message);

  const result: ExistingPRs = {};
  for (const row of data ?? []) {
    const val = Number(row.value);
    switch (row.pr_type) {
      case "one_rep_max":
        result.oneRepMax = Math.max(result.oneRepMax ?? 0, val);
        break;
      case "estimated_one_rep_max":
        result.estimatedOneRepMax = Math.max(result.estimatedOneRepMax ?? 0, val);
        break;
      case "best_volume_set":
        result.bestVolumeSet = Math.max(result.bestVolumeSet ?? 0, val);
        break;
      case "best_tonnage":
        result.bestTonnage = Math.max(result.bestTonnage ?? 0, val);
        break;
    }
  }

  return result;
}

// ─── Insert a single PR record ────────────────────────────────────────────

async function insertPR(
  userId: string,
  exerciseId: string,
  prType: PRType,
  value: number,
  sessionId: string,
  options?: { weightKg?: number; reps?: number },
): Promise<PersonalRecordRow> {
  const { data, error } = await supabase
    .from("personal_records")
    .insert({
      user_id: userId,
      exercise_id: exerciseId,
      pr_type: prType,
      value,
      weight_kg: options?.weightKg ?? null,
      reps: options?.reps ?? null,
      workout_session_id: sessionId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to insert PR");
  return data as PersonalRecordRow;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * After a session is completed, evaluate every exercise's logged sets against
 * historical PRs and insert new records where the current performance beats
 * the previous best.
 *
 * Returns an array of newly inserted PRs (empty if none achieved).
 */
export async function detectAndSavePRs(
  sessionId: string,
): Promise<PersonalRecordRow[]> {
  const userId = await getSessionUserId(sessionId);
  const exerciseSets = await getSessionSetsByExercise(sessionId);
  const newPRs: PersonalRecordRow[] = [];

  for (const [exerciseId, sets] of exerciseSets) {
    if (sets.length === 0) continue;

    const previous = await getExistingPRs(userId, exerciseId);
    const detected = detectPRs(sets, {
      oneRepMax: previous.oneRepMax,
      estimatedOneRepMax: previous.estimatedOneRepMax,
      bestVolumeSet: previous.bestVolumeSet,
      bestTonnage: previous.bestTonnage,
    });

    // 1. Actual 1RM
    if (detected.newOneRepMax) {
      const pr = await insertPR(
        userId,
        exerciseId,
        "one_rep_max",
        detected.newOneRepMax.weightKg,
        sessionId,
        {
          weightKg: detected.newOneRepMax.weightKg,
          reps: detected.newOneRepMax.reps,
        },
      );
      newPRs.push(pr);
    }

    // 2. Estimated 1RM
    if (detected.newEstimatedOneRepMax) {
      const pr = await insertPR(
        userId,
        exerciseId,
        "estimated_one_rep_max",
        detected.newEstimatedOneRepMax.e1rm,
        sessionId,
        {
          weightKg: detected.newEstimatedOneRepMax.weightKg,
          reps: detected.newEstimatedOneRepMax.reps,
        },
      );
      newPRs.push(pr);
    }

    // 3. Best volume set
    if (detected.newBestVolumeSet) {
      const pr = await insertPR(
        userId,
        exerciseId,
        "best_volume_set",
        detected.newBestVolumeSet.volume,
        sessionId,
        {
          weightKg: detected.newBestVolumeSet.weightKg,
          reps: detected.newBestVolumeSet.reps,
        },
      );
      newPRs.push(pr);
    }

    // 4. Total tonnage
    if (isTonnagePR(detected.tonnage, previous.bestTonnage)) {
      const pr = await insertPR(
        userId,
        exerciseId,
        "best_tonnage",
        detected.tonnage,
        sessionId,
      );
      newPRs.push(pr);
    }
  }

  return newPRs;
}

// ─── List PRs ─────────────────────────────────────────────────────────────

/**
 * List all personal records for a user, grouped by exercise.
 * Includes the exercise name for display.
 */
export async function listPRs(userId: string): Promise<PRWithExercise[]> {
  const { data, error } = await supabase
    .from("personal_records")
    .select("*, exercises!inner(name)")
    .eq("user_id", userId)
    .order("achieved_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as PersonalRecordRow & { exercises: { name: string } };
    return {
      ...r,
      pr_type: r.pr_type as PRType,
      value: Number(r.value),
      weight_kg: r.weight_kg != null ? Number(r.weight_kg) : null,
      reps: r.reps ?? null,
      exerciseName: r.exercises.name,
    };
  });
}

/**
 * List PRs for a specific exercise.
 */
export async function getExercisePRs(
  userId: string,
  exerciseId: string,
): Promise<PersonalRecordRow[]> {
  const { data, error } = await supabase
    .from("personal_records")
    .select("*")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .order("achieved_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PersonalRecordRow[];
}

/**
 * Delete all PRs associated with a session (for rollback / re-calculation).
 */
export async function deleteSessionPRs(
  sessionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("personal_records")
    .delete()
    .eq("workout_session_id", sessionId);

  if (error) throw new Error(error.message);
}
