/**
 * SyncIndicator — Pending count badge for tab bars.
 *
 * Displays a small pill with the number of pending offline changes.
 * Shows a spinner when a sync is in progress. Renders nothing when
 * idle with zero pending items.
 *
 * Reads reactive state from the auth store (updated by SyncEngine events).
 */

import { View, Text, ActivityIndicator } from "react-native";
import { useAuthStore } from "../../stores/auth-store";

interface SyncIndicatorProps {
  /** Optional size override. Defaults to "sm". */
  size?: "sm" | "md";
}

export function SyncIndicator({ size = "sm" }: SyncIndicatorProps) {
  const pendingCount = useAuthStore((s) => s.pendingCount);
  const syncStatus = useAuthStore((s) => s.syncStatus);

  // Syncing → show spinner
  if (syncStatus === "syncing") {
    return (
      <View className="absolute -top-1 -right-1.5 size-4 items-center justify-center">
        <ActivityIndicator size={size === "sm" ? 8 : 12} color="#D7D7D2" />
      </View>
    );
  }

  // Dead-letter or error → show warning dot
  if (syncStatus === "dead-letters" || syncStatus === "error") {
    return (
      <View className="absolute -top-1 -right-1.5 size-4 rounded-full bg-amber-500 items-center justify-center">
        <Text className="text-[8px] font-bold text-black">!</Text>
      </View>
    );
  }

  // Pending count badge
  if (pendingCount > 0) {
    const display = pendingCount > 99 ? "99+" : String(pendingCount);
    const pillSize = size === "sm" ? "min-w-4 h-4 px-1" : "min-w-5 h-5 px-1.5";

    return (
      <View
        className={`absolute -top-1 -right-1.5 ${pillSize} rounded-full bg-brand-500 items-center justify-center`}
      >
        <Text className="text-[9px] font-bold text-white">{display}</Text>
      </View>
    );
  }

  // Idle, no pending — render nothing
  return null;
}
