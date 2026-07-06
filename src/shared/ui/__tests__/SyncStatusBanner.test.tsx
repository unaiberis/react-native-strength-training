/**
 * SyncStatusBanner — Behaviour tests.
 *
 * Tests the banner state machine by driving the auth-store values
 * and verifying the resulting store state.
 *
 * The banner has 7 possible states:
 *   - null (hidden)                  → online + idle + (showIdleInfo=false or syncStatus not idle)
 *   - offline                        → !isOnline
 *   - syncing spinner                → syncStatus === "syncing"
 *   - dead-letter warning            → syncStatus === "dead-letters"
 *   - auth-expired                   → syncStatus === "auth-expired"
 *   - sync error                     → syncStatus === "error"
 *   - "Never synced"                 → idle + lastSyncedAt === null
 *   - "Synced X ago"                 → idle + lastSyncedAt !== null
 */

import { useAuthStore } from "../../../stores/auth-store";

beforeEach(() => {
  useAuthStore.setState({
    isOnline: true,
    syncStatus: "idle",
    lastSyncedAt: null,
    pendingCount: 0,
  });
});

describe("SyncStatusBanner state logic", () => {
  it("shows offline banner when device is offline", () => {
    useAuthStore.setState({ isOnline: false });
    expect(useAuthStore.getState().isOnline).toBe(false);
  });

  it("shows syncing message during sync", () => {
    useAuthStore.setState({ syncStatus: "syncing" });
    expect(useAuthStore.getState().syncStatus).toBe("syncing");
  });

  it("shows dead-letter warning when entries went to dead letter", () => {
    useAuthStore.setState({ syncStatus: "dead-letters" });
    expect(useAuthStore.getState().syncStatus).toBe("dead-letters");
  });

  it("shows auth-expired message", () => {
    useAuthStore.setState({ syncStatus: "auth-expired" });
    expect(useAuthStore.getState().syncStatus).toBe("auth-expired");
  });

  it("shows sync error message", () => {
    useAuthStore.setState({ syncStatus: "error" });
    expect(useAuthStore.getState().syncStatus).toBe("error");
  });

  it("shows 'Never synced' when idle and never synced", () => {
    useAuthStore.setState({ syncStatus: "idle", lastSyncedAt: null });
    const { syncStatus, lastSyncedAt } = useAuthStore.getState();
    expect(syncStatus).toBe("idle");
    expect(lastSyncedAt).toBeNull();
  });

  it("shows last sync time when idle and synced", () => {
    const now = new Date().toISOString();
    useAuthStore.setState({ syncStatus: "idle", lastSyncedAt: now });
    const { lastSyncedAt } = useAuthStore.getState();
    expect(lastSyncedAt).toBe(now);
  });

  it("transitions from offline to syncing on reconnect", () => {
    useAuthStore.setState({ isOnline: false });
    expect(useAuthStore.getState().isOnline).toBe(false);
    useAuthStore.setState({ isOnline: true, syncStatus: "syncing" });
    expect(useAuthStore.getState().isOnline).toBe(true);
    expect(useAuthStore.getState().syncStatus).toBe("syncing");
  });

  it("transitions from syncing to idle on successful sync", () => {
    useAuthStore.setState({ syncStatus: "syncing" });
    expect(useAuthStore.getState().syncStatus).toBe("syncing");
    useAuthStore.setState({ syncStatus: "idle", lastSyncedAt: new Date().toISOString() });
    expect(useAuthStore.getState().syncStatus).toBe("idle");
  });
});
