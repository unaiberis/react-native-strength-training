import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { listAthletes } from "@/lib/pocketbase/services/coach-athletes";
import type { AthleteSummary } from "@/types/pocketbase";

const COACH_DASHBOARD_QUERY_KEY = "coach-dashboard";

/**
 * Hook for the coach dashboard — fetches athlete list with stats.
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

  return {
    ...query,
    athletes,
    activeCount: athletes.filter((a) => a.thisWeekWorkouts > 0).length,
    inactiveCount: athletes.filter((a) => a.thisWeekWorkouts === 0).length,
    totalAthletes: athletes.length,
  };
}

export type { AthleteSummary };
