/**
 * OfflineTemplatesService — workout template operations for offline use.
 *
 * Writes template and template-exercise data to local SQLite AND
 * enqueues the corresponding change for later sync.
 */

import type { SQLiteDatabase, SQLiteBindValue } from "expo-sqlite";
import type { ChangeQueue } from "../change-queue";
import { generateId } from "../uuid";
import type { WorkoutTemplateRow, WorkoutTemplateExerciseRow } from "../types";

export interface CreateTemplateInput {
  userId: string;
  name: string;
  description?: string;
  exercises?: TemplateExerciseInput[];
}

export interface UpdateTemplateInput {
  userId: string;
  name?: string;
  description?: string;
}

export interface TemplateExerciseInput {
  exerciseId: string;
  sortOrder: number;
  targetSets?: number;
  targetReps?: number;
  restSeconds?: number;
  notes?: string;
}

export interface ReorderInput {
  exerciseId: string;
  sortOrder: number;
}

export class OfflineTemplatesService {
  constructor(
    private db: SQLiteDatabase,
    private changeQueue: ChangeQueue,
  ) {}

  /**
   * Create a new workout template locally.
   *
   * Writes to `workout_templates` and `workout_template_exercises`,
   * then enqueues a single CREATE change that includes all exercise
   * data.
   */
  async createTemplate(
    input: CreateTemplateInput,
  ): Promise<WorkoutTemplateRow> {
    const id = generateId();
    const now = new Date().toISOString();
    const exercises = input.exercises ?? [];

    // Insert the template row
    await this.db.runAsync(
      `INSERT INTO workout_templates (id, local_id, user_id, name, description, is_public, dirty, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)`,
      [id, id, input.userId, input.name, input.description ?? null, now, now],
    );

    // Insert template exercises
    for (const ex of exercises) {
      const exId = generateId();
      await this.db.runAsync(
        `INSERT INTO workout_template_exercises (id, local_id, template_id, exercise_id, sort_order, target_sets, target_reps, rest_seconds, notes, dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          exId,
          exId,
          id,
          ex.exerciseId,
          ex.sortOrder,
          ex.targetSets ?? 3,
          ex.targetReps ?? 10,
          ex.restSeconds ?? 90,
          ex.notes ?? null,
        ],
      );
    }

    // Enqueue the CREATE change
    await this.changeQueue.enqueue({
      action: "create",
      collection: "workout_templates",
      localId: id,
      data: {
        user_id: input.userId,
        name: input.name,
        description: input.description ?? null,
        is_public: false,
        exercises: exercises.map((ex) => ({
          exercise_id: ex.exerciseId,
          sort_order: ex.sortOrder,
          target_sets: ex.targetSets ?? 3,
          target_reps: ex.targetReps ?? 10,
          rest_seconds: ex.restSeconds ?? 90,
          notes: ex.notes ?? null,
        })),
      },
    });

    return {
      id,
      local_id: id,
      user_id: input.userId,
      name: input.name,
      description: input.description ?? null,
      is_public: 0,
      dirty: 1,
      synced_at: null,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Update a template locally.
   *
   * Updates the local row and enqueues an UPDATE change.
   */
  async updateTemplate(
    id: string,
    input: UpdateTemplateInput,
  ): Promise<void> {
    const now = new Date().toISOString();
    const sets: string[] = [];
    const values: SQLiteBindValue[] = [];

    if (input.name !== undefined) {
      sets.push("name = ?");
      values.push(input.name);
    }
    if (input.description !== undefined) {
      sets.push("description = ?");
      values.push(input.description);
    }

    sets.push("updated_at = ?");
    values.push(now);

    sets.push("dirty = 1");

    values.push(id);
    await this.db.runAsync(
      `UPDATE workout_templates SET ${sets.join(", ")} WHERE id = ?`,
      values,
    );

    await this.changeQueue.enqueue({
      action: "update",
      collection: "workout_templates",
      recordId: id,
      data: {
        name: input.name,
        description: input.description,
      },
    });
  }

  /**
   * Delete a template locally.
   *
   * Removes template exercises first (FK constraint), then the
   * template row itself. Enqueues a DELETE change.
   */
  async deleteTemplate(id: string): Promise<void> {
    // Delete child rows first (FK constraint)
    await this.db.runAsync(
      "DELETE FROM workout_template_exercises WHERE template_id = ?",
      [id],
    );

    // Delete the template itself
    await this.db.runAsync(
      "DELETE FROM workout_templates WHERE id = ?",
      [id],
    );

    await this.changeQueue.enqueue({
      action: "delete",
      collection: "workout_templates",
      recordId: id,
    });
  }

  /**
   * Reorder exercises within a template.
   *
   * Accepts an array of {exerciseId, sortOrder} pairs and updates
   * each exercise's sort_order in the local SQLite table. Enqueues
   * an UPDATE change for each reordered exercise.
   *
   * Does nothing when the reorder list is empty.
   */
  async reorderExercises(
    templateId: string,
    reorders: ReorderInput[],
  ): Promise<void> {
    for (const item of reorders) {
      await this.db.runAsync(
        `UPDATE workout_template_exercises SET sort_order = ?, dirty = 1 WHERE id = ? AND template_id = ?`,
        [item.sortOrder, item.exerciseId, templateId],
      );

      await this.changeQueue.enqueue({
        action: "update",
        collection: "workout_template_exercises",
        recordId: item.exerciseId,
        data: { sort_order: item.sortOrder },
      });
    }
  }

  /**
   * Retrieve all local templates.
   */
  async getTemplates(): Promise<WorkoutTemplateRow[]> {
    return this.db.getAllAsync<WorkoutTemplateRow>(
      "SELECT * FROM workout_templates",
    );
  }

  /**
   * Retrieve all exercises for a template, ordered by sort_order.
   */
  async getTemplateExercises(
    templateId: string,
  ): Promise<WorkoutTemplateExerciseRow[]> {
    return this.db.getAllAsync<WorkoutTemplateExerciseRow>(
      "SELECT * FROM workout_template_exercises WHERE template_id = ? ORDER BY sort_order ASC",
      [templateId],
    );
  }
}
