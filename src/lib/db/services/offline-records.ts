/**
 * OfflineRecordsService — personal record computation from local SQLite.
 *
 * Computes PRs (best set, estimated 1RM) from the local exercise_sets
 * table so the records screen works fully offline.
 *
 * Uses the Epley formula for estimated 1RM:
 *   e1RM = weight * (1 + reps / 30)
 */

import type { SQLiteDatabase } from "expo-sqlite";
import type { ExerciseSetRow } from "../types";

export interface PersonalRecord {
  exercise_id: string;
  weight_kg: number;
  reps: number;
  rpe: number | null;
}

export class OfflineRecordsService {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Return the best set (highest weight) for a given exercise.
   *
   * Returns `null` when no sets exist for the exercise.
   */
  async getBestSet(exerciseId: string): Promise<ExerciseSetRow | null> {
    const row = await this.db.getFirstAsync<ExerciseSetRow>(
      "SELECT * FROM exercise_sets WHERE exercise_id = ? ORDER BY weight_kg DESC LIMIT 1",
      [exerciseId],
    );
    return row ?? null;
  }

  /**
   * Compute the estimated 1RM using the Epley formula.
   *
   * Uses the best set (highest weight, then highest reps at that weight).
   * Returns `null` when no sets exist for the exercise.
   */
  async getEstimated1RM(exerciseId: string): Promise<number | null> {
    const best = await this.db.getFirstAsync<{
      weight_kg: number;
      reps: number;
    }>(
      "SELECT weight_kg, reps FROM exercise_sets WHERE exercise_id = ? ORDER BY weight_kg DESC, reps DESC LIMIT 1",
      [exerciseId],
    );

    if (!best) return null;

    // Epley formula: weight * (1 + reps / 30)
    return Math.round(best.weight_kg * (1 + best.reps / 30) * 100) / 100;
  }

  /**
   * Compute the best set for every exercise the user has ever logged.
   *
   * Returns one row per exercise_id with the max weight.
   */
  async getPersonalRecords(): Promise<PersonalRecord[]> {
    return this.db.getAllAsync<PersonalRecord>(
      `SELECT exercise_id, MAX(weight_kg) as weight_kg, reps, rpe
       FROM exercise_sets
       WHERE is_warmup = 0
       GROUP BY exercise_id
       ORDER BY weight_kg DESC`,
    );
  }
}
