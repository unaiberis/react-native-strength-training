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
  oneRepMax: number | null;
  estimatedOneRepMax: number | null;
  bestVolumeSet: number | null;
  maxWeight: number | null;
  maxReps: number | null;
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

// ─── Helpers ────────────────────────────────────────────────────────────

/** Null-safe max: returns null when all values are 0 or empty. */
function maxOr(
  values: number[],
  fallback: number | null = null,
): number | null {
  if (values.length === 0) return fallback;
  const m = Math.max(...values);
  return m > 0 ? m : fallback;
}

// ─── Data fetching ──────────────────────────────────────────────────────

/**
 * Get the set of session IDs owned by a user.
 */
async function getUserSessionIds(userId: string): Promise<Set<string>> {
  const sessions = await pb.collection("workout_sessions").getFullList({
    filter: `user_id = '${userId}'`,
    fields: "id",
  });
  return new Set((sessions ?? []).map((s: any) => s.id));
}

/**
 * Get working (non-warmup) sets for a user, optionally filtered by exercise IDs.
 *
 * Strategy:
 * - Single exercise → direct PocketBase filter (small URL, fast).
 * - All exercises → fetch all non-warmup sets, filter by user's sessions in code.
 *   Building a filter with 300+ OR clauses exceeds PocketBase's URL limit.
 */
async function getWorkingSetsForUser(
  userId: string,
  exerciseIds?: string[],
): Promise<ExerciseSetRow[]> {
  const userSessionIds = await getUserSessionIds(userId);
  if (userSessionIds.size === 0) return [];

  // Single exercise: use direct filter (avoids fetching all sets)
  if (exerciseIds?.length === 1) {
    const records = await pb.collection("exercise_sets").getFullList({
      filter: `exercise_id = '${exerciseIds[0]}' && is_warmup = false`,
      sort: "logged_at",
    });
    return (records ?? []).filter((s: any) =>
      userSessionIds.has(s.workout_session_id),
    ) as unknown as ExerciseSetRow[];
  }

  // Multiple or no exercises: fetch all, filter in code
  let filter = "is_warmup = false";
  if (exerciseIds && exerciseIds.length > 1) {
    const exFilter = exerciseIds
      .map((eid) => `exercise_id = '${eid}'`)
      .join(" || ");
    filter = `${filter} && (${exFilter})`;
  }

  const records = await pb.collection("exercise_sets").getFullList({
    filter,
    sort: "logged_at",
  });

  return (records ?? []).filter((s: any) =>
    userSessionIds.has(s.workout_session_id),
  ) as unknown as ExerciseSetRow[];
}

/**
 * Fetch exercise names for a set of IDs.
 * Only 80 exercises exist — fetch all, filter in code.
 */
async function fetchExerciseNames(
  exerciseIds: string[],
): Promise<Map<string, string>> {
  if (exerciseIds.length === 0) return new Map();

  const needed = new Set(exerciseIds);
  const records = await pb.collection("exercises").getFullList({
    fields: "id,name",
  });

  const map = new Map<string, string>();
  for (const ex of records ?? []) {
    const r = ex as unknown as { id: string; name: string };
    if (needed.has(r.id)) map.set(r.id, r.name);
  }
  return map;
}

// ─── Computation ────────────────────────────────────────────────────────

/**
 * Compute PR values from a list of sets for a single exercise.
 * Filters to working sets (weight > 0, reps > 0) internally.
 */
function computePR(sets: ExerciseSetRow[]): Omit<
  ComputedPR,
  "exerciseId" | "exerciseName"
> {
  const working = sets.filter((s) => s.weight_kg > 0 && s.reps > 0);
  if (working.length === 0) {
    return {
      oneRepMax: null,
      estimatedOneRepMax: null,
      bestVolumeSet: null,
      maxWeight: null,
      maxReps: null,
      totalTonnage: null,
    };
  }

  const oneRepMax = maxOr(
    working.filter((s) => s.reps === 1).map((s) => s.weight_kg),
  );
  const estimatedOneRepMax = maxOr(
    working.map((s) => calculateE1RM(s.weight_kg, s.reps)),
  );
  const bestVolumeSet = maxOr(
    working.map((s) => calculateVolume(s.weight_kg, s.reps)),
  );
  const maxWeight = Math.max(...working.map((s) => s.weight_kg));
  const maxReps = Math.max(...working.map((s) => s.reps));
  const totalTonnage = calculateTonnage(
    working.map((s) => ({ weightKg: s.weight_kg, reps: s.reps })),
  );

  return {
    oneRepMax,
    estimatedOneRepMax,
    bestVolumeSet,
    maxWeight,
    maxReps,
    totalTonnage: totalTonnage > 0 ? totalTonnage : null,
  };
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
  const sets = await getWorkingSetsForUser(userId, exerciseIds);
  if (sets.length === 0) return [];

  // Group by exercise
  const groups = new Map<string, ExerciseSetRow[]>();
  for (const set of sets) {
    const g = groups.get(set.exercise_id) ?? [];
    g.push(set);
    groups.set(set.exercise_id, g);
  }

  const nameMap = await fetchExerciseNames([...groups.keys()]);

  return [...groups.entries()].map(([exerciseId, exerciseSets]) => ({
    exerciseId,
    exerciseName: nameMap.get(exerciseId) ?? "Unknown Exercise",
    ...computePR(exerciseSets),
  }));
}

/**
 * Get PR data for a single exercise.
 */
export async function getExercisePRs(
  userId: string,
  exerciseId: string,
): Promise<ComputedPR | null> {
  const results = await listPRs(userId, [exerciseId]);
  return results.length > 0 ? results[0] : null;
}

/**
 * Get the evolution of a specific PR type over time.
 * Returns one entry per session with the best value for that type.
 */
export async function getPRHistory(
  exerciseId: string,
  type: PRType,
): Promise<PRHistoryEntry[]> {
  const records = await pb.collection("exercise_sets").getFullList({
    filter: `exercise_id = '${exerciseId}' && is_warmup = false`,
    sort: "logged_at",
  });

  const sets = (records ?? []) as unknown as ExerciseSetRow[];

  // Group by session
  const sessionGroups = new Map<string, ExerciseSetRow[]>();
  for (const set of sets) {
    const g = sessionGroups.get(set.workout_session_id) ?? [];
    g.push(set);
    sessionGroups.set(set.workout_session_id, g);
  }

  const history: PRHistoryEntry[] = [];

  for (const [sessionId, sessionSets] of sessionGroups) {
    const working = sessionSets.filter((s) => s.weight_kg > 0 && s.reps > 0);
    if (working.length === 0) continue;

    let bestValue: number | null = null;
    let bestWeightKg: number | null = null;
    let bestReps: number | null = null;
    const date = working[0].logged_at;

    for (const s of working) {
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

  history.sort((a, b) => a.date.localeCompare(b.date));
  return history;
}

/**
 * Check if a given weight × reps would be a new PR.
 */
export async function checkIsPR(
  exerciseId: string,
  weightKg: number,
  reps: number,
): Promise<CheckPRResult> {
  const records = await pb.collection("exercise_sets").getFullList({
    filter: `exercise_id = '${exerciseId}' && is_warmup = false`,
  });

  const allSets = (records ?? []) as unknown as ExerciseSetRow[];
  const current = computePR(allSets);

  const proposedE1RM = calculateE1RM(weightKg, reps);
  const proposedVolume = calculateVolume(weightKg, reps);

  // 1RM check (single rep)
  if (reps === 1) {
    if (current.oneRepMax === null || weightKg > current.oneRepMax) {
      return {
        isPR: true,
        currentBest: current.oneRepMax,
        proposedValue: weightKg,
        prType: "one_rep_max",
      };
    }
    return {
      isPR: false,
      currentBest: current.oneRepMax,
      proposedValue: weightKg,
      prType: null,
    };
  }

  // Estimated 1RM check
  if (
    current.estimatedOneRepMax === null ||
    proposedE1RM > current.estimatedOneRepMax
  ) {
    return {
      isPR: true,
      currentBest: current.estimatedOneRepMax,
      proposedValue: proposedE1RM,
      prType: "estimated_one_rep_max",
    };
  }

  // Volume check
  if (current.bestVolumeSet === null || proposedVolume > current.bestVolumeSet) {
    return {
      isPR: true,
      currentBest: current.bestVolumeSet,
      proposedValue: proposedVolume,
      prType: "best_volume_set",
    };
  }

  return {
    isPR: false,
    currentBest: current.estimatedOneRepMax,
    proposedValue: proposedE1RM,
    prType: null,
  };
}
