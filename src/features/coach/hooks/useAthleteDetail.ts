import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAthlete, unlinkAthlete } from "@/lib/pocketbase/services/coach-athletes";
import { listAssignmentsWithTemplateNames } from "@/lib/pocketbase/services/program-assignments";
import type { UserRow, ProgramAssignmentRow } from "@/types/pocketbase";

const ATHLETE_DETAIL_QUERY_KEY = "athlete-detail";
const ATHLETE_ASSIGNMENTS_KEY = "athlete-assignments";

/**
 * Hook for athlete detail screen — profile + assignments.
 */
export function useAthleteDetail(athleteId: string | undefined) {
  const athleteQuery = useQuery({
    queryKey: [ATHLETE_DETAIL_QUERY_KEY, athleteId],
    queryFn: () => getAthlete(athleteId!),
    enabled: !!athleteId,
    staleTime: 1000 * 60 * 5,
  });

  const assignmentsQuery = useQuery({
    queryKey: [ATHLETE_ASSIGNMENTS_KEY, athleteId],
    queryFn: () => listAssignmentsWithTemplateNames(athleteId!),
    enabled: !!athleteId,
    staleTime: 1000 * 60 * 2,
  });

  return {
    athlete: (athleteQuery.data ?? null) as UserRow | null,
    assignments: (assignmentsQuery.data ?? []) as ProgramAssignmentRow[],
    isLoading: athleteQuery.isLoading || assignmentsQuery.isLoading,
    error: athleteQuery.error || assignmentsQuery.error,
    refetch: () => {
      athleteQuery.refetch();
      assignmentsQuery.refetch();
    },
  };
}

/**
 * Mutation hook to unlink an athlete from the coach.
 */
export function useUnlinkAthlete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { athleteId: string; teamId?: string }) =>
      unlinkAthlete(input.athleteId, input.teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ATHLETE_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["coach-dashboard"] });
    },
  });
}
