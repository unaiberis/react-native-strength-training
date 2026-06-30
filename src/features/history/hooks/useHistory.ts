import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/auth-store";
import * as SessionsService from "../../../lib/supabase/services/sessions";
import type {
  SessionListItem,
  SessionDetailWithExercises,
} from "../../../lib/supabase/services/sessions";

const HISTORY_QUERY_KEY = "workout-history";
const PAGE_SIZE = 20;

export interface HistoryFilters {
  exerciseId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}

/**
 * Query hook for paginated workout history.
 *
 * Returns completed sessions in reverse chronological order, filterable by
 * exercise and date range.
 *
 * Filter changes reset to page 0.
 */
export function useHistory(page = 0, filters?: HistoryFilters) {
  const userId = useAuthStore((s) => s.user?.id);

  const queryKey = useMemo(
    () => [HISTORY_QUERY_KEY, page, filters?.exerciseId, filters?.fromDate, filters?.toDate],
    [page, filters?.exerciseId, filters?.fromDate, filters?.toDate],
  );

  const query = useQuery({
    queryKey,
    queryFn: () =>
      SessionsService.listSessions(userId!, {
        status: "completed",
        exerciseId: filters?.exerciseId ?? undefined,
        fromDate: filters?.fromDate ?? undefined,
        toDate: filters?.toDate ?? undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
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
 * Returns the session with all sets, exercise names, and grouped sets.
 */
export function useSessionDetail(
  sessionId: string | undefined,
) {
  const query = useQuery<SessionDetailWithExercises | null>({
    queryKey: [HISTORY_QUERY_KEY, "detail", sessionId],
    queryFn: () => SessionsService.getSessionDetail(sessionId!),
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

  const prefetch = useCallback(
    (sessionId: string) => {
      queryClient.prefetchQuery({
        queryKey: [HISTORY_QUERY_KEY, "detail", sessionId],
        queryFn: () => SessionsService.getSession(sessionId),
        staleTime: 1000 * 60 * 5,
      });
    },
    [queryClient],
  );

  return prefetch;
}
