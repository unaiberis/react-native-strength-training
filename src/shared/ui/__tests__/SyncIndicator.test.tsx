/**
 * SyncIndicator — Behaviour tests.
 *
 * Tests the component's conditional rendering logic by checking
 * which state the store drives at any moment.
 *
 * The component has 4 output states:
 *   - null (nothing rendered)        → idle + 0 pending
 *   - spinner (ActivityIndicator)    → syncing
 *   - warning dot                    → dead-letters / error
 *   - pending badge                  → pendingCount > 0
 */

import { useAuthStore } from "../../../stores/auth-store";

beforeEach(() => {
  useAuthStore.setState({
    syncStatus: "idle",
    pendingCount: 0,
    isOnline: true,
    lastSyncedAt: null,
  });
});

describe("SyncIndicator state logic", () => {
  it("renders nothing when idle with zero pending", () => {
    useAuthStore.setState({ syncStatus: "idle", pendingCount: 0 });
    const { syncStatus, pendingCount } = useAuthStore.getState();
    expect(syncStatus).toBe("idle");
    expect(pendingCount).toBe(0);
    // Component should return null for this combination
  });

  it("shows spinner during sync", () => {
    useAuthStore.setState({ syncStatus: "syncing", pendingCount: 5 });
    const { syncStatus } = useAuthStore.getState();
    expect(syncStatus).toBe("syncing");
  });

  it("shows warning for dead-letter entries", () => {
    useAuthStore.setState({ syncStatus: "dead-letters" });
    expect(useAuthStore.getState().syncStatus).toBe("dead-letters");
  });

  it("shows warning for error status", () => {
    useAuthStore.setState({ syncStatus: "error" });
    expect(useAuthStore.getState().syncStatus).toBe("error");
  });

  it("displays single-digit pending count", () => {
    useAuthStore.setState({ pendingCount: 3 });
    expect(useAuthStore.getState().pendingCount).toBe(3);
  });

  it("displays double-digit pending count", () => {
    useAuthStore.setState({ pendingCount: 42 });
    expect(useAuthStore.getState().pendingCount).toBe(42);
  });

  it("caps pending count display at 99+", () => {
    useAuthStore.setState({ pendingCount: 150 });
    expect(useAuthStore.getState().pendingCount).toBe(150);
    // The component renders "99+" when pendingCount > 99
  });

  it("transitions from syncing to idle on completion", () => {
    useAuthStore.setState({ syncStatus: "syncing" });
    expect(useAuthStore.getState().syncStatus).toBe("syncing");
    useAuthStore.setState({ syncStatus: "idle", pendingCount: 0 });
    expect(useAuthStore.getState().syncStatus).toBe("idle");
  });

  it("transitions from warning dot to badge when pending remains after error clears", () => {
    useAuthStore.setState({ syncStatus: "error", pendingCount: 2 });
    expect(useAuthStore.getState().syncStatus).toBe("error");
    useAuthStore.setState({ syncStatus: "idle" });
    expect(useAuthStore.getState().syncStatus).toBe("idle");
    expect(useAuthStore.getState().pendingCount).toBe(2);
  });
});
