import { pb } from "../client";
import type { ExerciseSetRow } from "../../../types/pocketbase";
import {
  calculateE1RM,
  calculateVolume,
  calculateTonnage,
} from "../../../shared/utils/pr-calc";

// ─── Types ──────────────────────────────────────────────────────────────

export type PRType =
  | "one_rep_max"
  | "estimated_one_rep_max"
  | "best_volume_set"
  | "best_reps_at_weight";

export interface ComputedPR {
  exerciseId: string;
  exerciseName: string;
  /** Highest weight lifted for a single rep (exactly 1 rep) */
  oneRepMax: number | null;
  /** Best estimated 1RM (Epley) across all sets */
  estimatedOneRepMax: number | null;
  /** Best volume (weight × reps) for a single set */
  bestVolumeSet: number | null;
  /** Highest weight recorded (any reps) */
  maxWeight: number | null;
  /** Highest reps recorded (any weight) */
  maxReps: number | null;
  /** Total tonnage across all working sets for this exercise */
  totalTonnage: number | null;
}

export interface PRHistoryEntry {
  date: string;
  value: number;
  weightKg: number | null;
  reps: number | null;
  sessionId: string;
}

export interface CheckPRResult {
  isPR: boolean;
  currentBest: number | null;
  proposedValue: number;
  prType: PRType | null;
}

// ─── Internal helpers ────────────────────────────────────────────────────

/**
 * Get working (non-warmup) sets for a user, optionally filtered by exercise IDs.
 */
async function getWorkingSetsForUser(
  userId: string,
  exerciseIds?: string[],
): Promise<ExerciseSetRow[]> {
  // PocketBase doesn't support joins, so we get sessions first, then sets
  const sessions = await pb.collection("workout_sessions").getFullList({
    filter: `user_id = '${userId}'`,
    fields: "id",
  });

  const sessionIds = (sessions ?? []).map((s: any) => s.id);
  if (sessionIds.length === 0) return [];

  // Build filter: session in list + non-warmup + optional exercise filter
  let filter = sessionIds
    .map((sid: string) => `workout_session_id = '${sid}'`)
    .join(" || ");

  filter = `(${filter}) && is_warmup = false`;

  if (exerciseIds && exerciseIds.length > 0) {
    const exFilter = exerciseIds.map((eid) => `exercise_id = '${eid}'`).join(" || ");
    filter = `${filter} && (${exFilter})`;
  }

  const records = await pb.collection("exercise_sets").getFullList({
    filter,
    sort: "logged_at",
  });

  return (records ?? []) as unknown as ExerciseSetRow[];
}

/**
 * Group exercise sets by exercise_id.
 */
function groupSetsByExercise(
  sets: ExerciseSetRow[],
): Map<string, ExerciseSetRow[]> {
  const map = new Map<string, ExerciseSetRow[]>();
  for (const set of sets) {
    const group = map.get(set.exercise_id) ?? [];
    group.push(set);
    map.set(set.exercise_id, group);
  }
  return map;
}

/**
 * Compute PR values from a list of sets for a single exercise.
 */
function computePR(sets: ExerciseSetRow[]): {
  oneRepMax: number | null;
  estimatedOneRepMax: number | null;
  bestVolumeSet: number | null;
  maxWeight: number | null;
  maxReps: number | null;
  totalTonnage: number | null;
} {
  if (sets.length === 0) {
    return {
      oneRepMax: null,
      estimatedOneRepMax: null,
      bestVolumeSet: null,
      maxWeight: null,
      maxReps: null,
      totalTonnage: null,
    };
  }

  const workingSets = sets.filter((s) => s.weight_kg > 0 && s.reps > 0);

  // 1RM: highest weight with exactly 1 rep
  const oneRepSets = workingSets.filter((s) => s.reps === 1);
  const oneRepMax = oneRepSets.length > 0
    ? Math.max(...oneRepSets.map((s) => s.weight_kg))
    : null;

  // Estimated 1RM: best Epley across all sets
  let estimatedOneRepMax: number | null = null;
  for (const s of workingSets) {
    const e1rm = calculateE1RM(s.weight_kg, s.reps);
    if (e1rm > 0 && (estimatedOneRepMax === null || e1rm > estimatedOneRepMax)) {
      estimatedOneRepMax = e1rm;
    }
  }

  // Best volume set
  let bestVolumeSet: number | null = null;
  for (const s of workingSets) {
    const vol = calculateVolume(s.weight_kg, s.reps);
    if (vol > 0 && (bestVolumeSet === null || vol > bestVolumeSet)) {
      bestVolumeSet = vol;
    }
  }

  // Max weight
  const maxWeight = workingSets.length > 0
    ? Math.max(...workingSets.map((s) => s.weight_kg))
    : null;

  // Max reps
  const maxReps = workingSets.length > 0
    ? Math.max(...workingSets.map((s) => s.reps))
    : null;

  // Total tonnage
  const totalTonnage = calculateTonnage(
    workingSets.map((s) => ({ weightKg: s.weight_kg, reps: s.reps })),
  );

  return {
    oneRepMax,
    estimatedOneRepMax,
    bestVolumeSet: bestVolumeSet !== null ? bestVolumeSet : null,
    maxWeight,
    maxReps,
    totalTonnage: totalTonnage > 0 ? totalTonnage : null,
  };
}

/**
 * Fetch exercise names for a set of exercise IDs.
 */
async function fetchExerciseNames(
  exerciseIds: string[],
): Promise<Map<string, string>> {
  if (exerciseIds.length === 0) return new Map();

  const filter = exerciseIds.map((id) => `id = '${id}'`).join(" || ");
  const records = await pb.collection("exercises").getFullList({
    filter,
    fields: "id,name",
  });

  const nameMap = new Map<string, string>();
  for (const ex of records ?? []) {
    const record = ex as unknown as { id: string; name: string };
    nameMap.set(record.id, record.name);
  }
  return nameMap;
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * List all PRs computed on-the-fly from exercise_sets.
 * Returns one entry per exercise with best values across all completed sessions.
 */
export async function listPRs(
  userId: string,
  exerciseIds?: string[],
): Promise<ComputedPR[]> {
  try {
    const sets = await getWorkingSetsForUser(userId, exerciseIds);
    if (sets.length === 0) return [];

    const grouped = groupSetsByExercise(sets);

    // Fetch exercise names
    const nameMap = await fetchExerciseNames([...grouped.keys()]);

    const results: ComputedPR[] = [];
    for (const [exerciseId, exerciseSets] of grouped) {
      const pr = computePR(exerciseSets);
      results.push({
        exerciseId,
        exerciseName: nameMap.get(exerciseId) ?? "Unknown Exercise",
        ...pr,
      });
    }

    return results;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch PRs");
  }
}

/**
 * Get PR data for a single exercise.
 */
export async function getExercisePRs(
  userId: string,
  exerciseId: string,
): Promise<ComputedPR | null> {
  try {
    const results = await listPRs(userId, [exerciseId]);
    return results.length > 0 ? results[0] : null;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch exercise PRs");
  }
}

/**
 * Get the evolution of a specific PR type over time.
 * Returns one entry per session with the best value for that type.
 */
export async function getPRHistory(
  exerciseId: string,
  type: PRType,
): Promise<PRHistoryEntry[]> {
  try {
    const records = await pb.collection("exercise_sets").getFullList({
      filter: `exercise_id = '${exerciseId}' && is_warmup = false`,
      sort: "logged_at",
    });

    const sets = (records ?? []) as unknown as ExerciseSetRow[];

    // Group by session
    const sessionGroups = new Map<string, ExerciseSetRow[]>();
    for (const set of sets) {
      const group = sessionGroups.get(set.workout_session_id) ?? [];
      group.push(set);
      sessionGroups.set(set.workout_session_id, group);
    }

    const history: PRHistoryEntry[] = [];
    for (const [sessionId, sessionSets] of sessionGroups) {
      const workingSets = sessionSets.filter((s) => s.weight_kg > 0 && s.reps > 0);
      if (workingSets.length === 0) continue;

      let bestValue: number | null = null;
      let bestWeightKg: number | null = null;
      let bestReps: number | null = null;
      const date = workingSets[0].logged_at;

      for (const s of workingSets) {
        let value: number | null = null;

        switch (type) {
          case "one_rep_max":
            if (s.reps === 1) value = s.weight_kg;
            break;
          case "estimated_one_rep_max":
            value = calculateE1RM(s.weight_kg, s.reps);
            break;
          case "best_volume_set":
            value = calculateVolume(s.weight_kg, s.reps);
            break;
          case "best_reps_at_weight":
            // Highest reps at a given weight — use reps as the value
            value = s.reps;
            break;
        }

        if (value !== null && (bestValue === null || value > bestValue)) {
          bestValue = value;
          bestWeightKg = s.weight_kg;
          bestReps = s.reps;
        }
      }

      if (bestValue !== null) {
        history.push({
          date,
          value: bestValue,
          weightKg: bestWeightKg,
          reps: bestReps,
          sessionId,
        });
      }
    }

    // Sort by date
    history.sort((a, b) => a.date.localeCompare(b.date));

    return history;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch PR history");
  }
}

/**
 * Check if a given weight × reps would be a new PR.
 */
export async function checkIsPR(
  exerciseId: string,
  weightKg: number,
  reps: number,
): Promise<CheckPRResult> {
  try {
    const records = await pb.collection("exercise_sets").getFullList({
      filter: `exercise_id = '${exerciseId}' && is_warmup = false`,
    });

    const allSets = (records ?? []) as unknown as ExerciseSetRow[];
    const current = computePR(allSets);

    const proposedE1RM = calculateE1RM(weightKg, reps);
    const proposedVolume = calculateVolume(weightKg, reps);

  // Check each PR type
  if (reps === 1 && (current.oneRepMax === null || weightKg > current.oneRepMax)) {
    return { isPR: true, currentBest: current.oneRepMax, proposedValue: weightKg, prType: "one_rep_max" };
  }

  if (reps === 1 && current.oneRepMax !== null) {
    // Single rep, not a 1RM PR — return 1RM as the reference
    return { isPR: false, currentBest: current.oneRepMax, proposedValue: weightKg, prType: null };
  }

  if (current.estimatedOneRepMax === null || proposedE1RM > current.estimatedOneRepMax) {
    return { isPR: true, currentBest: current.estimatedOneRepMax, proposedValue: proposedE1RM, prType: "estimated_one_rep_max" };
  }

  if (current.bestVolumeSet === null || proposedVolume > current.bestVolumeSet) {
    return { isPR: true, currentBest: current.bestVolumeSet, proposedValue: proposedVolume, prType: "best_volume_set" };
  }

  return { isPR: false, currentBest: current.estimatedOneRepMax, proposedValue: proposedE1RM, prType: null };
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to check PR");
  }
}
