/**
 * PR Calculation Utilities
 *
 * Epley formula for estimated 1RM, volume calculations, and best-set detection.
 *
 * Epley formula:
 *   e1RM = weight × (1 + reps / 30)
 *
 * Volume (per set):
 *   volume = weight × reps
 *
 * Tonnage (per exercise per session):
 *   tonnage = Σ(weight × reps) over all working sets
 */

// ─── Epley e1RM ───────────────────────────────────────────────────────────

/**
 * Calculate estimated 1RM using the Epley formula.
 *
 * Returns `0` when reps is 0 (no valid estimate).
 *
 * @param weightKg - The weight lifted (kg).
 * @param reps     - Number of reps performed (>= 0).
 */
export function calculateE1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  return weightKg * (1 + reps / 30);
}

// ─── Volume / Tonnage ─────────────────────────────────────────────────────

/**
 * Calculate the volume of a single set: weight × reps.
 */
export function calculateVolume(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return weightKg * reps;
}

/**
 * Calculate total tonnage across multiple sets: Σ(weight × reps).
 */
export function calculateTonnage(
  sets: { weightKg: number; reps: number }[]
): number {
  return sets.reduce((sum, s) => sum + calculateVolume(s.weightKg, s.reps), 0);
}

// ─── Best Set Detection ───────────────────────────────────────────────────

export interface SetWithE1RM {
  weightKg: number;
  reps: number;
  e1rm: number;
  volume: number;
}

/**
 * Find the set with the highest estimated 1RM among a list of sets.
 * Returns `null` if the list is empty or no sets produce a valid e1RM.
 */
export function findBestSetByE1RM(
  sets: { weightKg: number; reps: number }[]
): SetWithE1RM | null {
  let best: SetWithE1RM | null = null;

  for (const s of sets) {
    const e1rm = calculateE1RM(s.weightKg, s.reps);
    const volume = calculateVolume(s.weightKg, s.reps);
    if (e1rm <= 0) continue;

    if (!best || e1rm > best.e1rm) {
      best = { weightKg: s.weightKg, reps: s.reps, e1rm, volume };
    }
  }

  return best;
}

/**
 * Find the set with the highest volume (weight × reps).
 * Returns `null` if the list is empty.
 */
export function findBestSetByVolume(
  sets: { weightKg: number; reps: number }[]
): SetWithE1RM | null {
  let best: SetWithE1RM | null = null;

  for (const s of sets) {
    const volume = calculateVolume(s.weightKg, s.reps);
    if (volume <= 0) continue;

    const e1rm = calculateE1RM(s.weightKg, s.reps);
    if (!best || volume > best.volume) {
      best = { weightKg: s.weightKg, reps: s.reps, e1rm, volume };
    }
  }

  return best;
}

// ─── PR Detection ─────────────────────────────────────────────────────────

export interface PRDetectionResult {
  /** A new 1RM was achieved (a set with 1 rep at higher weight than before) */
  newOneRepMax: SetWithE1RM | null;
  /** A new estimated 1RM was achieved (best e1RM across all sets) */
  newEstimatedOneRepMax: SetWithE1RM | null;
  /** A new best volume set was achieved */
  newBestVolumeSet: SetWithE1RM | null;
  /** Total tonnage for this exercise session */
  tonnage: number;
}

/**
 * Evaluate all sets for a single exercise against previous best values and
 * return which (if any) PRs were achieved.
 *
 * @param sets         - All working (non-warmup) sets logged for this exercise.
 * @param previousBest - Previous best values to compare against (null = first time).
 */
export function detectPRs(
  sets: { weightKg: number; reps: number }[],
  previousBest?: {
    oneRepMax?: number;
    estimatedOneRepMax?: number;
    bestVolumeSet?: number;
    bestTonnage?: number;
  }
): PRDetectionResult {
  const workingSets = sets.filter((s) => s.reps > 0 && s.weightKg > 0);

  // Find actual 1RM (a set with exactly 1 rep)
  const oneRepSet = workingSets.find((s) => s.reps === 1);

  const newOneRepMax: SetWithE1RM | null =
    oneRepSet &&
    calculateVolume(oneRepSet.weightKg, oneRepSet.reps) > 0 &&
    (!previousBest?.oneRepMax || oneRepSet.weightKg > previousBest.oneRepMax)
      ? {
          weightKg: oneRepSet.weightKg,
          reps: oneRepSet.reps,
          e1rm: calculateE1RM(oneRepSet.weightKg, oneRepSet.reps),
          volume: calculateVolume(oneRepSet.weightKg, oneRepSet.reps),
        }
      : null;

  // Best e1RM across all working sets
  const bestSet = findBestSetByE1RM(workingSets);
  const newEstimatedOneRepMax: SetWithE1RM | null =
    bestSet &&
    (!previousBest?.estimatedOneRepMax ||
      bestSet.e1rm > previousBest.estimatedOneRepMax)
      ? bestSet
      : null;

  // Best volume set
  const bestVolumeSet = findBestSetByVolume(workingSets);
  const newBestVolumeSet: SetWithE1RM | null =
    bestVolumeSet &&
    (!previousBest?.bestVolumeSet ||
      bestVolumeSet.volume > previousBest.bestVolumeSet)
      ? bestVolumeSet
      : null;

  // Total tonnage
  const tonnage = calculateTonnage(workingSets);

  return {
    newOneRepMax,
    newEstimatedOneRepMax,
    newBestVolumeSet,
    tonnage,
    // bestTonnage is checked separately since it's the sum, not a single set
  };
}

/**
 * Check if a tonnage value beats the previous best.
 */
export function isTonnagePR(tonnage: number, previousBest?: number): boolean {
  if (tonnage <= 0) return false;
  return !previousBest || tonnage > previousBest;
}
