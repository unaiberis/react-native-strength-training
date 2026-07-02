import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/auth-store';
import * as SessionsService from '../../../lib/pocketbase/services/sessions';
// Offline modules imported dynamically — expo-sqlite native module unavailable on web
// import { getDb } from "../../../lib/db";
import type {
  SessionListItem,
  SessionDetailWithExercises,
} from '../../../lib/pocketbase/services/sessions';

const HISTORY_QUERY_KEY = 'workout-history';
const PAGE_SIZE = 20;

export interface HistoryFilters {
  exerciseId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}

// ─── SQLite Helpers (offline path) ──────────────────────────────────────

interface LocalSessionRow {
  id: string;
  template_id: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
}

/**
 * List completed workout sessions from local SQLite with pagination.
 * Mirrors the shape of SessionsService.listSessions response.
 */
async function listLocalSessions(
  userId: string,
  filters: HistoryFilters | undefined,
  page: number,
  pageSize: number
): Promise<{ data: SessionListItem[]; count: number }> {
  const { getDb } = await import('../../../lib/db/database');
  const db = await getDb();

  const conditions = ["status = 'completed'"];
  const params: (string | number)[] = [];

  if (filters?.fromDate) {
    conditions.push('started_at >= ?');
    params.push(filters.fromDate);
  }
  if (filters?.toDate) {
    conditions.push('started_at <= ?');
    params.push(filters.toDate);
  }

  const where = conditions.join(' AND ');
  const offset = page * pageSize;

  // Count total
  const countRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM workout_sessions WHERE ${where}`,
    params
  );
  const count = countRow?.count ?? 0;

  // Fetch page
  const rows = await db.getAllAsync<LocalSessionRow>(
    `SELECT id, template_id, status, started_at, completed_at, duration_seconds, notes
     FROM workout_sessions
     WHERE ${where}
     ORDER BY started_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const data: SessionListItem[] = rows.map((row) => ({
    id: row.id,
    workout_template_id: row.template_id,
    status: row.status as 'completed',
    started_at: row.started_at,
    completed_at: row.completed_at,
    duration_minutes: row.duration_seconds
      ? Math.round(row.duration_seconds / 60)
      : null,
    notes: row.notes,
    exerciseCount: undefined,
    totalSets: undefined,
  }));

  return { data, count };
}

/**
 * Get a single session detail from local SQLite.
 * Returns null if the session is not found.
 */
async function getLocalSessionDetail(
  sessionId: string
): Promise<SessionDetailWithExercises | null> {
  const { getDb } = await import('../../../lib/db/database');
  const db = await getDb();

  const session = await db.getFirstAsync<LocalSessionRow>(
    `SELECT id, template_id, status, started_at, completed_at, duration_seconds, notes
     FROM workout_sessions WHERE id = ?`,
    [sessionId]
  );

  if (!session) return null;

  // Fetch sets for this session
  const sets = await db.getAllAsync<{
    id: string;
    session_id: string;
    exercise_id: string;
    set_number: number;
    weight_kg: number;
    reps: number;
    rpe: number | null;
    rir: number | null;
    is_warmup: number;
  }>(
    `SELECT id, session_id, exercise_id, set_number, weight_kg, reps, rpe, rir, is_warmup
     FROM exercise_sets WHERE session_id = ? ORDER BY set_number ASC`,
    [sessionId]
  );

  // Get unique exercise IDs and their names
  const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))];
  const exerciseNames: Record<string, string> = {};

  for (const eid of exerciseIds) {
    const ex = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM exercises WHERE id = ?',
      [eid]
    );
    exerciseNames[eid] = ex?.name ?? 'Unknown Exercise';
  }

  // Group sets by exercise
  const groupedSets: Record<string, typeof sets> = {};
  for (const set of sets) {
    const group = groupedSets[set.exercise_id] ?? [];
    group.push(set);
    groupedSets[set.exercise_id] = group;
  }

  return {
    id: session.id,
    user_id: '',
    workout_template_id: session.template_id,
    program_block_id: null,
    status: session.status as SessionDetailWithExercises['status'],
    started_at: session.started_at,
    completed_at: session.completed_at,
    duration_minutes: session.duration_seconds
      ? Math.round(session.duration_seconds / 60)
      : null,
    notes: session.notes,
    created: session.started_at,
    updated: session.completed_at ?? session.started_at,
    sets: sets.map((s) => ({
      ...s,
      workout_session_id: session.id,
    })) as any,
    exerciseNames: exerciseNames,
    groupedSets: groupedSets as any,
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────

/**
 * Query hook for paginated workout history.
 *
 * Returns completed sessions in reverse chronological order, filterable by
 * date range.
 *
 * Branches on connectivity: offline → reads from SQLite directly,
 * online → PocketBase service.
 *
 * Filter changes reset to page 0.
 */
export function useHistory(page = 0, filters?: HistoryFilters) {
  const userId = useAuthStore((s) => s.user?.id);
  const isOnline = useAuthStore((s) => s.isOnline);

  const queryKey = useMemo(
    () => [
      HISTORY_QUERY_KEY,
      userId,
      page,
      filters?.exerciseId,
      filters?.fromDate,
      filters?.toDate,
      isOnline ? 'online' : 'offline',
    ],
    [
      userId,
      page,
      filters?.exerciseId,
      filters?.fromDate,
      filters?.toDate,
      isOnline,
    ]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!isOnline) {
        return listLocalSessions(userId!, filters, page, PAGE_SIZE);
      }
      return SessionsService.listSessions(userId!, {
        status: 'completed',
        exerciseId: filters?.exerciseId ?? undefined,
        fromDate: filters?.fromDate ?? undefined,
        toDate: filters?.toDate ?? undefined,
        page,
        pageSize: PAGE_SIZE,
      });
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  const sessions = query.data?.data ?? [];
  const totalCount = query.data?.count ?? 0;
  const hasMore = (page + 1) * PAGE_SIZE < totalCount;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return {
    ...query,
    sessions,
    totalCount,
    hasMore,
    totalPages,
    page,
    pageSize: PAGE_SIZE,
  };
}

/**
 * Query hook for fetching a single session detail by ID.
 *
 * Branches on connectivity: offline → reads from SQLite directly,
 * online → PocketBase service.
 *
 * Returns the session with all sets, exercise names, and grouped sets.
 */
export function useSessionDetail(sessionId: string | undefined) {
  const isOnline = useAuthStore((s) => s.isOnline);

  const query = useQuery<SessionDetailWithExercises | null>({
    queryKey: [
      HISTORY_QUERY_KEY,
      'detail',
      sessionId,
      isOnline ? 'online' : 'offline',
    ],
    queryFn: () => {
      if (!sessionId) return null;
      if (!isOnline) {
        return getLocalSessionDetail(sessionId);
      }
      return SessionsService.getSessionDetail(sessionId);
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5,
  });

  return query;
}

/**
 * Prefetch a session detail (useful for optimistic navigation from list to detail).
 */
export function usePrefetchSession() {
  const queryClient = useQueryClient();
  const isOnline = useAuthStore((s) => s.isOnline);

  const prefetch = useCallback(
    (sessionId: string) => {
      queryClient.prefetchQuery({
        queryKey: [
          HISTORY_QUERY_KEY,
          'detail',
          sessionId,
          isOnline ? 'online' : 'offline',
        ],
        queryFn: () => {
          if (!isOnline) {
            return getLocalSessionDetail(sessionId);
          }
          return SessionsService.getWorkoutSession(sessionId);
        },
        staleTime: 1000 * 60 * 5,
      });
    },
    [queryClient, isOnline]
  );

  return prefetch;
}
