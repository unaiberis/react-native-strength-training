/**
 * SyncEngine singleton instance holder.
 *
 * Provides a module-level reference to the running SyncEngine so that
 * UI components (PullToSync, init logic) can call syncAll() without
 * needing it passed through the component tree.
 *
 * Set once during app initialisation in AuthGate, read anywhere.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _instance: any | null = null;

/**
 * Register the SyncEngine singleton. Called once during app init.
 */
export function setSyncEngine(engine: any): void {
  _instance = engine;
}

/**
 * Retrieve the SyncEngine singleton. Returns null if not yet initialised.
 */
export function getSyncEngine(): any | null {
  return _instance;
}

/**
 * Convenience: trigger a full sync cycle. No-op when the engine
 * has not been initialised.
 */
export async function triggerSyncAll(): Promise<void> {
  if (_instance && typeof _instance.syncAll === "function") {
    await _instance.syncAll();
  }
}
