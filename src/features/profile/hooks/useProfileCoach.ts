/**
 * Hook to fetch the coach(es) for the currently authenticated athlete.
 *
 * Queries the athlete's team memberships and finds members with "coach"
 * or "admin" role in those teams.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getAthleteCoach } from "@/lib/pocketbase/services/coach-athletes";

const PROFILE_COACH_QUERY_KEY = "profile-coach";

export interface ProfileCoach {
  id: string;
  displayName: string;
  email: string;
}

/**
 * Returns the list of coaches/admins associated with the current user's teams.
 */
export function useProfileCoach(): {
  coaches: ProfileCoach[];
  isLoading: boolean;
  error: unknown;
} {
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.role);
  const isTeamCoach = useAuthStore((s) => s.isTeamCoach);

  const query = useQuery({
    queryKey: [PROFILE_COACH_QUERY_KEY, userId],
    queryFn: () => getAthleteCoach(userId!),
    enabled: !!userId && role === "athlete",
    staleTime: 1000 * 60 * 5,
  });

  return {
    coaches: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
