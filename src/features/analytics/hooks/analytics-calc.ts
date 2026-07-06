/**
 * Analytics Calculation Utilities
 *
 * Pure functions for aggregating workout data into chart-ready data structures.
 * All functions are deterministic — same input always produces same output.
 */

import { calculateE1RM, calculateVolume } from "@/shared/utils/pr-calc";

// ─── Types ────────────────────────────────────────────────────────────────

export interface VolumeDataPoint {
  /** ISO period identifier: "2026-W27" for weekly or "2026-07" for monthly */
  period: string;
  /** Total volume (weight × reps) for this period */
  volume: number;
}

export interface ConsistencyDataPoint {
  /** ISO period identifier: "2026-W27" for weekly or "2026-07" for monthly */
  period: string;
  /** Number of completed workouts in this period */
  count: number;
}

export interface ExerciseProgressPoint {
  /** Date of the session (YYYY-MM-DD) */
  date: string;
  /** Session ID this data belongs to */
  session_id: string;
  /** Best e1RM achieved during this session */
  bestE1RM: number;
  /** Highest weight lifted during this session */
  maxWeight: number;
  /** Total volume (weight × reps) for this exercise in this session */
  totalVolume: number;
  /** Number of sets logged for this exercise in this session */
  totalSets: number;
  /** Average weight across all sets for this session */
  avgWeight: number;
}

export interface PersonalRecordPoint {
  /** Date of the session (YYYY-MM-DD) */
  date: string;
  /** Best e1RM value achieved on this date */
  e1rm: number;
  /** Best 1RM value achieved on this date (null if no single-rep set) */
  oneRm: number | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Raw set as it comes from the DB query */
export interface AnalyticsSetRow {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  is_warmup: number; // 0 or 1
  /** ISO date string (YYYY-MM-DD) for the session */
  date: string;
}

/** Raw session as it comes from the DB query */
export interface AnalyticsSessionRow {
  id: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  status: string;
}

/**
 * Get the ISO week string for a date.
 * Returns "2026-W27" format.
 */
function getISOWeek(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  const dayNum = date.getUTCDay() || 7; // Mon=1 ... Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Get the ISO month string for a date.
 * Returns "2026-07" format.
 */
function getISOMonth(dateStr: string): string {
  return dateStr.substring(0, 7);
}

// ─── Volume by Period ─────────────────────────────────────────────────────

/**
 * Aggregate total volume (weight × reps) by week or month.
 *
 * Only working sets (non-warmup, non-zero weight AND reps) are counted.
 * Periods are sorted chronologically.
 */
export function computeVolumeByPeriod(
  sets: AnalyticsSetRow[],
  period: "weekly" | "monthly",
): VolumeDataPoint[] {
  const periodFn = period === "weekly" ? getISOWeek : getISOMonth;
  const buckets = new Map<string, number>();

  for (const set of sets) {
    if (set.is_warmup || set.weight_kg <= 0 || set.reps <= 0) continue;
    const key = periodFn(set.date);
    const vol = calculateVolume(set.weight_kg, set.reps);
    buckets.set(key, (buckets.get(key) ?? 0) + vol);
  }

  return Array.from(buckets.entries())
    .map(([period, volume]) => ({ period, volume }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

// ─── Consistency Data ─────────────────────────────────────────────────────

/**
 * Count completed workout sessions per week or month.
 *
 * Only sessions with status "completed" are counted.
 */
export function computeConsistencyData(
  sessions: AnalyticsSessionRow[],
  period: "weekly" | "monthly",
): ConsistencyDataPoint[] {
  const periodFn = period === "weekly" ? getISOWeek : getISOMonth;
  const buckets = new Map<string, number>();

  for (const session of sessions) {
    if (session.status !== "completed") continue;
    const key = periodFn(session.started_at.substring(0, 10));
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

// ─── Exercise Progress ────────────────────────────────────────────────────

/**
 * Compute per-exercise progress over time.
 *
 * For each unique session date, returns the best e1RM, max weight,
 * total volume, and set count for the given exercise.
 */
export function computeExerciseProgress(
  exerciseId: string,
  sets: AnalyticsSetRow[],
): ExerciseProgressPoint[] {
  // Filter to target exercise, working sets only
  const exerciseSets = sets.filter(
    (s) => s.exercise_id === exerciseId && !s.is_warmup && s.weight_kg > 0 && s.reps > 0,
  );
  if (exerciseSets.length === 0) return [];

  // Group by session_id
  const sessions = new Map<string, AnalyticsSetRow[]>();
  for (const set of exerciseSets) {
    const group = sessions.get(set.session_id) ?? [];
    group.push(set);
    sessions.set(set.session_id, group);
  }

  // Compute per-session summary
  const points: ExerciseProgressPoint[] = [];
  for (const [sessionId, sessionSets] of sessions) {
    const date = sessionSets[0].date;
    let bestE1RM = 0;
    let maxWeight = 0;
    let totalVolume = 0;

    for (const set of sessionSets) {
      const e1rm = calculateE1RM(set.weight_kg, set.reps);
      if (e1rm > bestE1RM) bestE1RM = e1rm;
      if (set.weight_kg > maxWeight) maxWeight = set.weight_kg;
      totalVolume += calculateVolume(set.weight_kg, set.reps);
    }

    points.push({
      date,
      session_id: sessionId,
      bestE1RM,
      maxWeight,
      totalVolume,
      totalSets: sessionSets.length,
      avgWeight: totalVolume > 0
        ? totalVolume / sessionSets.reduce((sum, s) => sum + s.reps, 0)
        : 0,
    });
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Personal Record Timeline ─────────────────────────────────────────────

/**
 * Compute the e1RM progression over time for a specific exercise.
 *
 * For each unique date, returns the best e1RM achieved and the best
 * actual 1RM (weight of any single-rep sets).
 */
export function computePersonalRecordTimeline(
  exerciseId: string,
  sets: AnalyticsSetRow[],
): PersonalRecordPoint[] {
  const exerciseSets = sets.filter(
    (s) => s.exercise_id === exerciseId && !s.is_warmup && s.weight_kg > 0 && s.reps > 0,
  );
  if (exerciseSets.length === 0) return [];

  // Group by date
  const byDate = new Map<string, AnalyticsSetRow[]>();
  for (const set of exerciseSets) {
    const group = byDate.get(set.date) ?? [];
    group.push(set);
    byDate.set(set.date, group);
  }

  const points: PersonalRecordPoint[] = [];
  for (const [date, dateSets] of byDate) {
    let bestE1RM = 0;
    let oneRm: number | null = null;

    for (const set of dateSets) {
      const e1rm = calculateE1RM(set.weight_kg, set.reps);
      if (e1rm > bestE1RM) bestE1RM = e1rm;
      if (set.reps === 1 && set.weight_kg > (oneRm ?? 0)) {
        oneRm = set.weight_kg;
      }
    }

    points.push({ date, e1rm: bestE1RM, oneRm });
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}
