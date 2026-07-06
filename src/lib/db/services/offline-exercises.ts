/**
 * OfflineExercisesService — exercise queries from local SQLite.
 *
 * Provides multi-filter queries (category + equipment + body_region)
 * so the exercise library works fully offline.
 *
 * This is a read-only service — exercise mutations are admin-only
 * on PocketBase, so no ChangeQueue operations needed.
 */

import type { SQLiteDatabase, SQLiteBindValue } from "expo-sqlite";
import type { ExerciseRow } from "../types";

export interface ExerciseFilter {
  category?: string | null;
  equipment?: string | null;
  bodyRegion?: string | null;
}

export class OfflineExercisesService {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Query exercises from local SQLite with optional filters.
   *
   * All filters are combined with AND. Returns all exercises when
   * no filters are provided.
   */
  async getExercises(filter?: ExerciseFilter): Promise<ExerciseRow[]> {
    const conditions: string[] = [];
    const params: SQLiteBindValue[] = [];

    if (filter?.category) {
      conditions.push("category = ?");
      params.push(filter.category);
    }
    if (filter?.equipment) {
      conditions.push("equipment = ?");
      params.push(filter.equipment);
    }
    if (filter?.bodyRegion) {
      conditions.push("body_region = ?");
      params.push(filter.bodyRegion);
    }

    if (conditions.length === 0) {
      return this.db.getAllAsync<ExerciseRow>("SELECT * FROM exercises");
    }

    return this.db.getAllAsync<ExerciseRow>(
      `SELECT * FROM exercises WHERE ${conditions.join(" AND ")}`,
      params as SQLiteBindValue[],
    );
  }

  /**
   * Retrieve a single exercise by its ID.
   */
  async getExerciseById(id: string): Promise<ExerciseRow | null> {
    const row = await this.db.getFirstAsync<ExerciseRow>(
      "SELECT * FROM exercises WHERE id = ?",
      [id],
    );
    return row ?? null;
  }
}
