/**
 * Network connectivity monitor.
 *
 * Singleton wrapper around `@react-native-community/netinfo` that
 * provides a simple `isOnline` boolean and subscription-based change
 * notifications with a 2-second debounce to prevent flapping during
 * brief connectivity interruptions.
 */

import NetInfo from "@react-native-community/netinfo";

export type NetworkListener = (isOnline: boolean) => void;

const DEBOUNCE_MS = 2000;

export class NetworkMonitor {
  private static instance: NetworkMonitor;

  private _isOnline: boolean = true;
  private readonly listeners = new Set<NetworkListener>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeNetInfo: (() => void) | null = null;
  private initialized = false;

  private constructor() {
    // Singleton — use getInstance()
  }

  // ─── Singleton ──────────────────────────────────────────────────────

  /**
   * Get or create the singleton NetworkMonitor instance.
   */
  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  // ─── Public API ─────────────────────────────────────────────────────

  /**
   * Current online status (fast access, no async).
   *
   * Defaults to `true` before the first NetInfo fetch completes
   * (fail-open — app works as before when NetInfo is unavailable).
   */
  get isOnline(): boolean {
    return this._isOnline;
  }

  /**
   * Subscribe to connectivity changes.
   *
   * Returns an unsubscribe function. The callback receives a single
   * boolean argument: `true` when online, `false` when offline.
   *
   * The monitor lazily initialises the NetInfo subscription on the
   * first subscriber, so it is safe to call `getInstance()` during
   * module initialisation without triggering NetInfo setup.
   */
  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    this.ensureListening();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopListening();
      }
    };
  }

  /**
   * Remove all listeners and clean up the NetInfo subscription.
   *
   * Call this on app unmount. After calling `destroy()` a new
   * `getInstance()` call will create a fresh monitor.
   */
  destroy(): void {
    this.listeners.clear();
    this.stopListening();
    this.initialized = false;
    NetworkMonitor.instance = null as unknown as NetworkMonitor;
  }

  /**
   * Unsubscribe all listeners without destroying the singleton.
   *
   * Unlike `destroy()`, this keeps the NetInfo subscription active
   * (the first future subscriber re-activates it).
   */
  unsubscribeAll(): void {
    this.listeners.clear();
    this.stopListening();
  }

  // ─── Internal ───────────────────────────────────────────────────────

  private ensureListening(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Fetch initial state
    NetInfo.fetch().then((state) => {
      this._isOnline = state.isConnected ?? true;
    });

    // Subscribe to changes
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? true;
      this.handleConnectivityChange(online);
    });
  }

  private stopListening(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.initialized = false;
  }

  private handleConnectivityChange(online: boolean): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;

      if (this._isOnline !== online) {
        this._isOnline = online;
        this.notifyListeners(online);
      }
    }, DEBOUNCE_MS);
  }

  private notifyListeners(isOnline: boolean): void {
    for (const listener of this.listeners) {
      try {
        listener(isOnline);
      } catch {
        // Swallow individual listener errors so one bad listener
        // does not break others.
      }
    }
  }
}
