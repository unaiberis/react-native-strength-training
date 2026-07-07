import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/auth-store";

const PROFILE_STATS_QUERY_KEY = "profile-stats";

export interface ProfileStats {
  totalWorkouts: number;
  currentStreak: number;
}

/**
 * Query completed workout session dates from local SQLite to compute
 * total completed workouts and current streak (consecutive days with
 * at least one completed workout, counting backwards from today).
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

  return { totalWorkouts, currentStreak };
}

/**
 * Query hook for profile statistics derived from workout history.
 *
 * Computes total completed workouts and the user's current streak
 * from local SQLite data. Works offline by default.
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
