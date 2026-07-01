/**
 * React Query persister adapter backed by expo-sqlite.
 *
 * Implements the `AsyncStorage` interface (getItem, setItem, removeItem)
 * using the `react_query_cache` table. This allows React Query to persist
 * and restore its cache across app restarts via the local SQLite database.
 *
 * Usage:
 *   import { createSqlitePersister } from "./sqlite-storage";
 *   import { persistQueryClient } from "@tanstack/query-async-storage-persister";
 *
 *   const persister = createSqlitePersister(db);
 *   persistQueryClient({ queryClient, persister, maxAge: 1000 * 60 * 60 * 24 });
 */

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { SQLiteDatabase } from "expo-sqlite";

/**
 * Create a React Query persister backed by a SQLite `react_query_cache` table.
 *
 * The returned persister implements the `AsyncStorage` interface using
 * the provided database connection. It stores serialised query data as
 * key-value pairs in the `react_query_cache` table.
 */
export function createSqlitePersister(db: SQLiteDatabase) {
  return createAsyncStoragePersister({
    storage: {
      getItem: async (key: string) => {
        const row = await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM react_query_cache WHERE key = ?",
          [key],
        );
        return row?.value ?? null;
      },

      setItem: async (key: string, value: string) => {
        await db.runAsync(
          "INSERT OR REPLACE INTO react_query_cache (key, value) VALUES (?, ?)",
          [key, value],
        );
      },

      removeItem: async (key: string) => {
        await db.runAsync(
          "DELETE FROM react_query_cache WHERE key = ?",
          [key],
        );
      },
    },
  });
}
