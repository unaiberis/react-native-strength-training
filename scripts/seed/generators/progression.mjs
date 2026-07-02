/**
 * Strength Progression Engine
 *
 * Models realistic strength progression using logistic S-curves.
 * Supports:
 * - Multiple profiles (beginner/intermediate/advanced)
 * - Optional training plateaus (stalled progress for N weeks)
 * - Working set calculator (intensity × 1RM)
 * - Accessory weight progression (logistic, not linear)
 * - Weight rounding to 2.5kg plates
 * - RPE-based intensity prescription
 * - Small random variation for realism
 */

import { createPRNG } from '../helpers/prng.mjs';

// ─── Rounding ──────────────────────────────────────────────────────────

/**
 * Round weight to nearest plate increment (2.5kg default).
 */
export function roundWeight(kg, increment = 2.5) {
  return Math.round(kg / increment) * increment;
}

// ─── Logistic Progression ──────────────────────────────────────────────

/**
 * Logistic S-curve progression.
 *
 * @param {number} start - Starting 1RM
 * @param {number} end - Ceiling 1RM
 * @param {number} week - Current week (0-based)
 * @param {number} midpoint - Week at which gains are half-max
 * @param {number} steepness - How fast gains happen (default 0.10)
 * @param {object|null} plateau - { startWeek, endWeek } to freeze progression
 * @returns {number} Current estimated 1RM
 */
export function logisticProgression(
  start,
  end,
  week,
  midpoint,
  steepness = 0.1,
  plateau = null
) {
  if (week <= 0) return start;

  // Handle plateau: freeze value at plateauStart, skip plateau duration
  let adjustedWeek = week;
  if (plateau) {
    if (week >= plateau.startWeek && week <= plateau.endWeek) {
      // During plateau: return value at plateau start
      const p = 1 / (1 + Math.exp(-steepness * (plateau.startWeek - midpoint)));
      return start + (end - start) * p;
    }
    if (week > plateau.endWeek) {
      // After plateau: shift weeks back by plateau duration
      adjustedWeek = week - (plateau.endWeek - plateau.startWeek);
    }
  }

  const progress = 1 / (1 + Math.exp(-steepness * (adjustedWeek - midpoint)));
  return start + (end - start) * progress;
}

// ─── 1RM Profiles ──────────────────────────────────────────────────────

/**
 * Default advanced profiles (same as original).
 * Each profile: { start: week0_1RM, end: genetic_ceiling, midpoint: half_gain_week }
 */
const LIFT_PROFILES = {
  'Barbell Back Squat': { start: 100, end: 180, midpoint: 30 },
  'Barbell Front Squat': { start: 80, end: 140, midpoint: 28 },
  'Barbell Bench Press': { start: 75, end: 130, midpoint: 26 },
  Deadlift: { start: 120, end: 210, midpoint: 28 },
  'Overhead Press': { start: 45, end: 80, midpoint: 24 },
  'Barbell Row': { start: 65, end: 110, midpoint: 26 },
  'Romanian Deadlift': { start: 80, end: 140, midpoint: 24 },
  'Dumbbell Bench Press': { start: 28, end: 50, midpoint: 22 },
  'Incline Dumbbell Press': { start: 26, end: 46, midpoint: 22 },
  'Seated Dumbbell Shoulder Press': { start: 22, end: 38, midpoint: 20 },
  'Close-Grip Bench Press': { start: 60, end: 100, midpoint: 24 },
  'Leg Press': { start: 180, end: 320, midpoint: 30 },
  'Hip Thrust': { start: 80, end: 150, midpoint: 26 },
  'Dumbbell Row': { start: 32, end: 55, midpoint: 24 },
  'T-Bar Row': { start: 60, end: 100, midpoint: 24 },
  'Push Press': { start: 50, end: 85, midpoint: 22 },
};

const DEFAULT_PROFILE = { start: 30, end: 60, midpoint: 20 };

/**
 * Get the 1RM progression profile for an exercise name.
 * Accepts optional overrides for per-profile customization.
 */
export function getProfile(exerciseName, overrides = null) {
  const base = LIFT_PROFILES[exerciseName] || DEFAULT_PROFILE;
  if (!overrides || !overrides[exerciseName]) return base;
  return { ...base, ...overrides[exerciseName] };
}

/**
 * Get estimated 1RM at a given week for a specific exercise.
 */
export function getEstimated1RM(
  exerciseName,
  week,
  overrides = null,
  plateau = null
) {
  const profile = getProfile(exerciseName, overrides);
  return logisticProgression(
    profile.start,
    profile.end,
    week,
    profile.midpoint,
    0.1,
    plateau
  );
}

// ─── Working Set Calculator ────────────────────────────────────────────

/**
 * Calculate working set parameters based on week type and set index.
 */
export function getWorkingSet(
  exerciseName,
  week,
  weekType,
  setIndex,
  totalSets,
  prng,
  overrides = null,
  plateau = null
) {
  const oneRM = getEstimated1RM(exerciseName, week, overrides, plateau);
  let intensity, reps, rpe;
  let isWarmup = false;

  const isCompound = !!(
    LIFT_PROFILES[exerciseName] ||
    (overrides && overrides[exerciseName])
  );
  const warmupSets = isCompound
    ? Math.min(2, Math.max(1, Math.floor(totalSets / 3)))
    : 0;

  if (setIndex < warmupSets && weekType !== 'deload') {
    const warmupIntensity = 0.4 + (setIndex / warmupSets) * 0.25;
    isWarmup = true;
    return {
      weight: roundWeight(oneRM * warmupIntensity),
      reps: Math.max(5, 8 - setIndex * 2),
      rpe: Math.round((5 + setIndex * 0.5) * 2) / 2,
      isWarmup: true,
    };
  }

  const workingIndex = setIndex - warmupSets;
  const workingTotal = totalSets - warmupSets;

  switch (weekType) {
    case 'deload':
      intensity = 0.48 + (workingIndex / Math.max(1, workingTotal)) * 0.12;
      reps = 8;
      rpe = Math.min(7, 4 + workingIndex * 0.5);
      break;
    case 'pr_test':
      if (workingIndex === 0) intensity = 0.5;
      else if (workingIndex === 1) intensity = 0.65;
      else if (workingIndex === 2) intensity = 0.75;
      else intensity = 0.8 + (workingIndex - 2) * 0.06;
      reps = Math.max(1, 5 - workingIndex);
      rpe = Math.min(10, 6 + workingIndex);
      break;
    case 'hypertrophy':
      intensity = 0.65 + (workingIndex / Math.max(1, workingTotal)) * 0.2;
      reps = Math.max(8, 15 - workingIndex * 1.5);
      rpe = Math.min(10, 6 + workingIndex * 0.8);
      break;
    default: // normal
      intensity = 0.65 + (workingIndex / Math.max(1, workingTotal)) * 0.22;
      reps = Math.max(3, 10 - workingIndex * 1.2);
      rpe = Math.min(10, 6 + workingIndex);
      break;
  }

  intensity = Math.min(intensity, 0.95);
  let weight = roundWeight(oneRM * intensity);

  if (prng && prng.random() < 0.3) {
    const variation = prng.random() > 0.5 ? 2.5 : -2.5;
    weight = roundWeight(weight + variation);
  }

  reps = Math.max(1, Math.round(reps + (prng ? prng.gaussian() * 0.3 : 0)));
  rpe = Math.max(
    1,
    Math.min(10, Math.round((rpe + (prng ? prng.gaussian() * 0.2 : 0)) * 2) / 2)
  );

  return { weight, reps, rpe, isWarmup };
}

// ─── Accessory Weight Calculator (Logistic) ────────────────────────────

/**
 * Calculate accessory exercise weight with logistic progression.
 * More visual progression than the old linear model.
 *
 * @param {number} baseWeight - Starting weight for this accessory
 * @param {number} week - Current week (0-based)
 * @param {number} totalWeeks - Total program weeks (determines end cap)
 * @param {number} endWeight - Target weight at program end (default: baseWeight × 1.4)
 * @param {object} prng - PRNG instance
 * @returns {number} Rounded working weight
 */
export function accessoryWeight(
  baseWeight,
  week,
  totalWeeks = 78,
  endWeight = null,
  prng = null
) {
  if (totalWeeks <= 0) return baseWeight;
  const end = endWeight || roundWeight(baseWeight * 1.4, 1.25);
  if (end <= baseWeight) return baseWeight;

  // Shallow logistic: fast early, smooth plateau
  const midpoint = totalWeeks * 0.35; // gains are half-max at ~35% through program
  const steepness = 0.12;
  const progress = 1 / (1 + Math.exp(-steepness * (week - midpoint)));
  let weight = roundWeight(baseWeight + (end - baseWeight) * progress, 1.25);

  if (prng && prng.random() < 0.25) {
    weight = roundWeight(weight + (prng.random() > 0.5 ? 1.25 : -1.25), 1.25);
  }
  return Math.max(0, weight);
}

// ─── Bodyweight / Cardio Exercises ─────────────────────────────────────

/**
 * For bodyweight exercises, return a "weight" of 1 (marker) and actual reps.
 */
export function bodyweightSet(weekType, setIndex, totalSets, prng) {
  let rpe;
  if (weekType === 'deload') {
    rpe = 4 + (setIndex / Math.max(1, totalSets)) * 2;
  } else {
    rpe = 6 + (setIndex / Math.max(1, totalSets)) * 3;
  }
  rpe = Math.max(
    1,
    Math.min(10, Math.round((rpe + (prng ? prng.gaussian() * 0.2 : 0)) * 2) / 2)
  );
  return { weight: 1, reps: 1, rpe };
}
