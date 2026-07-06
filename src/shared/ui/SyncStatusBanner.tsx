/**
 * SyncStatusBanner — Offline/syncing/last-sync status banner.
 *
 * Replaces the inline SyncBanner in the tab layout. Provides a richer
 * display with lastSyncedAt feedback when idle and online.
 *
 * States:
 * - offline         → "You're offline — changes sync when connected"
 * - syncing         → "Syncing…"
 * - dead-letters    → "Some changes couldn't sync"
 * - auth-expired    → "Session expired. Log in again to sync."
 * - error           → "Sync error"
 * - idle + never    → "Never synced" (first time only)
 * - idle + synced   → "Synced {relative} ago"
 */

import { useMemo } from "react";
import { View, Text } from "react-native";
import { useAuthStore } from "../../stores/auth-store";

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Compute a human-friendly relative time string from an ISO date.
 */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "just now";

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 2) return "1m ago";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 2) return "1h ago";
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 2) return "1d ago";
  return `${days}d ago`;
}

// ─── State Config ───────────────────────────────────────────────────────

interface BannerConfig {
  text: string;
  bg: string;
  textColor: string;
}

function getBannerConfig(
  isOnline: boolean,
  syncStatus: string,
  lastSyncedAt: string | null,
): BannerConfig | null {
  // Offline takes priority
  if (!isOnline) {
    return {
      text: "You're offline — changes sync when connected",
      bg: "bg-amber-900/60",
      textColor: "text-amber-300",
    };
  }

  // Active sync states
  switch (syncStatus) {
    case "syncing":
      return { text: "Syncing\u2026", bg: "bg-brand-900/40", textColor: "text-brand-300" };
    case "dead-letters":
      return { text: "Some changes couldn't sync", bg: "bg-red-900/40", textColor: "text-red-300" };
    case "auth-expired":
      return { text: "Session expired. Log in again to sync.", bg: "bg-red-900/40", textColor: "text-red-300" };
    case "error":
      return { text: "Sync error", bg: "bg-amber-900/40", textColor: "text-amber-300" };
  }

  // Idle — show last sync info
  if (syncStatus === "idle") {
    if (!lastSyncedAt) {
      return { text: "Never synced", bg: "bg-surface-800/40", textColor: "text-surface-400" };
    }
    return {
      text: `Synced ${relativeTime(lastSyncedAt)} ago`,
      bg: "bg-surface-800/40",
      textColor: "text-surface-400",
    };
  }

  return null;
}

// ─── Component ──────────────────────────────────────────────────────────

interface SyncStatusBannerProps {
  /**
   * When true, show lastSyncedAt info even when idle (default: true).
   * Set to false for screens where the idle banner would be distracting.
   */
  showIdleInfo?: boolean;
}

export function SyncStatusBanner({ showIdleInfo = true }: SyncStatusBannerProps) {
  const isOnline = useAuthStore((s) => s.isOnline);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);

  const banner = useMemo(() => {
    const config = getBannerConfig(isOnline, syncStatus, lastSyncedAt);
    if (!config) return null;
    // Hide idle info when the caller doesn't want it
    if (!showIdleInfo && syncStatus === "idle") return null;
    return config;
  }, [isOnline, syncStatus, lastSyncedAt, showIdleInfo]);

  if (!banner) return null;

  return (
    <View className={`${banner.bg} py-1.5 px-4`}>
      <Text className={`${banner.textColor} text-xs text-center font-medium`}>
        {banner.text}
      </Text>
    </View>
  );
}
