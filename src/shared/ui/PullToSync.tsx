/**
 * PullToSync — RefreshControl wrapper that triggers SyncEngine.syncAll().
 *
 * Wraps the existing RefreshControl logic and adds a sync step after
 * the standard data refetch. Includes:
 * - In-flight guard: skips sync if already running
 * - Auth-expired handling: surfaces via auth-store syncStatus
 * - Works alongside the existing onRefresh callback
 */

import { useCallback, useRef } from "react";
import { RefreshControl } from "react-native";
import { useAuthStore } from "../../stores/auth-store";
import { getSyncEngine } from "../../lib/db/sync-engine-instance";

interface PullToSyncProps {
  /** Whether a data refresh is currently in progress. */
  refreshing: boolean;
  /** Called when the user pulls to refresh (data refetch). */
  onRefresh?: () => void | Promise<void>;
  /** Optional tint color for the spinner. Defaults to "#B9B9B6". */
  tintColor?: string;
  /** Optional colors array for Android. */
  colors?: string[];
  /** Children (the scrollable content). */
  children?: React.ReactNode;
}

export function PullToSync({
  refreshing,
  onRefresh,
  tintColor = "#B9B9B6",
  colors,
}: PullToSyncProps) {
  const syncInFlight = useRef(false);
  const setSyncStatus = useAuthStore((s) => s.setSyncStatus);

  const handleRefresh = useCallback(async () => {
    // 1. Run the caller's data refresh first
    await onRefresh?.();

    // 2. Trigger sync with in-flight guard
    if (syncInFlight.current) return;
    syncInFlight.current = true;

    try {
      const engine = getSyncEngine();
      if (engine) {
        const result = await engine.syncAll();
        if (result.authExpired) {
          setSyncStatus("auth-expired");
        }
      }
    } catch {
      // Sync failures are non-fatal — the next pull will retry
    } finally {
      syncInFlight.current = false;
    }
  }, [onRefresh, setSyncStatus]);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={tintColor}
      colors={colors ?? [tintColor]}
    />
  );
}
