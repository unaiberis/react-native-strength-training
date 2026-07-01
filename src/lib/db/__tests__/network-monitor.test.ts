/**
 * NetworkMonitor tests.
 *
 * Mocks @react-native-community/netinfo to control connectivity state
 * and verify that the monitor correctly debounces and propagates changes.
 */

// Mock NetInfo before importing the module under test
const netInfoCallbacks: Array<(state: { isConnected: boolean | null; type: string }) => void> = [];
const mockFetch = jest.fn<Promise<{ isConnected: boolean | null; type: string }>, []>();
const mockUnsubscribe = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  fetch: () => mockFetch(),
  addEventListener: (cb: (state: { isConnected: boolean | null; type: string }) => void) => {
    netInfoCallbacks.push(cb);
    return mockUnsubscribe;
  },
}));

import { NetworkMonitor } from "../network-monitor";

describe("NetworkMonitor", () => {
  let monitor: NetworkMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    netInfoCallbacks.length = 0;

    // Default mock: connected
    mockFetch.mockResolvedValue({ isConnected: true, type: "wifi" });

    monitor = NetworkMonitor.getInstance();
  });

  afterEach(() => {
    monitor.destroy();
    jest.useRealTimers();
  });

  describe("singleton", () => {
    it("getInstance returns the same instance", () => {
      const instance2 = NetworkMonitor.getInstance();
      expect(monitor).toBe(instance2);
    });

    it("getInstance returns a new instance after destroy", () => {
      monitor.destroy();
      const instance2 = NetworkMonitor.getInstance();
      expect(monitor).not.toBe(instance2);
    });
  });

  describe("isOnline", () => {
    it("defaults to true before any NetInfo event", () => {
      // Before subscribing, no NetInfo fetch has happened
      expect(monitor.isOnline).toBe(true);
    });

    it("updates to NetInfo fetch result after subscribing", () => {
      monitor.subscribe(jest.fn());
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("reflects the connected state from fetch", async () => {
      mockFetch.mockResolvedValue({ isConnected: false, type: "none" });
      monitor.subscribe(jest.fn());
      await jest.runAllTimersAsync();
      expect(monitor.isOnline).toBe(false);
    });
  });

  describe("subscribe", () => {
    it("registers a listener and returns unsubscribe function", () => {
      const listener = jest.fn();
      const unsubscribe = monitor.subscribe(listener);

      expect(typeof unsubscribe).toBe("function");

      // Trigger a connectivity change
      simulateConnectivityChange(false);

      // Fast-forward past debounce
      jest.advanceTimersByTime(2000);

      expect(listener).toHaveBeenCalledWith(false);
    });

    it("unsubscribe removes the listener", () => {
      const listener = jest.fn();
      const unsubscribe = monitor.subscribe(listener);
      unsubscribe();

      simulateConnectivityChange(false);
      jest.advanceTimersByTime(2000);

      expect(listener).not.toHaveBeenCalled();
    });

    it("supports multiple listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      monitor.subscribe(listener1);
      monitor.subscribe(listener2);

      simulateConnectivityChange(false);
      jest.advanceTimersByTime(2000);

      expect(listener1).toHaveBeenCalledWith(false);
      expect(listener2).toHaveBeenCalledWith(false);
    });
  });

  describe("debounce", () => {
    it("does not fire listener immediately on change", () => {
      const listener = jest.fn();
      monitor.subscribe(listener);

      simulateConnectivityChange(false);
      // No time advanced yet — debounce should not have fired
      expect(listener).not.toHaveBeenCalled();
    });

    it("fires listener after 2 seconds", () => {
      const listener = jest.fn();
      monitor.subscribe(listener);

      simulateConnectivityChange(false);
      jest.advanceTimersByTime(1999);
      expect(listener).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(listener).toHaveBeenCalledWith(false);
    });

    it("resets debounce on rapid changes", () => {
      const listener = jest.fn();
      monitor.subscribe(listener);

      // Toggle rapidly
      simulateConnectivityChange(false);
      jest.advanceTimersByTime(500);
      simulateConnectivityChange(true);
      jest.advanceTimersByTime(500);
      simulateConnectivityChange(false);

      // Only 1500ms have passed since the LAST change
      jest.advanceTimersByTime(1999);
      expect(listener).not.toHaveBeenCalled();

      // Now 2000ms from the last change
      jest.advanceTimersByTime(1);
      expect(listener).toHaveBeenCalledWith(false);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("does not fire when status has not changed", () => {
      const listener = jest.fn();
      monitor.subscribe(listener);

      // Same value as initial (true)
      simulateConnectivityChange(true);
      jest.advanceTimersByTime(2000);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("unsubscribeAll", () => {
    it("removes all listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      monitor.subscribe(listener1);
      monitor.subscribe(listener2);

      monitor.unsubscribeAll();

      simulateConnectivityChange(false);
      jest.advanceTimersByTime(2000);

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    it("unsubscribes listeners", () => {
      monitor.subscribe(jest.fn());
      const listener = jest.fn();
      monitor.subscribe(listener);

      monitor.destroy();

      simulateConnectivityChange(false);
      jest.advanceTimersByTime(2000);

      expect(listener).not.toHaveBeenCalled();
    });

    it("unsubscribes from NetInfo event", () => {
      monitor.subscribe(jest.fn());
      monitor.destroy();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  // ─── Helpers ──────────────────────────────────────────────────────

  function simulateConnectivityChange(isConnected: boolean): void {
    for (const cb of netInfoCallbacks) {
      cb({ isConnected, type: isConnected ? "wifi" : "none" });
    }
  }
});
