import { pb } from "../client";
import type { TeamRow, UserTeam } from "../../../types/pocketbase";

/**
 * Get all teams for a specific user based on their memberships.
 */
export async function getMyTeams(userId: string): Promise<TeamRow[]> {
  try {
    const memberships = await pb.collection("team_memberships").getFullList({
      filter: `user_id = '${userId}'`,
      expand: "team_id",
      $autoCancel: false,
    });

    if (memberships.length === 0) return [];

    const teams = memberships.map((m: any) => m.expand?.team_id).filter(Boolean);
    return teams as unknown as TeamRow[];
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch my teams");
  }
}

/**
 * Get a single team by its ID.
 */
export async function getTeamById(teamId: string): Promise<TeamRow> {
  try {
    const record = await pb.collection("teams").getOne(teamId);
    return record as unknown as TeamRow;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch team");
  }
}

/**
 * Create a new team and automatically add the creator as an admin member.
 */
export async function createTeam(
  name: string,
  description: string | undefined,
  userId: string,
): Promise<TeamRow> {
  try {
    const record = await pb.collection("teams").create({
      name,
      description: description ?? null,
      created_by: userId,
    });

    // Add creator as admin member
    await pb.collection("team_memberships").create({
      user_id: userId,
      team_id: record.id,
      role: "admin",
    });

    return record as unknown as TeamRow;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to create team");
  }
}

/**
 * Update a team's name and/or description.
 */
export async function updateTeam(
  teamId: string,
  data: Partial<Pick<TeamRow, "name" | "description">>,
): Promise<TeamRow> {
  try {
    const record = await pb.collection("teams").update(teamId, data);
    return record as unknown as TeamRow;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to update team");
  }
}

/**
 * Delete a team by its ID.
 */
export async function deleteTeam(teamId: string): Promise<void> {
  try {
    await pb.collection("teams").delete(teamId);
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to delete team");
  }
}

/**
 * Get a user's teams enriched with their role, member/athlete/coach counts,
 * and the list of coaches/admins per team.
 *
 * Optimised: 2 queries total regardless of team count.
 */
export async function getUserTeams(userId: string): Promise<UserTeam[]> {
  try {
    // 1. Get my memberships → team info + my role
    const memberships = await pb.collection("team_memberships").getFullList({
      filter: `user_id = '${userId}'`,
      expand: "team_id",
      $autoCancel: false,
    });

    if (memberships.length === 0) return [];

    const teamIds = memberships.map((m: any) => m.expand?.team_id?.id).filter(Boolean) as string[];
    if (teamIds.length === 0) return [];

    // 2. Get ALL members across those teams in a single query with user expand
    const teamFilter = teamIds.map((id: string) => `team_id = '${id}'`).join(" || ");
    const allMembers = await pb.collection("team_memberships").getFullList({
      filter: teamFilter,
      expand: "user_id",
      $autoCancel: false,
    });

    // Group members by team_id
    const membersByTeam = new Map<string, any[]>();
    for (const m of allMembers) {
      const tid = m.team_id as string;
      if (!membersByTeam.has(tid)) membersByTeam.set(tid, []);
      membersByTeam.get(tid)!.push(m);
    }

    // Build results
    const results: UserTeam[] = [];

    for (const m of memberships) {
      const team = (m as any).expand?.team_id;
      if (!team) continue;

      const tmMembers = membersByTeam.get(team.id) ?? [];
      const memberCount = tmMembers.length;
      const athleteCount = tmMembers.filter((mm: any) => mm.role === "athlete").length;
      const coachCount = tmMembers.filter((mm: any) => mm.role === "coach" || mm.role === "admin").length;

      // Extract coach/admins for inline display
      const coaches: { id: string; displayName: string; email: string }[] = [];
      const seenIds = new Set<string>();
      for (const mm of tmMembers) {
        const role = mm.role as string;
        if (role !== "coach" && role !== "admin") continue;
        const user = (mm as any).expand?.user_id;
        if (user && !seenIds.has(user.id)) {
          seenIds.add(user.id);
          coaches.push({
            id: user.id,
            displayName: user.displayName ?? user.email?.split("@")[0] ?? "Coach",
            email: user.email ?? "",
          });
        }
      }

      results.push({
        id: team.id,
        name: team.name,
        description: team.description ?? null,
        created_by: team.created_by,
        created: team.created,
        updated: team.updated,
        membership_role: m.role,
        membership_position: m.position ?? null,
        member_count: memberCount,
        athlete_count: athleteCount,
        coach_count: coachCount,
        coaches,
      });
    }

    return results;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch user teams");
  }
}
