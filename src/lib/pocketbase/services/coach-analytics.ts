import { pb } from "../client";
import type {
  VolumeDataPoint,
  ComplianceDataPoint,
  PREvolutionPoint,
  ExerciseSetRow,
} from "../../../types/pocketbase";
import { calculateE1RM } from "../../../shared/utils/pr-calc";

/**
 * Get volume-over-time data for an athlete.
 * Returns weekly aggregated total volume (kg × reps) for the past N weeks.
 */
export async function getVolumeHistory(
  athleteId: string,
  weeks = 12,
): Promise<VolumeDataPoint[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    const sinceStr = since.toISOString();

    const sessions = await pb.collection("workout_sessions").getFullList({
      filter: `user_id = '${athleteId}' && status = 'completed' && started_at >= '${sinceStr}'`,
      sort: "started_at",
      fields: "id,started_at",
    });

    if (sessions.length === 0) return [];

    // Group sessions by ISO week
    const weekGroups = new Map<string, { ids: string[]; volume: number; count: number }>();

    for (const s of sessions) {
      const d = new Date(s.started_at);
      const weekStart = getWeekStart(d);
      const group = weekGroups.get(weekStart) ?? { ids: [], volume: 0, count: 0 };
      group.ids.push(s.id);
      group.count++;
      weekGroups.set(weekStart, group);
    }

    // Fetch sets for all sessions and aggregate volume
    for (const [weekStart, group] of weekGroups) {
      let volume = 0;
      const BATCH = 50;
      for (let i = 0; i < group.ids.length; i += BATCH) {
        const chunk = group.ids.slice(i, i + BATCH);
        const filter = chunk
          .map((id) => `workout_session_id = '${id}'`)
          .join(" || ");
        const sets: any[] = await pb.collection("exercise_sets").getFullList({
          filter,
          fields: "weight_kg,reps",
        });
        for (const set of sets) {
          volume += (set.weight_kg ?? 0) * (set.reps ?? 0);
        }
      }
      group.volume = Math.round(volume * 100) / 100;
    }

    return [...weekGroups.entries()]
      .map(([weekStart, group]) => ({
        date: weekStart,
        totalVolumeKg: group.volume,
        sessionCount: group.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch volume history");
  }
}

/**
 * Get weekly compliance rate for an athlete.
 * Ratio of completed sessions to total assigned sessions per week.
 */
export async function getComplianceHistory(
  athleteId: string,
  weeks = 12,
): Promise<ComplianceDataPoint[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    const sinceStr = since.toISOString();

    const allSessions = await pb.collection("workout_sessions").getFullList({
      filter: `user_id = '${athleteId}' && started_at >= '${sinceStr}'`,
      sort: "started_at",
      fields: "id,started_at,status",
    });

    if (allSessions.length === 0) return [];

    // Group by ISO week
    const weekGroups = new Map<
      string,
      { assigned: number; completed: number }
    >();

    for (const s of allSessions) {
      const d = new Date(s.started_at);
      const weekStart = getWeekStart(d);
      const group = weekGroups.get(weekStart) ?? { assigned: 0, completed: 0 };
      group.assigned++;
      if (s.status === "completed") group.completed++;
      weekGroups.set(weekStart, group);
    }

    return [...weekGroups.entries()]
      .map(([weekStart, group]) => ({
        weekStart,
        assigned: group.assigned,
        completed: group.completed,
        rate:
          group.assigned > 0
            ? Math.round((group.completed / group.assigned) * 100) / 100
            : 0,
      }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch compliance history");
  }
}

/**
 * Get PR evolution data for all exercises performed by an athlete.
 * Returns the best estimated 1RM per exercise per session over time.
 */
export async function getPREvolution(
  athleteId: string,
  weeks = 24,
): Promise<PREvolutionPoint[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    const sinceStr = since.toISOString();

    // Get athlete's sessions
    const sessions = await pb.collection("workout_sessions").getFullList({
      filter: `user_id = '${athleteId}' && status = 'completed' && started_at >= '${sinceStr}'`,
      sort: "started_at",
      fields: "id,started_at",
    });

    if (sessions.length === 0) return [];

    const sessionIds = sessions.map((s) => s.id);
    const sessionDateMap = new Map<string, string>();
    for (const s of sessions) {
      sessionDateMap.set(s.id, s.started_at);
    }

    // Fetch all sets for these sessions
    let allSets: ExerciseSetRow[] = [];
    const BATCH = 50;
    for (let i = 0; i < sessionIds.length; i += BATCH) {
      const chunk = sessionIds.slice(i, i + BATCH);
      const filter = chunk
        .map((id) => `workout_session_id = '${id}'`)
        .join(" || ");
      const sets: any[] = await pb.collection("exercise_sets").getFullList({
        filter: `${filter} && is_warmup = false && weight_kg > 0 && reps > 0`,
        sort: "logged_at",
      });
      allSets.push(...(sets as unknown as ExerciseSetRow[]));
    }

    if (allSets.length === 0) return [];

    // Fetch exercise names
    const exerciseIds = [...new Set(allSets.map((s) => s.exercise_id))];
    const exRecords: any[] = await pb.collection("exercises").getFullList({
      filter: exerciseIds.map((id) => `id = '${id}'`).join(" || "),
      fields: "id,name",
    });
    const nameMap = new Map<string, string>();
    for (const ex of exRecords ?? []) {
      nameMap.set(ex.id, ex.name);
    }

    // Group by exercise, then by session, take best e1RM per session
    const byExercise = new Map<string, Map<string, number>>();
    for (const set of allSets) {
      if (set.weight_kg <= 0 || set.reps <= 0) continue;
      const e1rm = calculateE1RM(set.weight_kg, set.reps);
      const exSessions =
        byExercise.get(set.exercise_id) ?? new Map<string, number>();
      const current = exSessions.get(set.workout_session_id) ?? 0;
      if (e1rm > current) {
        exSessions.set(set.workout_session_id, e1rm);
      }
      byExercise.set(set.exercise_id, exSessions);
    }

    // Flatten to points
    const points: PREvolutionPoint[] = [];
    for (const [exerciseId, exSessions] of byExercise) {
      for (const [sessionId, value] of exSessions) {
        points.push({
          date: sessionDateMap.get(sessionId) ?? "",
          value: Math.round(value * 100) / 100,
          exerciseName: nameMap.get(exerciseId) ?? "Unknown",
        });
      }
    }

    return points.sort((a, b) => a.date.localeCompare(b.date));
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch PR evolution");
  }
}

/**
 * Get the Monday 00:00:00 of the week containing the given date,
 * as an ISO string.
 */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
