// Vitest setup — replaces jest.setup.ts
import { vi } from "vitest";

// React Native mock (with EventEmitter for expo-modules-core)
vi.mock("react-native", () => {
  const mockEventEmitter = {
    addListener: () => ({ remove: () => {} }),
    remove: () => {},
    emit: () => {},
  };
  return {
    Platform: { OS: "ios", select: () => {} },
    NativeModules: {},
    StyleSheet: { create: () => ({}), hairlineWidth: () => 1 },
    Dimensions: { get: () => ({ width: 375, height: 812 }) },
    EventEmitter: mockEventEmitter,
    NativeEventEmitter: { prototype: {} },
  };
});

// Expo Localization — mock to prevent cascade through expo-modules-core
vi.mock("expo-localization", () => ({
  locale: "en-US",
  locales: ["en-US"],
  timezone: "America/New_York",
  getLocales: () => [{ languageCode: "en", languageTag: "en-US", regionCode: "US" }],
  getCalendars: () => [],
  getCurrencies: () => [],
  getCountry: () => "US",
  getNativeLocales: () => [],
  isRTL: false,
}));

// Expo SecureStore mock (CJS-compatible mock to avoid ESM resolution issues)
const mockSecureStore = {
  getItemAsync: vi.fn(() => Promise.resolve(null)),
  setItemAsync: vi.fn(() => Promise.resolve()),
  deleteItemAsync: vi.fn(() => Promise.resolve()),
};
vi.mock("expo-secure-store", () => mockSecureStore);

// Expo Router mock
vi.mock("expo-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Tabs: () => null,
}));

// @lingui/core — I18n constructor must be a class or function (not arrow) for `new`
vi.mock("@lingui/core", () => {
  const mockT = (id: string) => id;
  const mockI18n = {
    t: mockT,
    locale: "en",
    activate: vi.fn(),
    load: vi.fn(),
  };
  return {
    i18n: mockI18n,
    I18n: vi.fn(function MockI18n() {
      return mockI18n;
    }),
  };
});

// Suppress console noise during tests
globalThis.console.error = vi.fn();

// Make jest.* an alias for vi.*
vi.stubGlobal("jest", vi);
