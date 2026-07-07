/**
 * OfflineFeedbackService — athlete workout feedback for offline use.
 *
 * Writes feedback to local SQLite AND enqueues the corresponding CREATE
 * change so the SyncEngine can replay it when the device regains connectivity.
 *
 * Follows the dual-write pattern established by OfflineSessionsService.
 */

import type { SQLiteDatabase } from "expo-sqlite";
import type { ChangeQueue } from "../change-queue";
import { generateId } from "../uuid";

// ─── Input Type ──────────────────────────────────────────────────────────

export interface FeedbackInput {
  sessionId: string;
  athleteId: string;
  coachId?: string | null;
  rating: number;
  notes?: string | null;
}

export class OfflineFeedbackService {
  constructor(
    private db: SQLiteDatabase,
    private changeQueue: ChangeQueue,
  ) {}

  /**
   * Submit feedback for a completed workout.
   *
   * Writes to `workout_feedback` and enqueues a CREATE change.
   */
  async submitFeedback(input: FeedbackInput): Promise<void> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO workout_feedback (id, local_id, session_id, athlete_id, coach_id, rating, notes, synced, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        id,
        id,
        input.sessionId,
        input.athleteId,
        input.coachId ?? null,
        input.rating,
        input.notes ?? null,
        now,
      ],
    );

    await this.changeQueue.enqueue({
      action: "create",
      collection: "workout_feedback",
      localId: id,
      data: {
        session_id: input.sessionId,
        athlete_id: input.athleteId,
        coach_id: input.coachId ?? null,
        rating: input.rating,
        notes: input.notes ?? null,
        created_at: now,
      },
    });
  }
}
