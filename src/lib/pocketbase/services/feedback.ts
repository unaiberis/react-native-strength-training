import { pb } from "../client";
import type { WorkoutFeedbackRow, AthleteSummary } from "../../../types/pocketbase";

// ─── Input Types ─────────────────────────────────────────────────────────

export interface FeedbackInput {
  sessionId: string;
  athleteId: string;
  coachId?: string | null;
  rating: number;
  notes?: string | null;
}

// ─── Submit Feedback ─────────────────────────────────────────────────────

/**
 * Submit feedback for a completed workout.
 *
 * Persists to PocketBase `workout_feedback` collection.
 * Throws on failure.
 */
export async function submitFeedback(
  input: FeedbackInput,
): Promise<WorkoutFeedbackRow> {
  try {
    const record = await pb.collection("workout_feedback").create({
      session_id: input.sessionId,
      athlete_id: input.athleteId,
      coach_id: input.coachId ?? null,
      rating: input.rating,
      notes: input.notes ?? null,
    });

    if (!record) throw new Error("Failed to submit feedback");
    return record as unknown as WorkoutFeedbackRow;
  } catch (err: any) {
    throw new Error(
      "Failed to submit feedback: " + (err.message ?? String(err)),
    );
  }
}

// ─── List Feedback ───────────────────────────────────────────────────────

/**
 * List feedback entries for a given athlete, newest first.
 */
export async function listFeedback(
  athleteId: string,
): Promise<WorkoutFeedbackRow[]> {
  try {
    const records = await pb.collection("workout_feedback").getFullList({
      filter: `athlete_id = '${athleteId}'`,
      sort: "-created_at",
    });
    return (records ?? []) as unknown as WorkoutFeedbackRow[];
  } catch (err: any) {
    throw new Error(
      "Failed to list feedback: " + (err.message ?? String(err)),
    );
  }
}

/**
 * Get feedback counts for a list of athlete IDs.
 * Returns a map of athlete_id → total feedback count.
 * Lightweight — only fetches ids + athlete_id fields.
 */
export async function getFeedbackCountsForAthletes(
  athleteIds: string[],
): Promise<Map<string, number>> {
  if (athleteIds.length === 0) return new Map();
  try {
    const uniqueIds = [...new Set(athleteIds)];
    const filter = uniqueIds.map((id) => `athlete_id = '${id}'`).join(" || ");
    const records = await pb.collection("workout_feedback").getFullList({
      filter,
      fields: "id,athlete_id",
      $autoCancel: false,
    });
    const counts = new Map<string, number>();
    for (const r of records as any[]) {
      counts.set(r.athlete_id, (counts.get(r.athlete_id) ?? 0) + 1);
    }
    return counts;
  } catch {
    return new Map();
  }
}
