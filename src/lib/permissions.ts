import { useQuery } from "@tanstack/react-query";
import type { TeamRole } from "@/types/pocketbase";
import { getMyRoleInTeam } from "@/lib/pocketbase/services/team-memberships";

export interface PermissionCheck {
  canViewTeam: (myRole: TeamRole | null) => boolean;
  canEditTeam: (myRole: TeamRole | null) => boolean;
  canDeleteTeam: (myRole: TeamRole | null) => boolean;
  canAddMember: (myRole: TeamRole | null) => boolean;
  canRemoveMember: (myRole: TeamRole | null, targetRole: TeamRole) => boolean;
  canChangeRole: (myRole: TeamRole | null, targetRole: TeamRole) => boolean;
  canAssignProgram: (myRole: TeamRole | null) => boolean;
  canCreateInvite: (myRole: TeamRole | null) => boolean;
  canViewAllAthletes: (myRole: TeamRole | null) => boolean;
}

export const permissions: PermissionCheck = {
  canViewTeam: (role) => role !== null,
  canEditTeam: (role) => role === "admin",
  canDeleteTeam: (role) => role === "admin",
  canAddMember: (role) => role === "admin" || role === "coach",
  canRemoveMember: (role, targetRole) =>
    role === "admin" || (role === "coach" && targetRole === "athlete"),
  canChangeRole: (role) => role === "admin",
  canAssignProgram: (role) => role === "admin" || role === "coach",
  canCreateInvite: (role) => role === "admin" || role === "coach",
  canViewAllAthletes: (role) => role === "admin",
};

/**
 * Query key for team role.
 */
const TEAM_ROLE_QUERY_KEY = "team-role";

/**
 * React Query hook that fetches the current user's role for a given team
 * and returns bound permission functions for that role.
 */
export function useTeamPermissions(
  teamId: string | null,
  userId?: string,
): {
  role: TeamRole | null;
  isLoading: boolean;
  canViewTeam: boolean;
  canEditTeam: boolean;
  canDeleteTeam: boolean;
  canAddMember: boolean;
  canRemoveMember: (targetRole: TeamRole) => boolean;
  canChangeRole: (targetRole: TeamRole) => boolean;
  canAssignProgram: boolean;
  canCreateInvite: boolean;
  canViewAllAthletes: boolean;
} {
  const { data: role = null, isLoading } = useQuery({
    queryKey: [TEAM_ROLE_QUERY_KEY, teamId, userId],
    queryFn: async () => {
      if (!teamId || !userId) return null;
      return getMyRoleInTeam(userId, teamId);
    },
    enabled: !!teamId && !!userId,
  });

  return {
    role,
    isLoading,
    canViewTeam: permissions.canViewTeam(role),
    canEditTeam: permissions.canEditTeam(role),
    canDeleteTeam: permissions.canDeleteTeam(role),
    canAddMember: permissions.canAddMember(role),
    canRemoveMember: (targetRole: TeamRole) =>
      permissions.canRemoveMember(role, targetRole),
    canChangeRole: (targetRole: TeamRole) =>
      permissions.canChangeRole(role, targetRole),
    canAssignProgram: permissions.canAssignProgram(role),
    canCreateInvite: permissions.canCreateInvite(role),
    canViewAllAthletes: permissions.canViewAllAthletes(role),
  };
}
