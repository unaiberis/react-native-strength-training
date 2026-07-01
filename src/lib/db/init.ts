/**
 * Database initialization entry point.
 *
 * Opens the SQLite database (lazy singleton), runs schema migrations,
 * and returns the ready database instance. Called once at app startup
 * from `_layout.tsx` before any auth or data operations.
 */

import { getDb } from "./database";
import { runMigrations } from "./schema";
import type { SQLiteDatabase } from "expo-sqlite";

/**
 * Initialize the local SQLite database.
 *
 * 1. Opens or retrieves the singleton database connection.
 * 2. Runs schema migrations (idempotent — safe on every startup).
 *
 * Returns the ready database instance.
 */
export async function initDatabase(): Promise<SQLiteDatabase> {
  const db = await getDb();
  await runMigrations(db);
  return db;
}
