import { pb } from "../client";
import type { UserRow, AthleteSummary } from "../../../types/pocketbase";

/**
 * List all athletes across teams where the user is a coach or admin.
 * Uses team-based filtering instead of the deprecated `coach` field.
 */
export async function listAthletes(userId: string): Promise<AthleteSummary[]> {
  try {
    // Step 1: Get memberships where user is coach or admin
    const memberships = await pb.collection("team_memberships").getFullList({
      filter: `user_id = '${userId}' && (role = 'coach' || role = 'admin')`,
      $autoCancel: false,
    });
    if (memberships.length === 0) return [];

    const teamIds = memberships.map((m: any) => m.team_id);
    const teamFilter = teamIds.map((id: string) => `team_id = '${id}'`).join(" || ");

    // Step 2: Get athlete memberships in those teams
    const athleteMemberships = await pb.collection("team_memberships").getFullList({
      filter: `(${teamFilter}) && role = 'athlete'`,
      expand: "user_id",
      $autoCancel: false,
    });

    // Step 3: Unique athlete IDs
    const athleteIds = [...new Set(athleteMemberships.map((m: any) => m.user_id))] as string[];
    if (athleteIds.length === 0) return [];

    // Step 4: Fetch user records and enrich with stats
    const userFilter = athleteIds.map((id: string) => `id = '${id}'`).join(" || ");
    const users = await pb.collection("users").getFullList({
      filter: userFilter,
      sort: "displayName",
    });

    const athleteRows = (users ?? []) as unknown as UserRow[];

    // Enrich each athlete with workout stats
    const summaries = await Promise.all(
      athleteRows.map(async (user) => {
        const sessions = await pb.collection("workout_sessions").getFullList({
          filter: `user_id = '${user.id}' && status = 'completed'`,
          sort: "-started_at",
          fields: "id,started_at",
        });

        const totalWorkouts = sessions.length;

        // This week boundary
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString();
        const thisWeekWorkouts = sessions.filter(
          (s: any) => s.started_at >= weekAgoStr,
        ).length;

        const lastWorkoutDate =
          sessions.length > 0 ? sessions[0].started_at : null;

        // Total volume: sum of all set volumes
        const sessionIds = sessions.map((s: any) => s.id);
        let totalVolumeKg = 0;
        const BATCH = 50;
        for (let i = 0; i < sessionIds.length; i += BATCH) {
          const chunk = sessionIds.slice(i, i + BATCH);
          const filter = chunk
            .map((id: string) => `workout_session_id = '${id}'`)
            .join(" || ");
          const sets = await pb.collection("exercise_sets").getFullList({
            filter,
            fields: "weight_kg,reps",
          });
          for (const s of sets) {
            totalVolumeKg += (s.weight_kg ?? 0) * (s.reps ?? 0);
          }
        }

        // Compliance: very basic — ratio of completed to total assigned sessions
        const assignedSessions = await pb
          .collection("workout_sessions")
          .getFullList({
            filter: `user_id = '${user.id}'`,
            fields: "id,status",
          });
        const totalAssigned = assignedSessions.length;
        const complianceRate =
          totalAssigned > 0 ? totalWorkouts / totalAssigned : 0;

        return {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          lastWorkoutDate,
          totalWorkouts,
          thisWeekWorkouts,
          complianceRate: Math.round(complianceRate * 100) / 100,
          totalVolumeKg: Math.round(totalVolumeKg * 100) / 100,
        };
      }),
    );

    return summaries;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch athletes");
  }
}

/**
 * Get a single athlete's profile by user ID.
 */
export async function getAthlete(userId: string): Promise<UserRow | null> {
  try {
    const record = await pb.collection("users").getOne(userId);
    return record as unknown as UserRow;
  } catch (err: any) {
    if (
      err?.status === 404 ||
      err?.message?.includes("The requested resource wasn't found")
    ) {
      return null;
    }
    throw new Error(err.message ?? "Failed to fetch athlete");
  }
}

/**
 * Get the coach(es) for a given athlete by looking at their team memberships.
 * Returns the user records of team members with "coach" or "admin" roles
 * in any team the athlete belongs to.
 */
export async function getAthleteCoach(
  userId: string,
): Promise<{ id: string; displayName: string; email: string }[]> {
  try {
    // Step 1: Get athlete's team memberships
    const memberships = await pb.collection("team_memberships").getFullList({
      filter: `user_id = '${userId}'`,
      $autoCancel: false,
    });
    if (memberships.length === 0) return [];

    const teamIds = [...new Set(memberships.map((m: any) => m.team_id))] as string[];
    const teamFilter = teamIds.map((id: string) => `team_id = '${id}'`).join(" || ");

    // Step 2: Get coach/admin members in those teams
    const coachMemberships = await pb.collection("team_memberships").getFullList({
      filter: `(${teamFilter}) && (role = 'coach' || role = 'admin')`,
      expand: "user_id",
      $autoCancel: false,
    });
    if (coachMemberships.length === 0) return [];

    // Step 3: Unique coach user IDs
    const coachIds = [
      ...new Set(coachMemberships.map((m: any) => m.user_id)),
    ] as string[];

    // Step 4: Fetch user records
    const userFilter = coachIds.map((id: string) => `id = '${id}'`).join(" || ");
    const users = await pb.collection("users").getFullList({
      filter: userFilter,
      $autoCancel: false,
    });

    return (users ?? []).map((u: any) => ({
      id: u.id,
      displayName: u.displayName ?? u.email?.split("@")[0] ?? "Coach",
      email: u.email ?? "",
    }));
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch athlete's coach");
  }
}

/**
 * Unlink an athlete from a team by removing their team membership.
 */
export async function unlinkAthlete(athleteId: string, teamId?: string): Promise<void> {
  try {
    const filter = teamId
      ? `user_id = '${athleteId}' && team_id = '${teamId}'`
      : `user_id = '${athleteId}'`;
    const memberships = await pb.collection("team_memberships").getFullList({
      filter,
      $autoCancel: false,
    });
    for (const m of memberships) {
      await pb.collection("team_memberships").delete(m.id);
    }
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to unlink athlete");
  }
}
