import React from "react";

// ─── React Native mock for node test environment ──────────────────────
// @testing-library/react-native v12 uses react-test-renderer and detects
// host component names by rendering mock RN components. Each mock component
// must render via React.createElement("StringType", ...) where StringType
// is the component name without any RCT/RK prefix.
// This matches react-native's own jest/mockComponent.js pattern.

function createRNCProxy(): Record<string, any> {
  // Core component types needed by @testing-library/react-native
  const componentTypes = [
    "View", "Text", "ScrollView", "TextInput", "Image",
    "ActivityIndicator", "Modal", "Switch",
    "TouchableOpacity", "TouchableHighlight", "TouchableWithoutFeedback",
    "Pressable", "RefreshControl", "KeyboardAvoidingView",
    "SafeAreaView", "StatusBar", "FlatList", "SectionList",
    "VirtualizedList", "DrawerLayoutAndroid", "ProgressBarAndroid",
    "ProgressViewIOS", "Slider", "Switch", "Picker",
  ];

  const proxy: Record<string, any> = {};

  for (const name of componentTypes) {
    const Comp: React.FC<any> = (props: any) => {
      // Strip RN-specific props to avoid warnings
      const { forwardedRef, ...rest } = props;
      return React.createElement(name, rest, rest.children);
    };
    Comp.displayName = name;
    proxy[name] = Comp;
  }

  return proxy;
}

const rnComponents = createRNCProxy();

jest.mock("react-native", () => ({
  ...rnComponents,
  Platform: { OS: "ios", select: () => {} },
  NativeModules: {},
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  StyleSheet: { create: () => ({}), flatten: (s: any) => s, hairlineWidth: () => 1, absoluteFill: {}, absoluteFillObject: {} },
  I18nManager: { isRTL: false },
  PixelRatio: { get: () => 2, getFontScale: () => 1 },
  Animated: { View: rnComponents.View, Text: rnComponents.Text, ScrollView: rnComponents.ScrollView, createAnimatedComponent: (c: any) => c, timing: () => ({ start: () => {}, stop: () => {} }), spring: () => ({ start: () => {}, stop: () => {} }), sequence: () => ({ start: () => {}, stop: () => {} }), parallel: () => ({ start: () => {}, stop: () => {} }), delay: () => ({ start: () => {}, stop: () => {} }), decay: () => ({ start: () => {}, stop: () => {} }), loop: () => ({ start: () => {}, stop: () => {} }), event: () => ({}), Value: class { constructor() {} setValue = () => {}; interpolate = () => ({}); start = () => {}; stop = () => {}; }, },
  Easing: { linear: () => {} },
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
  },
}));

// Mock Expo SecureStore (needed by auth imports)
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-router
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

// Mock expo-linear-gradient for GradientBackground
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) =>
    React.createElement("View", null, children),
}));

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
}));

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) =>
    React.createElement("Text", null, name),
}));

// Mock react-native-reanimated for node test environment
// Reanimated hooks (useSharedValue, useDerivedValue, etc.) are replaced with
// plain JS equivalents so that components using them can render in jest.
jest.mock("react-native-reanimated", () => {
  const { View, Text, ScrollView } = require("react-native");
  const mockVal = (v: any) => ({ value: v });

  return {
    useSharedValue: (init: any) => ({ value: init }),
    useDerivedValue: (fn: () => any) => mockVal(fn()),
    useAnimatedStyle: (fn: () => any) => fn(),
    useAnimatedProps: (fn: () => any) => fn(),
    withTiming: (toValue: any, _config?: any) => toValue,
    withSpring: (toValue: any, _config?: any) => toValue,
    withDelay: (_delay: number, anim: any) => anim,
    interpolate: (_val: any, _in: any[], _out: any[]) => _out[_out.length - 1],
    Extrapolation: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
    Easing: {
      linear: () => {},
      ease: () => {},
      in: () => {},
      out: () => {},
      inOut: () => {},
      cubic: () => {},
      poly: () => {},
      sin: () => {},
      exp: () => {},
      circle: () => {},
      back: () => {},
      bounce: () => {},
      elastic: () => {},
      bezier: () => {},
      inFn: () => {},
      outFn: () => {},
      inOutFn: () => {},
    },
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
    cancelAnimation: () => {},
    makeMutable: (init: any) => ({ value: init }),
    createAnimatedComponent: (Comp: any) => Comp,
    Animated: {
      View,
      Text,
      ScrollView,
      FlatList: ScrollView,
      Image: View,
      createAnimatedComponent: (Comp: any) => Comp,
    },
    default: {
      View,
      Text,
      ScrollView,
    },
    __esModule: true,
  };
});

// Suppress console noise during tests
global.console.error = jest.fn();
