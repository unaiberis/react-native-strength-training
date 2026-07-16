import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/auth-store";
import { pb } from "../../../lib/pocketbase/client";

export const PROFILE_STATS_QUERY_KEY = "profile-stats";

export interface ProfileStats {
  totalWorkouts: number;
  currentStreak: number;
  personalRecords: number;
  totalVolume: number;
}

// ─── Streak helper (shared between SQLite and PocketBase paths) ────────

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latestDate = new Date(dates[0] + "T00:00:00");
  const diffMs = today.getTime() - latestDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 1) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1] + "T00:00:00");
    const currDate = new Date(dates[i] + "T00:00:00");
    const dayDiff = Math.floor(
      (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (dayDiff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ─── PocketBase path (web — no SQLite) ────────────────────────────────

async function fetchProfileStatsFromPocketBase(
  userId: string,
): Promise<ProfileStats> {
  // Fetch all completed sessions for this user
  const sessions = await pb.collection("workout_sessions").getFullList({
    filter: `status = 'completed' && user_id = '${userId}'`,
    sort: "-started_at",
    $autoCancel: false,
  });

  const totalWorkouts = sessions.length;

  // Compute streak from session dates
  const uniqueDates = [
    ...new Set(sessions.map((s) => s.started_at?.split("T")[0])),
  ].sort((a, b) => b.localeCompare(a));
  const currentStreak = computeStreak(uniqueDates);

  // Fetch all non-warmup exercise sets for completed sessions
  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length === 0) {
    return { totalWorkouts, currentStreak, personalRecords: 0, totalVolume: 0 };
  }

  // PocketBase filter: session_id in [id1, id2, ...] AND is_warmup = false
  const filterParts = sessionIds.map((id) => `workout_session_id = '${id}'`);
  const setsFilter = `(${filterParts.join(" || ")}) && is_warmup = false`;

  const sets = await pb.collection("exercise_sets").getFullList({
    filter: setsFilter,
    $autoCancel: false,
  });

  // Total volume: sum of weight_kg * reps
  const totalVolume = sets.reduce(
    (sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0),
    0,
  );

  // Personal records: distinct exercises with weight > 0
  const exercisesWithWeight = new Set(
    sets.filter((s) => (s.weight_kg ?? 0) > 0).map((s) => s.exercise_id),
  );

  return {
    totalWorkouts,
    currentStreak,
    personalRecords: exercisesWithWeight.size,
    totalVolume,
  };
}

// ─── SQLite path (native — offline-first) ─────────────────────────────

async function fetchProfileStatsFromSQLite(
  userId: string,
): Promise<ProfileStats> {
  const { getDb } = await import("../../../lib/db/database");
  const db = await getDb();

  const rows = await db.getAllAsync<{ workout_date: string }>(
    `SELECT DISTINCT DATE(started_at) as workout_date
     FROM workout_sessions
     WHERE status = 'completed' AND user_id = ?
     ORDER BY started_at DESC`,
    [userId],
  );

  const totalWorkouts = rows.length;
  const currentStreak = computeStreak(rows.map((r) => r.workout_date));

  const volumeResult = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(es.weight_kg * es.reps) as total
     FROM exercise_sets es
     JOIN workout_sessions ws ON es.session_id = ws.id
     WHERE ws.status = 'completed' AND ws.user_id = ? AND es.is_warmup = 0`,
    [userId],
  );
  const totalVolume = volumeResult?.total ?? 0;

  const prResult = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT es.exercise_id) as count
     FROM exercise_sets es
     JOIN workout_sessions ws ON es.session_id = ws.id
     WHERE ws.status = 'completed' AND ws.user_id = ? AND es.weight_kg > 0`,
    [userId],
  );
  const personalRecords = prResult?.count ?? 0;

  return { totalWorkouts, currentStreak, personalRecords, totalVolume };
}

// ─── Main fetch function — routes by platform ─────────────────────────

async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  // On web, SQLite is unavailable (expo-sqlite hangs in browser).
  // Query PocketBase directly instead.
  if (Platform.OS === "web") {
    return fetchProfileStatsFromPocketBase(userId);
  }
  return fetchProfileStatsFromSQLite(userId);
}

/**
 * Query hook for profile statistics derived from workout history.
 *
 * On native: reads from local SQLite (offline-first).
 * On web: queries PocketBase directly (no local DB).
 */
export function useProfileStats() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<ProfileStats>({
    queryKey: [PROFILE_STATS_QUERY_KEY, userId],
    queryFn: () => fetchProfileStats(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 min — stats change only when a workout completes
  });
}

export default useProfileStats;
