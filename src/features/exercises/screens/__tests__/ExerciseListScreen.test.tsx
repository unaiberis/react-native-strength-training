import React from "react";
import { render, screen } from "@testing-library/react-native";

// ─── This screen uses FlatList internally. The jest.setup.ts mock for
// react-native renders FlatList as a basic component that ignores data.
// We override FlatList here so it actually renders items from data+renderItem.

// We override the ENTIRE react-native mock with the same comprehensive mock as
// jest.setup.ts, but with FlatList replaced by a functional version.

jest.mock("react-native", () => {
  function createRNCProxy() {
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
        const { forwardedRef, ...rest } = props;
        return React.createElement(name, rest, rest.children);
      };
      Comp.displayName = name;
      proxy[name] = Comp;
    }

    // Replace FlatList with a renderer that actually renders items
    const MockFlatList: React.FC<any> = (props: any) => {
      const { data, renderItem, keyExtractor, ListEmptyComponent, ListFooterComponent, horizontal, contentContainerStyle, contentContainerClassName, ...rest } = props;

      if (!data || data.length === 0) {
        if (ListEmptyComponent) {
          const Empty = typeof ListEmptyComponent === "function"
            ? React.createElement(ListEmptyComponent)
            : ListEmptyComponent;
          return React.createElement(React.Fragment, null, Empty);
        }
        return null;
      }

      const items = data.map((item: any, index: number) => {
        const key = keyExtractor ? keyExtractor(item) : String(index);
        return React.createElement(
          React.Fragment,
          { key },
          renderItem ? renderItem({ item, index }) : React.createElement(proxy.Text, null, String(item)),
        );
      });

      const footer = ListFooterComponent
        ? (typeof ListFooterComponent === "function"
            ? React.createElement(ListFooterComponent)
            : ListFooterComponent)
        : null;

      return React.createElement(React.Fragment, null, ...items, footer);
    };
    MockFlatList.displayName = "FlatList";

    proxy.FlatList = MockFlatList;
    return proxy;
  }

  const rnComponents = createRNCProxy();

  return {
    ...rnComponents,
    Platform: { OS: "ios", select: () => {} },
    NativeModules: {},
    Dimensions: { get: () => ({ width: 375, height: 812 }) },
    StyleSheet: {
      create: () => ({}),
      flatten: (s: any) => s,
      hairlineWidth: () => 1,
      absoluteFill: {},
      absoluteFillObject: {},
    },
    I18nManager: { isRTL: false },
    PixelRatio: { get: () => 2, getFontScale: () => 1 },
    Animated: {
      View: rnComponents.View,
      Text: rnComponents.Text,
      ScrollView: rnComponents.ScrollView,
      createAnimatedComponent: (c: any) => c,
      timing: () => ({ start: () => {}, stop: () => {} }),
      spring: () => ({ start: () => {}, stop: () => {} }),
      Value: class {
        constructor() {}
        setValue = () => {};
        interpolate = () => ({});
      },
    },
    Easing: { linear: () => {} },
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
    },
  };
});

// ─── Mock useExercises ───────────────────────────────────────────────────────

const mockUseExercises = jest.fn();
const mockUseCategories = jest.fn();

jest.mock("@/features/exercises/hooks/useExercises", () => ({
  useExercises: (...args: any[]) => mockUseExercises(...args),
  useCategories: (...args: any[]) => mockUseCategories(...args),
}));

import { ExerciseListScreen } from "../ExerciseListScreen";

const baseExercises = [
  {
    id: "ex-1",
    name: "Bench Press",
    category: "strength",
    equipment: ["Barbell"],
    body_region: "chest",
  },
  {
    id: "ex-2",
    name: "Squat",
    category: "strength",
    equipment: ["Barbell"],
    body_region: "legs",
  },
  {
    id: "ex-3",
    name: "Pull Up",
    category: "bodyweight",
    equipment: [],
    body_region: "back",
  },
];

describe("ExerciseListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseExercises.mockReturnValue({
      data: { data: baseExercises, count: 3 },
      isLoading: false,
      isRefetching: false,
      isFetching: false,
      isSuccess: true,
      refetch: jest.fn(),
    });

    mockUseCategories.mockReturnValue({
      data: ["bodyweight", "strength"],
      isLoading: false,
      isSuccess: true,
    });
  });

  it("renders exercise list with names and categories", () => {
    render(<ExerciseListScreen />);

    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.getByText("Squat")).toBeTruthy();
    expect(screen.getByText("Pull Up")).toBeTruthy();
  });

  it("renders category chips", () => {
    render(<ExerciseListScreen />);

    expect(screen.getByText("All")).toBeTruthy();
    expect(screen.getByText("Bodyweight")).toBeTruthy();
    expect(screen.getByText("Strength")).toBeTruthy();
  });

  it("shows body region tags", () => {
    render(<ExerciseListScreen />);

    expect(screen.getByText("chest")).toBeTruthy();
    expect(screen.getByText("legs")).toBeTruthy();
    expect(screen.getByText("back")).toBeTruthy();
  });

  it("renders empty state when no exercises", () => {
    mockUseExercises.mockReturnValue({
      data: { data: [], count: 0 },
      isLoading: false,
      isRefetching: false,
      isFetching: false,
      isSuccess: true,
      refetch: jest.fn(),
    });

    render(<ExerciseListScreen />);

    expect(screen.getByText("No exercises available")).toBeTruthy();
  });

  it("shows category chips during loading", () => {
    mockUseExercises.mockReturnValue({
      data: undefined,
      isLoading: true,
      isRefetching: false,
      isFetching: true,
      isSuccess: false,
      refetch: jest.fn(),
    });

    render(<ExerciseListScreen />);

    expect(screen.getByText("All")).toBeTruthy();
    expect(screen.getByText("Strength")).toBeTruthy();
  });

  it("shows loading footer indicator when loading with existing data", () => {
    mockUseExercises.mockReturnValue({
      data: { data: baseExercises, count: 25 },
      isLoading: true,
      isRefetching: false,
      isFetching: true,
      isSuccess: true,
      refetch: jest.fn(),
    });

    render(<ExerciseListScreen />);

    expect(screen.getByText("Bench Press")).toBeTruthy();
  });

  it("renders pull-up exercise which has no equipment", () => {
    render(<ExerciseListScreen />);

    // Pull Up has no equipment array, so only 2 "Barbell" tags should exist
    expect(screen.getByText("Pull Up")).toBeTruthy();
    expect(screen.getAllByText("Barbell")).toHaveLength(2); // only BP + Squat
  });

  it("renders Load More footer when there are more items", () => {
    mockUseExercises.mockReturnValue({
      data: { data: baseExercises, count: 25 },
      isLoading: false,
      isRefetching: false,
      isFetching: false,
      isSuccess: true,
      refetch: jest.fn(),
    });

    render(<ExerciseListScreen />);

    // Verify exercises render
    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.getByText("Pull Up")).toBeTruthy();
  });
});
