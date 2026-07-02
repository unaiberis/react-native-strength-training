/* eslint-disable */
// Mock react-native before anything else loads
// Provides component stubs so RNTL can render and query in node environment
jest.mock('react-native', () => {
  const React = require('react');

  function createStub(name) {
    const Component = React.forwardRef(function (props, ref) {
      return React.createElement(
        name,
        { ...props, ref },
        props.children ?? null
      );
    });
    Component.displayName = name;
    return Component;
  }

  return {
    Platform: { OS: 'ios', select: function () {} },
    NativeModules: {},
    StyleSheet: {
      create: function () {
        return {};
      },
      hairlineWidth: function () {
        return 1;
      },
      flatten: function () {
        return {};
      },
    },
    Dimensions: {
      get: function () {
        return { width: 375, height: 812 };
      },
    },

    // Host components needed by RNTL detection + project components
    View: createStub('View'),
    Text: createStub('Text'),
    TextInput: createStub('TextInput'),
    Image: createStub('Image'),
    ScrollView: createStub('ScrollView'),
    Switch: createStub('Switch'),
    Modal: createStub('Modal'),

    // Touchable components used in the project
    TouchableOpacity: createStub('View'),
    ActivityIndicator: createStub('View'),
    Pressable: createStub('View'),
  };
});

// Mock Expo SecureStore (needed by Supabase client via imports)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-router for useAuth tests
jest.mock('expo-router', () => ({
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
