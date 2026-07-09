import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/auth-store";

const PROFILE_STATS_QUERY_KEY = "profile-stats";

export interface ProfileStats {
  totalWorkouts: number;
  currentStreak: number;
  personalRecords: number;
  totalVolume: number;
}

/**
 * Query completed workout session dates from local SQLite to compute
 * total completed workouts and current streak (consecutive days with
 * at least one completed workout, counting backwards from today).
 *
 * Also computes total volume (sum of weight_kg * reps for non-warmup sets)
 * and personal records count (exercises with at least one logged set).
 *
 * Uses a dynamic import of getDb so the module can be imported in
 * environments without expo-sqlite (e.g. web, node tests).
 */
async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const { getDb } = await import("../../../lib/db/database");
  const db = await getDb();

  // Get distinct dates of completed sessions for this user
  const rows = await db.getAllAsync<{ workout_date: string }>(
    `SELECT DISTINCT DATE(started_at) as workout_date
     FROM workout_sessions
     WHERE status = 'completed' AND user_id = ?
     ORDER BY started_at DESC`,
    [userId],
  );

  const totalWorkouts = rows.length;

  // Compute streak: consecutive calendar days with a completed workout
  let currentStreak = 0;
  if (rows.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestDate = new Date(rows[0].workout_date + "T00:00:00");
    const diffMs = today.getTime() - latestDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Streak is broken if the most recent workout is older than yesterday
    if (diffDays <= 1) {
      currentStreak = 1;

      for (let i = 1; i < rows.length; i++) {
        const prevDate = new Date(rows[i - 1].workout_date + "T00:00:00");
        const currDate = new Date(rows[i].workout_date + "T00:00:00");
        const dayDiff = Math.floor(
          (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (dayDiff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  // Total volume: sum of weight_kg * reps for non-warmup sets in completed sessions
  const volumeResult = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(es.weight_kg * es.reps) as total
     FROM exercise_sets es
     JOIN workout_sessions ws ON es.session_id = ws.id
     WHERE ws.status = 'completed' AND ws.user_id = ? AND es.is_warmup = 0`,
    [userId],
  );
  const totalVolume = volumeResult?.total ?? 0;

  // Personal records count: distinct exercises with at least one logged set in completed sessions
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

/**
 * Query hook for profile statistics derived from workout history.
 *
 * Computes total completed workouts, current streak, personal records count,
 * and total volume from local SQLite data. Works offline by default.
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
