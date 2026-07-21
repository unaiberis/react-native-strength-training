/**
 * Hook for managing notifications.
 *
 * Uses TanStack Query to fetch from PocketBase `notifications` collection.
 * Falls back to local SQLite when offline.
 * Read state mutations are optimistic: UI updates immediately, server syncs in background.
 */

import { useCallback, useMemo } from "react";
import { Platform } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRecord,
} from "@/lib/pocketbase/services/notifications";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type:
    | "workout_assigned"
    | "program_updated"
    | "feedback_reply"
    | "achievement"
    | "system";
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

const NOTIFICATIONS_QUERY_KEY = "notifications";

// ─── Mapping ───────────────────────────────────────────────────────────────

function mapRecordToAppNotification(record: NotificationRecord): AppNotification {
  return {
    id: record.id,
    type: record.type as AppNotification["type"],
    title: record.title,
    body: record.body,
    data: record.data ?? undefined,
    read: record.read,
    created_at: record.created_at,
  };
}

// ─── Fallback for offline / when PB is unreachable ─────────────────────────

async function fetchFromLocalDB(userId: string): Promise<AppNotification[]> {
  try {
    const { getDb } = await import("@/lib/db/database");
    const db = await getDb();
    const rows = await db.getAllAsync<{
      id: string;
      type: string;
      title: string;
      body: string;
      data: string | null;
      read: number;
      created_at: string;
    }>(
      `SELECT id, type, title, body, data, read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map((r) => ({
      id: r.id,
      type: r.type as AppNotification["type"],
      title: r.title,
      body: r.body,
      data: r.data ? JSON.parse(r.data) : undefined,
      read: r.read === 1,
      created_at: r.created_at,
    }));
  } catch {
    return [];
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Hook for managing notifications.
 *
 * Fetches from PocketBase `notifications` collection via TanStack Query.
 * Falls back to local SQLite on error (offline mode).
 * Supports markAsRead / markAllAsRead with optimistic updates.
 */
export function useNotifications() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [NOTIFICATIONS_QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const records = await listNotifications(userId);
        return records.map(mapRecordToAppNotification);
      } catch {
        // Fallback to local DB
        return fetchFromLocalDB(userId);
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5, // Poll every 5 min
  });

  const notifications = query.data ?? [];

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await markNotificationRead(id);
      } catch {
        // Optimistic update handled by onMutate below
      }
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<AppNotification[]>([
        NOTIFICATIONS_QUERY_KEY,
        userId,
      ]);
      queryClient.setQueryData<AppNotification[]>(
        [NOTIFICATIONS_QUERY_KEY, userId],
        (old) =>
          old?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData([NOTIFICATIONS_QUERY_KEY, userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, userId] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      try {
        await markAllNotificationsRead(userId);
      } catch {
        // Optimistic update
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<AppNotification[]>([
        NOTIFICATIONS_QUERY_KEY,
        userId,
      ]);
      queryClient.setQueryData<AppNotification[]>(
        [NOTIFICATIONS_QUERY_KEY, userId],
        (old) => old?.map((n) => ({ ...n, read: true })) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([NOTIFICATIONS_QUERY_KEY, userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, userId] });
    },
  });

  const markAsRead = useCallback(
    (id: string) => {
      markAsReadMutation.mutate(id);
    },
    [markAsReadMutation],
  );

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, userId] });
  }, [queryClient, userId]);

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}
