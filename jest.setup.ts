// Mock react-native before anything else loads
jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: () => {} },
  NativeModules: {},
  StyleSheet: { create: () => ({}), hairlineWidth: () => 1 },
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
}));

// Mock Expo SecureStore
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Tabs: () => null,
}));

// Suppress console noise during tests
global.console.error = jest.fn();

// Vitest compatibility shim
(global as any).vi = {
  fn: (impl?: any) => jest.fn(impl),
  spyOn: (obj: any, method: string) => jest.spyOn(obj, method),
  mock: (mod: string, factory?: any) => {
    try { jest.mock(mod, factory); } catch { /* ignore resolution errors from setupFiles context */ }
  },
  unmock: (mod: string) => jest.unmock(mod),
  clearAllMocks: () => jest.clearAllMocks(),
  resetAllMocks: () => jest.resetAllMocks(),
  restoreAllMocks: () => jest.restoreAllMocks(),
  useFakeTimers: (config?: any) => jest.useFakeTimers(config),
  useRealTimers: () => jest.useRealTimers(),
  advanceTimersByTime: (ms: number) => jest.advanceTimersByTime(ms),
  runAllTimers: () => jest.runAllTimers(),
  runOnlyPendingTimers: () => jest.runOnlyPendingTimers(),
  hoisted: <T>(factory: () => T): T => factory(),
  resetModules: () => jest.resetModules(),
  isVitest: false,
};

// ─── i18n Mock ─────────────────────────────────────────────────────────────
// @lingui/core uses ESM imports that Jest can't parse (dist/index.mjs).
// Mock the entire chain so schema tests (which import ../../i18n) work.
jest.mock("@lingui/core", () => ({
  I18n: class {
    _messages: Record<string, Record<string, string>> = {};
    _activeLocale: string = "en";
    load(locale: any, messages?: any) {
      if (typeof locale === "object") {
        Object.assign(this._messages, locale);
      } else if (messages) {
        this._messages[locale] = messages;
      }
    }
    activate(locale: string) { this._activeLocale = locale; }
    t(strings: TemplateStringsArray | string, ...values: any[]) {
      const key = typeof strings === "string" ? strings : String.raw(strings, ...values);
      return this._messages[this._activeLocale]?.[key] ?? key;
    }
  },
}));

// Mock the i18n module for schema tests (imported from src/shared/schemas/ as "../../i18n")
// The { virtual: true } flag creates the module without needing a file on disk.
// Multiple path variations to catch different resolution attempts.
["src/i18n/index", "src/i18n/index.ts"].forEach((modPath) => {
  jest.mock(modPath, () => {
    const { I18n } = require("@lingui/core");
    const i18n = new I18n();
    return { i18n };
  }, { virtual: true });
});

// Mock NetInfo for network-monitor tests (uses default export)
jest.mock("@react-native-community/netinfo", () => {
  const mockFetch = jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true }));
  return {
    __esModule: true,
    default: {
      fetch: mockFetch,
      addEventListener: jest.fn(() => () => {}),
    },
  };
});

// Mock pocketbase ESM module
jest.mock("pocketbase", () => {
  class MockAuthStore {
    token = "";
    model = null;
    isValid = () => false;
    clear = () => {};
    save = () => {};
  }
  class MockPocketBase {
    collection = jest.fn(() => ({
      create: jest.fn(),
      getOne: jest.fn(),
      getFullList: jest.fn(),
      getList: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }));
    authStore = new MockAuthStore();
    filter = (s: string) => s;
  }
  MockPocketBase.prototype.authStore = new MockAuthStore();
  const pb = new MockPocketBase();
  return { default: MockPocketBase, BaseAuthStore: MockAuthStore, RecordService: class {} };
});

// Override NetInfo mock to handle default export correctly
jest.mock("@react-native-community/netinfo", () => {
  const defaultState = {
    type: "cellular",
    isConnected: true,
    isInternetReachable: true,
    details: { isConnectionExpensive: true, cellularGeneration: "3g" },
  };
  const mockNetInfo = {
    NetInfoStateType: {
      unknown: "unknown", none: "none", cellular: "cellular", wifi: "wifi",
      bluetooth: "bluetooth", ethernet: "ethernet", wimax: "wimax",
      vpn: "vpn", other: "other",
    },
    configure: jest.fn(),
    fetch: jest.fn(() => Promise.resolve(defaultState)),
    refresh: jest.fn(() => Promise.resolve(defaultState)),
    addEventListener: jest.fn(() => jest.fn()),
    useNetInfo: jest.fn(() => defaultState),
  };
  return { __esModule: true, default: mockNetInfo, ...mockNetInfo };
});
