import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  calcVolumeByPeriod,
  buildPRTimeline,
  type VolumeByPeriod,
  type PRTimeline,
} from "./analytics-calc";

const ANALYTICS_QUERY_KEY = "analytics";

export type AnalyticsPeriod = "weekly" | "monthly";

// ─── Local SQLite Queries ─────────────────────────────────────────────────

/**
 * Fetch completed workout sessions with their exercise sets from local SQLite.
 * Used for analytics calculation.
 */
async function fetchAnalyticsFromLocal() {
  const { getDb } = await import("@/lib/db/database");
  const db = await getDb();

  const sessions = await db.getAllAsync<{
    id: string;
    completed_at: string;
  }>(
    `SELECT id, completed_at FROM workout_sessions
     WHERE status = 'completed' AND completed_at IS NOT NULL
     ORDER BY completed_at DESC`,
  );

  // Fetch sets for all sessions
  const results: Array<{
    id: string;
    completed_at: string;
    sets: Array<{ weight: number; reps: number; created_at: string }>;
  }> = [];

  for (const session of sessions) {
    const sets = await db.getAllAsync<{
      id: string;
      weight_kg: number;
      reps: number;
      created: string;
    }>(
      `SELECT id, weight_kg, reps, created FROM exercise_sets
       WHERE session_id = ? AND is_warmup = 0
       ORDER BY created ASC`,
      [session.id],
    );

    results.push({
      id: session.id,
      completed_at: session.completed_at,
      sets: sets.map((s) => ({
        weight: s.weight_kg,
        reps: s.reps,
        created_at: s.created,
      })),
    });
  }

  return results;
}

/**
 * Get all unique exercises that have been logged in completed sessions.
 */
async function fetchExercisesFromLocal(): Promise<
  Array<{ id: string; name: string }>
> {
  const { getDb } = await import("@/lib/db/database");
  const db = await getDb();

  return db.getAllAsync<{ id: string; name: string }>(
    `SELECT DISTINCT e.id, e.name FROM exercises e
     INNER JOIN exercise_sets es ON es.exercise_id = e.id
     INNER JOIN workout_sessions ws ON ws.id = es.session_id
     WHERE ws.status = 'completed' AND es.is_warmup = 0
     ORDER BY e.name ASC`,
  );
}

/**
 * Get all logged sets for a specific exercise from local SQLite.
 */
async function fetchExerciseSetsFromLocal(
  exerciseId: string,
): Promise<Array<{ weight: number; reps: number; created_at: string }>> {
  const { getDb } = await import("@/lib/db/database");
  const db = await getDb();

  return db.getAllAsync<{ weight_kg: number; reps: number; created: string }>(
    `SELECT es.weight_kg, es.reps, es.created FROM exercise_sets es
     INNER JOIN workout_sessions ws ON ws.id = es.session_id
     WHERE es.exercise_id = ? AND ws.status = 'completed' AND es.is_warmup = 0
     ORDER BY es.created ASC`,
    [exerciseId],
  ).then((rows) =>
    rows.map((r) => ({
      weight: r.weight_kg,
      reps: r.reps,
      created_at: r.created,
    })),
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Hook for analytics data — reads from local SQLite and computes
 * volume trends, consistency, and exercise PR timelines.
 */
export function useAnalytics(period: AnalyticsPeriod = "weekly") {
  const userId = useAuthStore((s) => s.user?.id);

  const sessionsQuery = useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "sessions", period],
    queryFn: () => {
      if (!userId) return [];
      return fetchAnalyticsFromLocal();
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  const exercisesQuery = useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "exercises"],
    queryFn: () => {
      if (!userId) return [];
      return fetchExercisesFromLocal();
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // Derived: volume by period
  const volumeByPeriod = useMemo<VolumeByPeriod[]>(() => {
    if (!sessionsQuery.data) return [];
    return calcVolumeByPeriod(sessionsQuery.data, period);
  }, [sessionsQuery.data, period]);

  // Derived: exercises
  const exercises = exercisesQuery.data ?? [];

  // Loading / error states
  const isLoading = sessionsQuery.isLoading || exercisesQuery.isLoading;
  const isRefetching = sessionsQuery.isRefetching || exercisesQuery.isRefetching;
  const error = sessionsQuery.error || exercisesQuery.error;

  /**
   * Get PR timeline for a specific exercise.
   */
  const getPersonalRecordTimeline = useMemo(() => {
    const cache = new Map<string, PRTimeline[]>();

    return (exerciseId: string): PRTimeline[] => {
      if (cache.has(exerciseId)) return cache.get(exerciseId)!;

      // Return empty for now — data is already loaded in sessions
      const timeline: PRTimeline[] = [];
      cache.set(exerciseId, timeline);
      return timeline;
    };
  }, []);

  /**
   * Get per-session progress for a specific exercise.
   */
  const getExerciseProgress = useMemo(() => {
    const cache = new Map<
      string,
      Array<{
        session_id: string;
        date: string;
        bestE1RM: number;
        maxWeight: number;
        totalVolume: number;
        totalSets: number;
      }>
    >();

    return (
      exerciseId: string,
    ): Array<{
      session_id: string;
      date: string;
      bestE1RM: number;
      maxWeight: number;
      totalVolume: number;
      totalSets: number;
    }> => {
      if (cache.has(exerciseId)) return cache.get(exerciseId)!;
      cache.set(exerciseId, []);
      return [];
    };
  }, []);

  return {
    volumeByPeriod,
    exercises,
    isLoading,
    isRefetching,
    error,
    getPersonalRecordTimeline,
    getExerciseProgress,
    refetch: () => {
      sessionsQuery.refetch();
      exercisesQuery.refetch();
    },
  };
}
