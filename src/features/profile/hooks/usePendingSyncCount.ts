import { useQuery } from "@tanstack/react-query";

const PENDING_SYNC_QUERY_KEY = "pending-sync-count";

export interface PendingSyncCount {
  /** Number of pending changes waiting to sync */
  pending: number;
  /** Number of dead-lettered changes (failed permanently) */
  deadLetters: number;
  /** Number of auth-error changes (need re-auth) */
  authErrors: number;
  /** True if there are any pending/dead-letter/auth-error items */
  hasPending: boolean;
}

/**
 * Query the local change_queue for counts of unsynchronized changes.
 *
 * Uses a dynamic import of getDb so the module can be imported in
 * environments without expo-sqlite (e.g. web, node tests).
 */
async function fetchPendingSyncCount(): Promise<PendingSyncCount> {
  const { getDb } = await import("../../../lib/db/database");
  const db = await getDb();

  const counts = await db.getAllAsync<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count
     FROM change_queue
     WHERE status IN ('pending', 'dead_letter', 'auth_error')
     GROUP BY status`,
  );

  let pending = 0;
  let deadLetters = 0;
  let authErrors = 0;

  for (const row of counts) {
    if (row.status === "pending") pending = row.count;
    else if (row.status === "dead_letter") deadLetters = row.count;
    else if (row.status === "auth_error") authErrors = row.count;
  }

  return {
    pending,
    deadLetters,
    authErrors,
    hasPending: pending > 0 || deadLetters > 0 || authErrors > 0,
  };
}

/**
 * Query hook that returns counts of unsynchronized changes
 * from the local change queue.
 *
 * Polling is intentionally disabled — the SyncEngine triggers
 * invalidation when sync completes. Manual refetch is also available.
 */
export function usePendingSyncCount() {
  return useQuery<PendingSyncCount>({
    queryKey: [PENDING_SYNC_QUERY_KEY],
    queryFn: fetchPendingSyncCount,
    staleTime: 1000 * 60, // 1 min
  });
}
