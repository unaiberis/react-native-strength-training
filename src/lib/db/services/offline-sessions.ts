/**
 * OfflineSessionsService — workout session operations for offline use.
 *
 * Writes session and set data to local SQLite AND enqueues the
 * corresponding change so the SyncEngine can replay it when the
 * device regains connectivity.
 *
 * This is a local-first service: the local write is authoritative
 * for the offline period. On sync, server-assigned IDs replace
 * local UUIDs and child FK references are remapped accordingly.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { ChangeQueue } from '../change-queue';
import { generateId } from '../uuid';
import type {
  WorkoutSessionRow,
  ExerciseSetRow,
  LogSetInput,
  CompleteSessionInput,
} from '../types';

export class OfflineSessionsService {
  constructor(
    private db: SQLiteDatabase,
    private changeQueue: ChangeQueue
  ) {}

  /**
   * Create a new workout session locally.
   *
   * Writes to `workout_sessions` and enqueues a CREATE change.
   * Returns the inserted session row.
   */
  async createSession(
    userId: string,
    templateId?: string
  ): Promise<WorkoutSessionRow> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO workout_sessions (id, local_id, user_id, template_id, status, started_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [id, id, userId, templateId ?? null, 'active', now]
    );

    await this.changeQueue.enqueue({
      action: 'create',
      collection: 'workout_sessions',
      localId: id,
      data: {
        user_id: userId,
        template_id: templateId ?? null,
        status: 'active',
        started_at: now,
      },
    });

    return {
      id,
      local_id: id,
      user_id: userId,
      template_id: templateId ?? null,
      status: 'active',
      started_at: now,
      completed_at: null,
      duration_seconds: null,
      notes: null,
      dirty: 1,
      synced_at: null,
    };
  }

  /**
   * Log a set against an active session.
   *
   * Writes to `exercise_sets` and enqueues a CREATE change.
   * Returns the inserted set row.
   */
  async logSet(sessionId: string, input: LogSetInput): Promise<ExerciseSetRow> {
    const id = generateId();

    await this.db.runAsync(
      `INSERT INTO exercise_sets (id, local_id, session_id, exercise_id, set_number, weight_kg, reps, rpe, rir, is_warmup, tempo, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        id,
        sessionId,
        input.exerciseId,
        input.setNumber,
        input.weightKg,
        input.reps,
        input.rpe ?? null,
        input.rir ?? null,
        input.isWarmup ? 1 : 0,
        input.tempo ?? null,
      ]
    );

    await this.changeQueue.enqueue({
      action: 'create',
      collection: 'exercise_sets',
      localId: id,
      data: {
        session_id: sessionId,
        exercise_id: input.exerciseId,
        set_number: input.setNumber,
        weight_kg: input.weightKg,
        reps: input.reps,
        rpe: input.rpe ?? null,
        rir: input.rir ?? null,
        is_warmup: input.isWarmup ?? false,
        tempo: input.tempo ?? null,
        logged_at: input.loggedAt ?? new Date().toISOString(),
      },
    });

    return {
      id,
      local_id: id,
      session_id: sessionId,
      exercise_id: input.exerciseId,
      set_number: input.setNumber,
      weight_kg: input.weightKg,
      reps: input.reps,
      rpe: input.rpe ?? null,
      rir: input.rir ?? null,
      is_warmup: input.isWarmup ? 1 : 0,
      tempo: input.tempo ?? null,
      dirty: 1,
      synced_at: null,
    };
  }

  /**
   * Mark a session as completed.
   *
   * Updates the local row and enqueues an UPDATE change.
   */
  async completeSession(
    sessionId: string,
    input?: CompleteSessionInput
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.db.runAsync(
      `UPDATE workout_sessions SET status = 'completed', completed_at = ?, duration_seconds = ?, notes = ?, dirty = 1 WHERE id = ?`,
      [now, input?.durationSeconds ?? null, input?.notes ?? null, sessionId]
    );

    await this.changeQueue.enqueue({
      action: 'update',
      collection: 'workout_sessions',
      recordId: sessionId,
      data: {
        status: 'completed',
        completed_at: now,
        duration_seconds: input?.durationSeconds ?? null,
        notes: input?.notes ?? null,
      },
    });
  }

  /**
   * Cancel an active session.
   *
   * Updates the local row and enqueues an UPDATE change.
   */
  async cancelSession(sessionId: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE workout_sessions SET status = 'cancelled', dirty = 1 WHERE id = ?`,
      [sessionId]
    );

    await this.changeQueue.enqueue({
      action: 'update',
      collection: 'workout_sessions',
      recordId: sessionId,
      data: { status: 'cancelled' },
    });
  }

  /**
   * Retrieve the currently active session, or `null` if none exists.
   */
  async getActiveSession(): Promise<WorkoutSessionRow | null> {
    const row = await this.db.getFirstAsync<WorkoutSessionRow>(
      "SELECT * FROM workout_sessions WHERE status = 'active' LIMIT 1"
    );
    return row ?? null;
  }

  /**
   * Retrieve all sets logged for a session, ordered by set_number.
   */
  async getSessionSets(sessionId: string): Promise<ExerciseSetRow[]> {
    return this.db.getAllAsync<ExerciseSetRow>(
      'SELECT * FROM exercise_sets WHERE session_id = ? ORDER BY set_number ASC',
      [sessionId]
    );
  }
}
