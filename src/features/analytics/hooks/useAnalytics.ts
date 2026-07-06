/**
 * useAnalytics — TanStack Query hook for workout analytics.
 *
 * Queries completed workout sessions and exercise sets from local SQLite,
 * then runs pure aggregation functions for chart data.
 *
 * Analytics are always computed from local data (SQLite) for speed and
 * offline support. No PocketBase dependency.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import type {
  AnalyticsSetRow,
  AnalyticsSessionRow,
  VolumeDataPoint,
  ConsistencyDataPoint,
  ExerciseProgressPoint,
  PersonalRecordPoint,
} from "./analytics-calc";
import {
  computeVolumeByPeriod,
  computeConsistencyData,
  computeExerciseProgress,
  computePersonalRecordTimeline,
} from "./analytics-calc";

const ANALYTICS_QUERY_KEY = "analytics";

// ─── Data Fetching ────────────────────────────────────────────────────────

/**
 * Fetch all completed workout sessions and their exercise sets from SQLite.
 */
async function fetchAnalyticsData(userId: string): Promise<{
  sessions: AnalyticsSessionRow[];
  sets: AnalyticsSetRow[];
  exercises: { id: string; name: string }[];
}> {
  const { getDb } = await import("@/lib/db/database");
  const db = await getDb();

  const sessions = await db.getAllAsync<AnalyticsSessionRow>(
    `SELECT id, started_at, completed_at, duration_seconds, status
     FROM workout_sessions
     WHERE user_id = ? AND status = 'completed'
     ORDER BY started_at ASC`,
    [userId],
  );

  // Get all unique session IDs
  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length === 0) {
    return { sessions: [], sets: [], exercises: [] };
  }

  // Fetch sets for those sessions with date from the session
  const placeholders = sessionIds.map(() => "?").join(",");
  const sets = await db.getAllAsync<{
    id: string;
    session_id: string;
    exercise_id: string;
    set_number: number;
    weight_kg: number;
    reps: number;
    is_warmup: number;
    date: string;
  }>(
    `SELECT es.id, es.session_id, es.exercise_id, es.set_number,
            es.weight_kg, es.reps, es.is_warmup,
            substr(ws.started_at, 1, 10) as date
     FROM exercise_sets es
     JOIN workout_sessions ws ON ws.id = es.session_id
     WHERE es.session_id IN (${placeholders})
       AND ws.user_id = ?
     ORDER BY ws.started_at ASC`,
    [...sessionIds, userId],
  );

  // Fetch exercise names
  const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))];
  const exercises: { id: string; name: string }[] = [];

  for (const eid of exerciseIds) {
    const ex = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM exercises WHERE id = ?",
      [eid],
    );
    if (ex) {
      exercises.push({ id: eid, name: ex.name });
    }
  }

  return { sessions, sets, exercises };
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export type AnalyticsPeriod = "weekly" | "monthly";

export interface UseAnalyticsResult {
  /** Total volume by period (bars for chart) */
  volumeByPeriod: VolumeDataPoint[];
  /** Workout consistency (sessions per period) */
  consistencyData: ConsistencyDataPoint[];
  /** All distinct exercises with their IDs and names */
  exercises: { id: string; name: string }[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Get progress data for a specific exercise */
  getExerciseProgress: (exerciseId: string) => ExerciseProgressPoint[];
  /** Get PR timeline for a specific exercise */
  getPersonalRecordTimeline: (exerciseId: string) => PersonalRecordPoint[];
  /** Refetch data */
  refetch: () => void;
}

/**
 * Query hook for workout analytics data.
 *
 * Fetches all completed sessions and sets from local SQLite, then
 * computes volume trends, consistency data, and exercise progress.
 *
 * Pass `period` to toggle between weekly and monthly aggregation.
 */
export function useAnalytics(period: AnalyticsPeriod = "weekly"): UseAnalyticsResult {
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, userId, "analytics"],
    queryFn: () => fetchAnalyticsData(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 min — analytics change when new workouts are logged
    gcTime: 1000 * 60 * 10,   // 10 min — keep in memory during navigation
  });

  const data = query.data;

  // Compute aggregations from raw data — pure functions, memoized by period
  const volumeByPeriod = useMemo(
    () => (data ? computeVolumeByPeriod(data.sets, period) : []),
    [data?.sets, period],
  );

  const consistencyData = useMemo(
    () => (data ? computeConsistencyData(data.sessions, period) : []),
    [data?.sessions, period],
  );

  const exercises = useMemo(
    () => data?.exercises ?? [],
    [data?.exercises],
  );

  // Lazy functions for drill-down (not memoized — caller controls via exerciseId)
  const getExerciseProgress = (exerciseId: string): ExerciseProgressPoint[] => {
    if (!data) return [];
    return computeExerciseProgress(exerciseId, data.sets);
  };

  const getPersonalRecordTimeline = (exerciseId: string): PersonalRecordPoint[] => {
    if (!data) return [];
    return computePersonalRecordTimeline(exerciseId, data.sets);
  };

  return {
    volumeByPeriod,
    consistencyData,
    exercises,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    getExerciseProgress,
    getPersonalRecordTimeline,
    refetch: query.refetch,
  };
}
