// Mock react-native before anything else loads
jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: () => {} },
  NativeModules: {},
  StyleSheet: { create: () => ({}), hairlineWidth: () => 1 },
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
}));

// Mock Expo SecureStore (needed by Supabase client via imports)
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-router for useAuth tests
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Tabs: () => null,
}));

// Suppress console noise during tests
global.console.error = jest.fn();
