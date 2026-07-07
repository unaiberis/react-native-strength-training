/**
 * Analytics Calculation Utilities
 *
 * Pure functions for aggregating workout data into chart-ready data structures.
 * All functions are deterministic — same input always produces same output.
 */

// ─── Types ────────────────────────────────────────────────────────────────

export interface VolumeByPeriod {
  /** ISO period identifier: "2026-W27" for weekly, "2026-07" for monthly */
  period: string;
  /** Total volume (weight × reps) for this period */
  volume: number;
  /** Number of sessions in this period */
  sessionCount: number;
}

export interface PRTimeline {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** Estimated 1RM for this entry */
  estimatedOneRm: number;
  /** Actual weight lifted */
  weight: number;
  /** Reps performed */
  reps: number;
}

export interface ConsistencyData {
  /** ISO date of the week start (Monday, YYYY-MM-DD) */
  weekStart: string;
  /** Number of sessions completed this week */
  sessionsCompleted: number;
  /** Target number of sessions per week (default 3) */
  targetSessions: number;
  /** Ratio of sessions completed to target (capped at 1.0) */
  ratio: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

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
 * Get the Monday of the week containing the given date.
 */
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  const day = date.getUTCDay() || 7; // Mon=1 ... Sun=7
  date.setUTCDate(date.getUTCDate() - day + 1);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Volume by Period ─────────────────────────────────────────────────────

/**
 * Aggregate total volume (weight × reps) by week or month.
 *
 * Accepts sessions with nested sets. Periods are sorted chronologically.
 */
export function calcVolumeByPeriod(
  sessions: Array<{
    id: string;
    completed_at: string;
    sets: Array<{ weight: number; reps: number }>;
  }>,
  periodType: "weekly" | "monthly",
): VolumeByPeriod[] {
  const buckets = new Map<string, { volume: number; count: number }>();

  for (const session of sessions) {
    const datePart = session.completed_at.substring(0, 10);
    const period =
      periodType === "weekly" ? getISOWeek(datePart) : datePart.substring(0, 7);

    const volume = session.sets.reduce(
      (sum, s) => sum + s.weight * s.reps,
      0,
    );

    const existing = buckets.get(period) ?? { volume: 0, count: 0 };
    buckets.set(period, {
      volume: existing.volume + volume,
      count: existing.count + 1,
    });
  }

  return Array.from(buckets.entries())
    .map(([period, data]) => ({
      period,
      volume: data.volume,
      sessionCount: data.count,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

// ─── PR Timeline ─────────────────────────────────────────────────────────

/**
 * Build a chronological timeline of estimated 1RM values from logged sets.
 *
 * Each set produces one entry with its date, e1RM, weight, and reps.
 * Entries are sorted chronologically.
 */
export function buildPRTimeline(
  sets: Array<{ weight: number; reps: number; created_at: string }>,
): PRTimeline[] {
  if (sets.length === 0) return [];

  return sets
    .filter((s) => s.reps > 0 && s.weight > 0)
    .map((s) => ({
      date: s.created_at.substring(0, 10),
      estimatedOneRm: Math.round(s.weight * (1 + s.reps / 30) * 10) / 10,
      weight: s.weight,
      reps: s.reps,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Consistency ──────────────────────────────────────────────────────────

/**
 * Calculate consistency ratio (sessions completed / target sessions)
 * for each of the last N weeks.
 *
 * @param sessions - Completed sessions with their completion dates
 * @param weeks    - Number of past weeks to include
 */
export function calcConsistency(
  sessions: Array<{ completed_at: string }>,
  weeks: number,
): ConsistencyData[] {
  const now = new Date();
  const weekBuckets = new Map<string, number>();

  // Initialise all week buckets with 0
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const ws = getWeekStart(d.toISOString().substring(0, 10));
    weekBuckets.set(ws, 0);
  }

  // Count sessions per week
  for (const session of sessions) {
    const ws = getWeekStart(session.completed_at.substring(0, 10));
    if (weekBuckets.has(ws)) {
      weekBuckets.set(ws, (weekBuckets.get(ws) ?? 0) + 1);
    }
  }

  const target = 3;

  return Array.from(weekBuckets.entries())
    .map(([weekStart, count]) => ({
      weekStart,
      sessionsCompleted: count,
      targetSessions: target,
      ratio: Math.min(1, count / target),
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}
