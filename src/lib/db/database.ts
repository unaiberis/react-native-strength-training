/**
 * SQLite database singleton.
 *
 * Provides lazy-initialized access to an expo-sqlite database instance.
 * Supports switching the db name for tests (`:memory:`).
 */

import * as SQLite from 'expo-sqlite';

const DEFAULT_DB_NAME = 'strength-training.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the singleton SQLite database instance.
 *
 * If the database has not been opened yet, opens it with the provided name
 * (or the default `strength-training.db`). Subsequent calls return the
 * same instance regardless of `dbName`.
 *
 * Pass `dbName=":memory:"` in tests to use an in-memory database.
 */
export async function getDb(dbName?: string): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(dbName ?? DEFAULT_DB_NAME);
    // Enable foreign key enforcement
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
  return db;
}

/**
 * Close the database connection and reset the singleton.
 *
 * Safe to call multiple times — after the first close subsequent
 * calls are no-ops until `getDb()` is called again.
 */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

/**
 * Check whether the database singleton is currently open.
 */
export function isOpen(): boolean {
  return db !== null;
}

/**
 * Reset the singleton reference without closing the connection.
 *
 * Intended for test cleanup where the connection lifecycle is managed
 * externally. Most callers should use `closeDb()` instead.
 */
export function resetDb(): void {
  db = null;
}
