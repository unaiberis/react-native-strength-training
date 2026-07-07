import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";

// ─── Constants ─────────────────────────────────────────────────────────────

const PROGRESSION_QUERY_KEY = "progression";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ProgressionDataPoint {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Session ID for drill-down */
  sessionId: string;
  /** Max weight lifted in this session (kg) */
  maxWeight: number;
  /** Best e1RM in this session (kg) */
  bestE1RM: number;
  /** Total volume in this session (kg × reps) */
  totalVolume: number;
  /** Number of sets logged */
  setCount: number;
}

export interface ProgressionResult {
  /** Time series data points, sorted chronologically */
  dataPoints: ProgressionDataPoint[];
  /** Best weight ever recorded */
  bestWeight: number;
  /** Best e1RM ever recorded */
  bestE1RM: number;
  /** Total number of sessions logged for this exercise */
  sessionCount: number;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Refetch function */
  refetch: () => void;
}

// ─── Local SQLite Query ────────────────────────────────────────────────────

/**
 * Fetch exercise set data grouped by session for progression tracking.
 */
async function fetchProgressionFromLocal(
  exerciseId: string,
): Promise<ProgressionDataPoint[]> {
  const { getDb } = await import("@/lib/db/database");
  const db = await getDb();

  // Get all completed sessions with sets for this exercise
  const rows = await db.getAllAsync<{
    session_id: string;
    completed_at: string;
    weight_kg: number;
    reps: number;
  }>(
    `SELECT es.session_id, ws.completed_at, es.weight_kg, es.reps
     FROM exercise_sets es
     INNER JOIN workout_sessions ws ON ws.id = es.session_id
     WHERE es.exercise_id = ? AND ws.status = 'completed' AND es.is_warmup = 0
     ORDER BY ws.completed_at ASC`,
    [exerciseId],
  );

  if (rows.length === 0) return [];

  // Group by session, take max weight per session
  const sessionMap = new Map<
    string,
    {
      sessionId: string;
      date: string;
      weights: number[];
      e1RMS: number[];
      totalVolume: number;
      setCount: number;
    }
  >();

  for (const row of rows) {
    const datePart = row.completed_at.substring(0, 10);
    const e1rm = Math.round(row.weight_kg * (1 + row.reps / 30) * 10) / 10;
    const volume = row.weight_kg * row.reps;

    const existing = sessionMap.get(row.session_id);
    if (existing) {
      existing.weights.push(row.weight_kg);
      existing.e1RMS.push(e1rm);
      existing.totalVolume += volume;
      existing.setCount += 1;
    } else {
      sessionMap.set(row.session_id, {
        sessionId: row.session_id,
        date: datePart,
        weights: [row.weight_kg],
        e1RMS: [e1rm],
        totalVolume: volume,
        setCount: 1,
      });
    }
  }

  return Array.from(sessionMap.values())
    .map((session) => ({
      date: session.date,
      sessionId: session.sessionId,
      maxWeight: Math.max(...session.weights),
      bestE1RM: Math.max(...session.e1RMS),
      totalVolume: session.totalVolume,
      setCount: session.setCount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Pure Calculation Functions ────────────────────────────────────────────

/**
 * Compute derived statistics from progression data points.
 */
export function computeProgressionStats(
  dataPoints: ProgressionDataPoint[],
): Pick<ProgressionResult, "bestWeight" | "bestE1RM" | "sessionCount"> {
  return {
    bestWeight: dataPoints.length > 0
      ? Math.max(...dataPoints.map((d) => d.maxWeight))
      : 0,
    bestE1RM: dataPoints.length > 0
      ? Math.max(...dataPoints.map((d) => d.bestE1RM))
      : 0,
    sessionCount: dataPoints.length,
  };
}

/**
 * Compute simple moving average for the progression data.
 * Returns points with the same dates but SMA values (null for early points).
 */
export function computeProgressionSMA(
  dataPoints: ProgressionDataPoint[],
  window: number = 3,
): (ProgressionDataPoint & { sma: number | null })[] {
  const weights = dataPoints.map((d) => d.maxWeight);

  return dataPoints.map((point, i) => {
    if (i < window - 1) {
      return { ...point, sma: null };
    }
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      sum += weights[j];
    }
    return { ...point, sma: sum / window };
  });
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Hook for exercise progression data.
 *
 * Reads exercise sets from local SQLite, groups by session, and
 * returns time series data with max weight per session for line charts.
 * Uses TanStack Query for caching.
 */
export function useProgression(exerciseId: string | undefined): ProgressionResult {
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery({
    queryKey: [PROGRESSION_QUERY_KEY, exerciseId, userId],
    queryFn: () => {
      if (!exerciseId) return [];
      return fetchProgressionFromLocal(exerciseId);
    },
    enabled: !!userId && !!exerciseId,
    staleTime: 1000 * 60 * 2,
  });

  const dataPoints = query.data ?? [];

  const { bestWeight, bestE1RM, sessionCount } = useMemo(
    () => computeProgressionStats(dataPoints),
    [dataPoints],
  );

  return {
    dataPoints,
    bestWeight,
    bestE1RM,
    sessionCount,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => query.refetch(),
  };
}
