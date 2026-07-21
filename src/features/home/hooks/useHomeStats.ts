import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import type { RecordModel } from "pocketbase";
import { useAuthStore } from "@/stores/auth-store";
import { pb } from "@/lib/pocketbase/client";
import { calculateE1RM } from "@/shared/utils/pr-calc";

const HOME_STATS_QUERY_KEY = "home-stats";

// ─── Types ──────────────────────────────────────────────────────────────

export interface RecentSession {
  id: string;
  templateName: string;
  startedAt: string;
  durationMinutes: number | null;
  exerciseCount: number;
}

export interface HomeStats {
  totalWorkouts: number;
  totalSets: number;
  thisWeekWorkouts: number;
  bestE1RM: number | null;
  recentSessions: RecentSession[];
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Compute a relative time string from a date.
 * "Today", "2d ago", "1w ago", "3mo ago"
 */
function relativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 1) return "just now";
  if (hours < 1) return `${minutes}m ago`;
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (weeks === 1) return "1w ago";
  if (weeks < 4) return `${weeks}w ago`;
  if (months === 1) return "1mo ago";
  return `${months}mo ago`;
}

// ─── Data fetching ──────────────────────────────────────────────────────

/**
 * Fetch home dashboard stats directly from PocketBase.
 *
 * Uses `getFullList` with `$autoCancel: false` to avoid PocketBase's
 * automatic request cancellation on rapid successive calls.
 */
async function fetchHomeStats(userId: string): Promise<HomeStats> {
  // 1. All completed sessions for this user
  const sessions = await pb.collection("workout_sessions").getFullList({
    filter: `user_id = '${userId}' && status = 'completed'`,
    sort: "-started_at",
    requestKey: null,
  });

  const totalWorkouts = sessions.length;

  // 2. Date boundary: 7 days ago
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString();

  const thisWeekWorkouts = sessions.filter(
    (s) => s.started_at >= weekAgoStr,
  ).length;

  // 3. All exercise sets for this user (via sessions)
  const allSessionIds = sessions.map((s) => s.id);
  let totalSets = 0;

  // PocketBase filter length limit — batch in chunks of 50
  const BATCH = 50;
  for (let i = 0; i < allSessionIds.length; i += BATCH) {
    const chunk = allSessionIds.slice(i, i + BATCH);
    const filter = chunk.map((id) => `workout_session_id = '${id}'`).join(" || ");
    const sets = await pb.collection("exercise_sets").getFullList({
      filter,
      fields: "id,exercise_id,weight_kg,reps",
      requestKey: null,
    });
    totalSets += sets.length;
  }

  // 4. Best e1RM — scan all working sets for highest estimate
  let bestE1RM: number | null = null;

  for (let i = 0; i < allSessionIds.length; i += BATCH) {
    const chunk = allSessionIds.slice(i, i + BATCH);
    const filter = chunk
      .map((id) => `workout_session_id = '${id}'`)
      .join(" || ");
    const sets = await pb.collection("exercise_sets").getFullList({
      filter: `${filter} && is_warmup = false && reps > 0 && weight_kg > 0`,
      fields: "weight_kg,reps",
      requestKey: null,
    });

    for (const s of sets) {
      const e1rm = calculateE1RM(s.weight_kg, s.reps);
      if (e1rm > (bestE1RM ?? 0)) {
        bestE1RM = e1rm;
      }
    }
  }

  // 5. Recent 5 sessions with enrichment
  const recentRaw = sessions.slice(0, 5);
  const recentSessions: RecentSession[] = await Promise.all(
    recentRaw.map(async (session) => {
      // Count unique exercises in this session
      const sets = await pb.collection("exercise_sets").getFullList({
        filter: `workout_session_id = '${session.id}'`,
        fields: "exercise_id",
        requestKey: null,
      });
      const uniqueExercises = new Set(
        (sets ?? []).map((s: RecordModel) => s.exercise_id as string),
      );

      // Template name
      let templateName = t`Custom Workout`;
      if (session.workout_template_id) {
        try {
          const tmpl = await pb
            .collection("workout_templates")
            .getOne(session.workout_template_id, {
              fields: "name",
              requestKey: null,
            });
          templateName = (tmpl as unknown as { name: string }).name;
        } catch {
          // template deleted — keep fallback
        }
      }

      return {
        id: session.id,
        templateName,
        startedAt: session.started_at,
        durationMinutes: session.duration_minutes,
        exerciseCount: uniqueExercises.size,
      };
    }),
  );

  return {
    totalWorkouts,
    totalSets,
    thisWeekWorkouts,
    bestE1RM,
    recentSessions,
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────

/**
 * Home dashboard data hook.
 *
 * Fetches all stats in a single query to reduce network chatter.
 * Uses staleTime: 5 min, gcTime: 30 min — same as PRs.
 */
export function useHomeStats() {
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery({
    queryKey: [HOME_STATS_QUERY_KEY, userId],
    queryFn: () => fetchHomeStats(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const stats = query.data;

  return {
    ...query,
    totalWorkouts: stats?.totalWorkouts ?? 0,
    totalSets: stats?.totalSets ?? 0,
    thisWeekWorkouts: stats?.thisWeekWorkouts ?? 0,
    bestE1RM: stats?.bestE1RM ?? null,
    recentSessions: stats?.recentSessions ?? [],
  };
}

export { relativeDate };
