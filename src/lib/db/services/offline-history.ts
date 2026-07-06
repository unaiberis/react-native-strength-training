/**
 * OfflineHistoryService — workout history operations for offline use.
 *
 * Provides session detail reads and session deletion from local SQLite.
 * Formalises what was previously ad-hoc SQLite queries in useHistory.
 */

import type { SQLiteDatabase } from "expo-sqlite";
import type { ChangeQueue } from "../change-queue";
import type { WorkoutSessionRow, ExerciseSetRow } from "../types";

export interface SessionDetail {
  session: WorkoutSessionRow;
  sets: ExerciseSetRow[];
}

export class OfflineHistoryService {
  constructor(
    private db: SQLiteDatabase,
    private changeQueue: ChangeQueue,
  ) {}

  /**
   * Retrieve all completed sessions, ordered by started_at descending.
   */
  async getCompletedSessions(): Promise<WorkoutSessionRow[]> {
    return this.db.getAllAsync<WorkoutSessionRow>(
      "SELECT * FROM workout_sessions WHERE status = 'completed' ORDER BY started_at DESC",
    );
  }

  /**
   * Retrieve a session with all its sets.
   *
   * Returns `null` when the session does not exist.
   */
  async getSessionDetail(sessionId: string): Promise<SessionDetail | null> {
    const session = await this.db.getFirstAsync<WorkoutSessionRow>(
      "SELECT * FROM workout_sessions WHERE id = ?",
      [sessionId],
    );

    if (!session) return null;

    const sets = await this.db.getAllAsync<ExerciseSetRow>(
      "SELECT * FROM exercise_sets WHERE session_id = ? ORDER BY set_number ASC",
      [sessionId],
    );

    return { session, sets };
  }

  /**
   * Delete a completed session and all its sets locally, then enqueue
   * a DELETE change so the server is updated on next sync.
   *
   * Deletes child rows first (FK constraint), then the session itself.
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Delete sets first (FK constraint)
    await this.db.runAsync(
      "DELETE FROM exercise_sets WHERE session_id = ?",
      [sessionId],
    );

    // Delete the session itself
    await this.db.runAsync(
      "DELETE FROM workout_sessions WHERE id = ?",
      [sessionId],
    );

    await this.changeQueue.enqueue({
      action: "delete",
      collection: "workout_sessions",
      recordId: sessionId,
    });
  }
}
