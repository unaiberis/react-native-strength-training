import { pb } from "../client";
import type { TeamInviteRow, TeamMembershipRow, TeamRole } from "../../../types/pocketbase";

/**
 * Create a new invite link for a team.
 */
export async function createInvite(
  teamId: string,
  role: TeamRole,
  userId: string,
  maxUses?: number,
  expiresAt?: string,
): Promise<TeamInviteRow> {
  try {
    const record = await pb.collection("team_invites").create({
      team_id: teamId,
      code: generateInviteCode(),
      role,
      max_uses: maxUses ?? null,
      used_count: 0,
      expires_at: expiresAt ?? null,
      created_by: userId,
    });
    return record as unknown as TeamInviteRow;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to create invite");
  }
}

/**
 * Retrieve an invite by its code.
 */
export async function getInviteByCode(code: string): Promise<TeamInviteRow | null> {
  try {
    const records = await pb.collection("team_invites").getFullList({
      filter: `code = '${code}'`,
      $autoCancel: false,
    });
    if (records.length === 0) return null;
    return records[0] as unknown as TeamInviteRow;
  } catch {
    return null;
  }
}

/**
 * Join a team using an invite code.
 * Validates the invite (not expired, not over max_uses), creates the membership,
 * and increments the used_count.
 */
export async function joinTeamByInvite(
  code: string,
  userId: string,
): Promise<TeamMembershipRow> {
  try {
    const invite = await getInviteByCode(code);
    if (!invite) {
      throw new Error("Invalid invite code");
    }

    // Check expiration
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw new Error("Invite has expired");
    }

    // Check max uses
    if (invite.max_uses !== null && invite.used_count >= invite.max_uses) {
      throw new Error("Invite has reached maximum uses");
    }

    // Create membership
    const membership = await pb.collection("team_memberships").create({
      user_id: userId,
      team_id: invite.team_id,
      role: invite.role,
    });

    // Increment used count
    await pb.collection("team_invites").update(invite.id, {
      used_count: (invite.used_count ?? 0) + 1,
    });

    return membership as unknown as TeamMembershipRow;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to join team by invite");
  }
}

/**
 * Get all invites for a specific team.
 */
export async function getTeamInvites(teamId: string): Promise<TeamInviteRow[]> {
  try {
    const records = await pb.collection("team_invites").getFullList({
      filter: `team_id = '${teamId}'`,
      sort: "-created",
      $autoCancel: false,
    });
    return (records ?? []) as unknown as TeamInviteRow[];
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch team invites");
  }
}

/**
 * Generate a short random alphanumeric invite code.
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
