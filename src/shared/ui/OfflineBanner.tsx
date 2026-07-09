import { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import { useAuthStore } from "../../stores/auth-store";

// ─── Props ─────────────────────────────────────────────────────────────────

interface OfflineBannerProps {
  /** When true, also shows sync status banners (syncing, error, dead-letters) */
  showSyncStatus?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Offline banner that slides in when the device goes offline.
 * Optionally also shows sync engine status (syncing, auth-expired, dead-letters).
 *
 * Uses `@react-native-community/netinfo` for connectivity detection.
 * When `showSyncStatus` is true, also reads `syncStatus` from the auth store
 * to show syncing / error states.
 */
export function OfflineBanner({ showSyncStatus = true }: OfflineBannerProps) {
  const netInfo = useNetInfo();
  const isOnline = useAuthStore((s) => s.isOnline);
  const syncStatus = useAuthStore((s) => s.syncStatus);

  // Prefer netinfo direct, fall back to auth store
  const offline = netInfo.isConnected === false || !isOnline;

  const slideAnim = useRef(new Animated.Value(offline ? 0 : -60)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: offline ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [offline, slideAnim]);

  // Sync status banner (when online but syncing / has errors)
  const syncBanner = showSyncStatus
    ? getSyncBanner(syncStatus)
    : null;

  if (!offline && !syncBanner) return null;

  return (
    <Animated.View
      style={{ transform: [{ translateY: slideAnim }] }}
      className="absolute top-0 left-0 right-0 z-50"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {offline ? (
        <View className="bg-amber-900/60 py-2 px-4 flex-row items-center justify-center gap-2">
          <Ionicons name="cloud-offline-outline" size={14} color="#fbbf24" />
          <Text className="text-amber-300 text-xs font-medium">
            You're offline — changes will sync when connected
          </Text>
        </View>
      ) : syncBanner ? (
        <View className={`${syncBanner.bg} py-1.5 px-4 flex-row items-center justify-center gap-2`}>
          {syncBanner.icon && (
            <Ionicons name={syncBanner.icon} size={14} color={syncBanner.color} />
          )}
          <Text className={`${syncBanner.textColor} text-xs text-center font-medium`}>
            {syncBanner.text}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

// ─── Sync Banner Config ────────────────────────────────────────────────────

function getSyncBanner(syncStatus: string): {
  text: string;
  bg: string;
  textColor: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
} | null {
  switch (syncStatus) {
    case "syncing":
      return {
        text: "Syncing\u2026",
        bg: "bg-brand-900/40",
        textColor: "text-brand-300",
        icon: "sync-outline",
        color: "#6ee7b7",
      };
    case "dead-letters":
      return {
        text: "Some changes couldn't sync",
        bg: "bg-red-900/40",
        textColor: "text-red-300",
        icon: "warning-outline",
        color: "#fca5a5",
      };
    case "auth-expired":
      return {
        text: "Session expired. Log in again to sync.",
        bg: "bg-red-900/40",
        textColor: "text-red-300",
        icon: "log-out-outline",
        color: "#fca5a5",
      };
    case "error":
      return {
        text: "Sync error",
        bg: "bg-amber-900/40",
        textColor: "text-amber-300",
        icon: "alert-circle-outline",
        color: "#fbbf24",
      };
    default:
      return null;
  }
}
