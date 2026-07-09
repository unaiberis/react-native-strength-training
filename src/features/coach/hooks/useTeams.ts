import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/stores/auth-store"
import * as teamsService from "@/lib/pocketbase/services/teams"
import * as membershipsService from "@/lib/pocketbase/services/team-memberships"
import type { TeamRow, TeamMembershipRow, TeamRole, TeamMember } from "@/types/pocketbase"

const MY_TEAMS_KEY = "my-teams"
const TEAM_MEMBERS_KEY = "team-members"
const MY_MEMBERSHIPS_KEY = "my-memberships"

// ─── Queries ──────────────────────────────────────

export function useMyTeams() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: [MY_TEAMS_KEY, userId],
    queryFn: () => teamsService.getMyTeams(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useUserTeams() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ["user-teams", userId],
    queryFn: () => teamsService.getUserTeams(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: [TEAM_MEMBERS_KEY, teamId],
    queryFn: () => membershipsService.getTeamMembers(teamId!),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 1,
  })
}

export function useMyMemberships() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: [MY_MEMBERSHIPS_KEY, userId],
    queryFn: () => membershipsService.getMyMemberships(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })
}

// ─── Mutations ────────────────────────────────────

export function useCreateTeam() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      teamsService.createTeam(data.name, data.description, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MY_TEAMS_KEY] })
      queryClient.invalidateQueries({ queryKey: [MY_MEMBERSHIPS_KEY] })
    },
  })
}

export function useUpdateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { teamId: string; name?: string; description?: string }) =>
      teamsService.updateTeam(data.teamId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MY_TEAMS_KEY] }),
  })
}

export function useDeleteTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (teamId: string) => teamsService.deleteTeam(teamId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MY_TEAMS_KEY] }),
  })
}

export function useAddTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { teamId: string; userId: string; role: TeamRole; position?: string }) =>
      membershipsService.addMember(data.teamId, data.userId, data.role, data.position),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TEAM_MEMBERS_KEY, variables.teamId] })
      queryClient.invalidateQueries({ queryKey: ["coach-dashboard"] })
    },
  })
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { membershipId: string; teamId: string }) =>
      membershipsService.removeMember(data.membershipId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TEAM_MEMBERS_KEY, variables.teamId] })
      queryClient.invalidateQueries({ queryKey: ["coach-dashboard"] })
    },
  })
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { membershipId: string; role: TeamRole; position?: string }) =>
      membershipsService.updateMemberRole(data.membershipId, data.role, data.position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MY_TEAMS_KEY] })
      queryClient.invalidateQueries({ queryKey: [TEAM_MEMBERS_KEY] })
    },
  })
}

export function useCreateInvite() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: (data: { teamId: string; role: TeamRole; maxUses?: number; expiresAt?: string }) => {
      const { createInvite } = require("@/lib/pocketbase/services/team-invites")
      return createInvite(data.teamId, data.role, userId!, data.maxUses, data.expiresAt)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [MY_TEAMS_KEY] }),
  })
}

export type { TeamRow, TeamMember, TeamRole }
