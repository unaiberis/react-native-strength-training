import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { listAthletes } from "@/lib/pocketbase/services/coach-athletes";
import { getFeedbackCountsForAthletes } from "@/lib/pocketbase/services/feedback";
import type { AthleteSummary } from "@/types/pocketbase";

const COACH_DASHBOARD_QUERY_KEY = "coach-dashboard";

/**
 * Hook for the coach dashboard — fetches athlete list with stats.
 * Also fetches feedback counts for all athletes.
 */
export function useCoachDashboard() {
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery({
    queryKey: [COACH_DASHBOARD_QUERY_KEY, userId],
    queryFn: () => listAthletes(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 min — dashboard should feel fresh
  });

  const athletes = query.data ?? [];

  // Fetch feedback counts for all athletes
  const feedbackQuery = useQuery({
    queryKey: [COACH_DASHBOARD_QUERY_KEY, "feedback-counts", userId],
    queryFn: async () => {
      if (athletes.length === 0) return new Map<string, number>();
      return getFeedbackCountsForAthletes(athletes.map((a) => a.id));
    },
    enabled: !!userId && athletes.length > 0,
    staleTime: 1000 * 60 * 1,
  });

  const feedbackCounts = feedbackQuery.data ?? new Map<string, number>();

  const athletesWithFeedback = useMemo(
    () => athletes.map((a) => ({
      ...a,
      feedbackCount: feedbackCounts.get(a.id) ?? 0,
    })),
    [athletes, feedbackCounts],
  );

  return {
    ...query,
    athletes: athletesWithFeedback,
    activeCount: athletes.filter((a) => a.thisWeekWorkouts > 0).length,
    inactiveCount: athletes.filter((a) => a.thisWeekWorkouts === 0).length,
    totalAthletes: athletes.length,
  };
}

export type { AthleteSummary };
