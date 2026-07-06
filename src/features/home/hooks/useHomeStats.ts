import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
 * Dos etapas para minimizar datos transferidos:
 *   Stage 1 (rápida): sessions + totalSets count (getList perPage=1).
 *   Stage 2 (pesada): solo las últimas 30 sesiones para E1RM + recientes.
 *   Stage 3: nombres de template en un batch.
 *
 * Waterfall antes (100 sesiones, ~1000 sets):
 *   ~15 calls, ~1000 registros transferidos
 * Waterfall ahora:
 *   4 calls, ~300 registros transferidos (top 30 sesiones ~300 sets)
 */
async function fetchHomeStats(userId: string): Promise<HomeStats> {
  // ── Stage 1: sessions ───────────────────────────────────────────────
  const sessions = await pb.collection("workout_sessions").getFullList({
    filter: `user_id = '${userId}' && status = 'completed'`,
    sort: "-started_at",
    requestKey: null,
  });

  const totalWorkouts = sessions.length;
  if (totalWorkouts === 0) {
    return { totalWorkouts: 0, totalSets: 0, thisWeekWorkouts: 0, bestE1RM: null, recentSessions: [] };
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString();
  const thisWeekWorkouts = sessions.filter(
    (s) => s.started_at >= weekAgoStr,
  ).length;

  const allSessionIds = sessions.map((s) => s.id);
  const BATCH = 50;

  // ── Stage 2: totalSets (count) + E1RM + recientes (en paralelo) ─────
  async function countTotalSets(): Promise<number> {
    let count = 0;
    for (let i = 0; i < allSessionIds.length; i += BATCH) {
      const chunk = allSessionIds.slice(i, i + BATCH);
      const filter = chunk.map((id) => `workout_session_id = '${id}'`).join(" || ");
      const result = await pb.collection("exercise_sets").getList(1, 1, {
        filter,
        fields: "id",
        requestKey: null,
      });
      count += result.totalItems;
    }
    return count;
  }

  async function scanRecentForE1RM(): Promise<{
    bestE1RM: number | null;
    exBySession: Record<string, Set<string>>;
  }> {
    const scanIds = allSessionIds.slice(0, 30); // top 30 para PRs
    const recentIds = new Set(allSessionIds.slice(0, 5));
    let bestE1RM: number | null = null;
    const exBySession: Record<string, Set<string>> = {};

    for (let i = 0; i < scanIds.length; i += BATCH) {
      const chunk = scanIds.slice(i, i + BATCH);
      const filter = chunk.map((id) => `workout_session_id = '${id}'`).join(" || ");
      const sets = await pb.collection("exercise_sets").getFullList({
        filter: `${filter} && is_warmup = false && reps > 0 && weight_kg > 0`,
        fields: "id,workout_session_id,exercise_id,weight_kg,reps",
        requestKey: null,
      });

      for (const s of sets) {
        const e1rm = calculateE1RM(s.weight_kg, s.reps);
        if (e1rm > (bestE1RM ?? 0)) bestE1RM = e1rm;

        const sid = s.workout_session_id as string;
        if (recentIds.has(sid) && s.exercise_id) {
          if (!exBySession[sid]) exBySession[sid] = new Set();
          exBySession[sid].add(s.exercise_id as string);
        }
      }
    }
    return { bestE1RM, exBySession };
  }

  const [totalSets, { bestE1RM, exBySession }] = await Promise.all([
    countTotalSets(),
    scanRecentForE1RM(),
  ]);

  // ── Stage 3: template names ─────────────────────────────────────────
  const recentRaw = sessions.slice(0, 5);
  const templateIds = recentRaw
    .map((s) => s.workout_template_id as string | undefined)
    .filter(Boolean) as string[];

  const templateNames: Record<string, string> = {};
  if (templateIds.length > 0) {
    try {
      const filter = templateIds.map((id) => `id = '${id}'`).join(" || ");
      const templates = await pb.collection("workout_templates").getFullList({
        filter,
        fields: "id,name",
        requestKey: null,
      });
      for (const t of templates) {
        templateNames[t.id] = (t as unknown as { name: string }).name;
      }
    } catch {
      // template deleted — keep fallback
    }
  }

  const recentSessions: RecentSession[] = recentRaw.map((session) => ({
    id: session.id,
    templateName: session.workout_template_id
      ? (templateNames[session.workout_template_id as string] ?? "Custom Workout")
      : "Custom Workout",
    startedAt: session.started_at,
    durationMinutes: session.duration_minutes,
    exerciseCount: exBySession[session.id]?.size ?? 0,
  }));

  return { totalWorkouts, totalSets, thisWeekWorkouts, bestE1RM, recentSessions };
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
