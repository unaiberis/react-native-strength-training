import { pb } from "../client";
import type { WorkoutFeedbackRow } from "../../../types/pocketbase";

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
