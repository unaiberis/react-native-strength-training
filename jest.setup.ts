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
  mock: (mod: string, factory?: any) => jest.mock(mod, factory),
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
