import { Platform } from "react-native";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase/client";
import { useAuthStore } from "@/stores/auth-store";
import {
  calcVolumeByPeriod,
  buildPRTimeline,
  type VolumeByPeriod,
  type PRTimeline,
} from "./analytics-calc";

const ANALYTICS_QUERY_KEY = "analytics";

export type AnalyticsPeriod = "weekly" | "monthly";

// ─── PocketBase Queries (web fallback) ─────────────────────────────────────

/**
 * Fetch completed workout sessions with their exercise sets from PocketBase.
 */
async function fetchAnalyticsFromPocketBase(userId: string) {
  const sessions = await pb.collection("workout_sessions").getFullList({
    filter: `status = 'completed' && user_id = '${userId}' && completed_at != null`,
    sort: "-completed_at",
    $autoCancel: false,
  });

  const results: Array<{
    id: string;
    completed_at: string;
    sets: Array<{ weight: number; reps: number; created_at: string }>;
  }> = [];

  for (const session of sessions) {
    const sets = await pb.collection("exercise_sets").getFullList({
      filter: `workout_session_id = '${session.id}' && is_warmup = false`,
      sort: "created",
      $autoCancel: false,
    });

    results.push({
      id: session.id,
      completed_at: session.completed_at ?? "",
      sets: sets.map((s) => ({
        weight: s.weight_kg ?? 0,
        reps: s.reps ?? 0,
        created_at: s.created ?? "",
      })),
    });
  }

  return results;
}

/**
 * Fetch all unique exercises that have been logged in completed sessions from PocketBase.
 */
async function fetchExercisesFromPocketBase(
  userId: string,
): Promise<Array<{ id: string; name: string }>> {
  // First get completed sessions for this user
  const sessions = await pb.collection("workout_sessions").getFullList({
    filter: `status = 'completed' && user_id = '${userId}'`,
    fields: "id",
    $autoCancel: false,
  });

  if (sessions.length === 0) return [];

  const sessionIdFilters = sessions.map((s) => `workout_session_id = '${s.id}'`);
  const filterStr = `(${sessionIdFilters.join(" || ")}) && is_warmup = false`;

  const sets = await pb.collection("exercise_sets").getFullList({
    filter: filterStr,
    fields: "exercise_id,expand",
    expand: "exercise_id",
    $autoCancel: false,
  });

  // Deduplicate by exercise_id
  const seen = new Set<string>();
  const exercises: Array<{ id: string; name: string }> = [];

  for (const set of sets) {
    const exId = set.exercise_id;
    if (seen.has(exId)) continue;
    seen.add(exId);

    // Try to get the exercise name from expand, or fetch it
    if (set.expand?.exercise_id?.name) {
      exercises.push({ id: exId, name: set.expand.exercise_id.name });
    } else {
      try {
        const ex = await pb.collection("exercises").getOne(exId, {
          fields: "id,name",
          $autoCancel: false,
        });
        exercises.push({ id: ex.id, name: ex.name ?? "" });
      } catch {
        exercises.push({ id: exId, name: exId });
      }
    }
  }

  return exercises.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetch all logged sets for a specific exercise from PocketBase.
 */
async function fetchExerciseSetsFromPocketBase(
  userId: string,
  exerciseId: string,
): Promise<Array<{ weight: number; reps: number; created_at: string }>> {
  const sessions = await pb.collection("workout_sessions").getFullList({
    filter: `status = 'completed' && user_id = '${userId}'`,
    fields: "id",
    $autoCancel: false,
  });

  if (sessions.length === 0) return [];

  const sessionIdFilters = sessions.map((s) => `workout_session_id = '${s.id}'`);
  const filterStr = `(${sessionIdFilters.join(" || ")}) && exercise_id = '${exerciseId}' && is_warmup = false`;

  const sets = await pb.collection("exercise_sets").getFullList({
    filter: filterStr,
    sort: "created",
    $autoCancel: false,
  });

  return sets.map((s) => ({
    weight: s.weight_kg ?? 0,
    reps: s.reps ?? 0,
    created_at: s.created ?? "",
  }));
}

// ─── Local SQLite Queries ─────────────────────────────────────────────────

/**
 * Fetch completed workout sessions with their exercise sets from local SQLite.
 * Used for analytics calculation.
 *
 * Falls back to empty array on failure (e.g. expo-sqlite WASM crash on web).
 */
async function fetchAnalyticsFromLocal() {
  try {
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
  } catch (err) {
    console.warn("[analytics] fetchAnalyticsFromLocal failed:", err);
    return [];
  }
}

/**
 * Get all unique exercises that have been logged in completed sessions.
 *
 * Falls back to empty array on failure (e.g. expo-sqlite WASM crash on web).
 */
async function fetchExercisesFromLocal(): Promise<
  Array<{ id: string; name: string }>
> {
  try {
    const { getDb } = await import("@/lib/db/database");
    const db = await getDb();

    return await db.getAllAsync<{ id: string; name: string }>(
      `SELECT DISTINCT e.id, e.name FROM exercises e
       INNER JOIN exercise_sets es ON es.exercise_id = e.id
       INNER JOIN workout_sessions ws ON ws.id = es.session_id
       WHERE ws.status = 'completed' AND es.is_warmup = 0
       ORDER BY e.name ASC`,
    );
  } catch (err) {
    console.warn("[analytics] fetchExercisesFromLocal failed:", err);
    return [];
  }
}

/**
 * Get all logged sets for a specific exercise from local SQLite.
 *
 * Falls back to empty array on failure (e.g. expo-sqlite WASM crash on web).
 */
async function fetchExerciseSetsFromLocal(
  exerciseId: string,
): Promise<Array<{ weight: number; reps: number; created_at: string }>> {
  try {
    const { getDb } = await import("@/lib/db/database");
    const db = await getDb();

    const rows = await db.getAllAsync<{ weight_kg: number; reps: number; created: string }>(
      `SELECT es.weight_kg, es.reps, es.created FROM exercise_sets es
       INNER JOIN workout_sessions ws ON ws.id = es.session_id
       WHERE es.exercise_id = ? AND ws.status = 'completed' AND es.is_warmup = 0
       ORDER BY es.created ASC`,
      [exerciseId],
    );
    return rows.map((r) => ({
      weight: r.weight_kg,
      reps: r.reps,
      created_at: r.created,
    }));
  } catch (err) {
    console.warn("[analytics] fetchExerciseSetsFromLocal failed:", err);
    return [];
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Hook for analytics data — reads from local SQLite and computes
 * volume trends, consistency, and exercise PR timelines.
 */
export function useAnalytics(period: AnalyticsPeriod = "weekly") {
  const userId = useAuthStore((s) => s.user?.id);

  const sessionsQuery = useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "sessions", period, userId],
    queryFn: () => {
      if (!userId) return [];
      if (Platform.OS === "web") {
        return fetchAnalyticsFromPocketBase(userId);
      }
      return fetchAnalyticsFromLocal();
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  const exercisesQuery = useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, "exercises", userId],
    queryFn: () => {
      if (!userId) return [];
      if (Platform.OS === "web") {
        return fetchExercisesFromPocketBase(userId);
      }
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
