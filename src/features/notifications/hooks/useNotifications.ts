import { useState, useCallback, useMemo } from "react";

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

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Hook for managing notifications.
 *
 * Initially returns empty data — the PocketBase `notifications` collection
 * doesn't exist yet. The hook structure is ready for when the backend exists.
 * Read state is stored in local memory.
 *
 * @param initialNotifications - Optional initial data for testing purposes.
 */
export function useNotifications(
  initialNotifications: AppNotification[] = [],
) {
  const [notifications, setNotifications] = useState<AppNotification[]>(
    initialNotifications,
  );
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const refetch = useCallback(() => {
    // Future: will fetch from PocketBase `notifications` collection
    // For now, no-op with empty data
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}
