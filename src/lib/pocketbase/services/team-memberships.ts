import { pb } from "../client";
import type { TeamMembershipRow, TeamMember, TeamRole } from "../../../types/pocketbase";

/**
 * Get all membership records for a specific team.
 */
export async function getTeamMemberships(teamId: string): Promise<TeamMembershipRow[]> {
  try {
    const records = await pb.collection("team_memberships").getFullList({
      filter: `team_id = '${teamId}'`,
      $autoCancel: false,
    });
    return (records ?? []) as unknown as TeamMembershipRow[];
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch team memberships");
  }
}

/**
 * Get all memberships for a specific user.
 */
export async function getMyMemberships(userId: string): Promise<TeamMembershipRow[]> {
  try {
    const records = await pb.collection("team_memberships").getFullList({
      filter: `user_id = '${userId}'`,
      $autoCancel: false,
    });
    return (records ?? []) as unknown as TeamMembershipRow[];
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch my memberships");
  }
}

/**
 * Get all members of a team, optionally filtered by role, with user details expanded.
 */
export async function getTeamMembers(
  teamId: string,
  role?: TeamRole,
): Promise<TeamMember[]> {
  try {
    let filter = `team_id = '${teamId}'`;
    if (role) {
      filter += ` && role = '${role}'`;
    }

    const records = await pb.collection("team_memberships").getFullList({
      filter,
      expand: "user_id",
      fields: "id,user_id,team_id,role,position,joined_at,created,updated,expand.user_id.id,expand.user_id.email,expand.user_id.name,expand.user_id.displayName,expand.user_id.avatar",
      $autoCancel: false,
    });

    // Detect if any expands returned undefined (blocked by API rules)
    const hasExpandData = records?.some((r: any) => r.expand?.user_id != null);

    // If expand was blocked for some users, batch-fetch user records directly
    let userMap = new Map<string, { name?: string; email?: string; avatar?: string | null }>();
    if (!hasExpandData && records?.length) {
      const userIds = [...new Set(records.map((r: any) => r.user_id).filter(Boolean))];
      try {
        const users = await pb.collection("users").getFullList({
          filter: userIds.map((id) => `id = '${id}'`).join(" || "),
          fields: "id,email,name,displayName,avatar",
          requestKey: null,
          $autoCancel: false,
        });
        for (const u of (users ?? []) as any[]) {
          userMap.set(u.id, { name: u.displayName ?? u.name, email: u.email, avatar: u.avatar });
        }
        if (__DEV__) {
          console.log(`[getTeamMembers] batch-fetched ${userMap.size} users (${userIds.length - userMap.size} missing — blocked by API rules)`);
        }
      } catch {
        // Batch fetch also blocked — warn and fall through
        if (__DEV__) console.warn("[getTeamMembers] batch user fetch blocked by PocketBase API rules");
      }
    }

    if (__DEV__) {
      records?.forEach((r: any) => {
        const expandOk = r.expand?.user_id != null;
        console.log(
          `[getTeamMembers] membership=${r.id} user_id=${r.user_id} expand=${expandOk ? "OK" : "BLOCKED"}`,
        );
      });
    }

    return (records ?? []).map((r: any) => {
      const user = r.expand?.user_id ?? userMap.get(r.user_id) ?? {};
      const userName = user.displayName ?? user.name ?? user.email ?? `User ${r.user_id.slice(0, 6)}`;
      const userEmail = user.email ?? "";
      return {
        id: r.id,
        user_id: r.user_id,
        team_id: r.team_id,
        role: r.role,
        position: r.position ?? null,
        joined_at: r.joined_at,
        created: r.created,
        updated: r.updated,
        user_name: userName,
        user_email: userEmail,
        user_avatar: user.avatar ?? null,
      } as TeamMember;
    });
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch team members");
  }
}

/**
 * Add a user as a member of a team with a given role.
 */
export async function addMember(
  teamId: string,
  userId: string,
  role: TeamRole,
  position?: string,
): Promise<TeamMembershipRow> {
  try {
    const record = await pb.collection("team_memberships").create({
      user_id: userId,
      team_id: teamId,
      role,
      position: position ?? null,
    });
    return record as unknown as TeamMembershipRow;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to add team member");
  }
}

/**
 * Remove a member from a team by membership record ID.
 */
export async function removeMember(membershipId: string): Promise<void> {
  try {
    await pb.collection("team_memberships").delete(membershipId);
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to remove team member");
  }
}

/**
 * Update a member's role and/or position within a team.
 */
export async function updateMemberRole(
  membershipId: string,
  role: TeamRole,
  position?: string,
): Promise<TeamMembershipRow> {
  try {
    const record = await pb.collection("team_memberships").update(membershipId, {
      role,
      position: position ?? null,
    });
    return record as unknown as TeamMembershipRow;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to update member role");
  }
}

/**
 * Get all athlete IDs across teams where the user is a coach or admin.
 */
export async function getMyAthleteIds(userId: string): Promise<string[]> {
  try {
    const memberships = await pb.collection("team_memberships").getFullList({
      filter: `user_id = '${userId}' && (role = 'coach' || role = 'admin')`,
      $autoCancel: false,
    });

    if (memberships.length === 0) return [];

    const teamIds = memberships.map((m: any) => m.team_id);
    const teamFilter = teamIds.map((id: string) => `team_id = '${id}'`).join(" || ");

    const athleteMemberships = await pb.collection("team_memberships").getFullList({
      filter: `(${teamFilter}) && role = 'athlete'`,
      $autoCancel: false,
    });

    return [...new Set(athleteMemberships.map((m: any) => m.user_id))] as string[];
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch athlete IDs");
  }
}

/**
 * Get the user's role within a specific team, or null if not a member.
 */
export async function getMyRoleInTeam(
  userId: string,
  teamId: string,
): Promise<TeamRole | null> {
  try {
    const records = await pb.collection("team_memberships").getFullList({
      filter: `user_id = '${userId}' && team_id = '${teamId}'`,
      $autoCancel: false,
    });
    if (records.length === 0) return null;
    return (records[0] as any).role as TeamRole;
  } catch {
    return null;
  }
}

/**
 * Get all team IDs where the user has a specific role.
 */
export async function getMyTeamIdsByRole(
  userId: string,
  role: TeamRole,
): Promise<string[]> {
  try {
    const records = await pb.collection("team_memberships").getFullList({
      filter: `user_id = '${userId}' && role = '${role}'`,
      $autoCancel: false,
    });
    return records.map((r: any) => r.team_id);
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch team IDs by role");
  }
}
