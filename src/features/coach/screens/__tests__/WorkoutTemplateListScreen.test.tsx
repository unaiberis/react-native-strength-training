/**
 * Tests for the WorkoutTemplateListScreen
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { WorkoutTemplateListScreen } from "../WorkoutTemplateListScreen";

// ─── RN Mock ─────────────────────────────────────────────────────────────

jest.mock("react-native", () => {
  const React = require("react");

  const createComponent = (displayName: string) => {
    const Comp: React.FC<any> = (props: any) => {
      const { forwardedRef, ...rest } = props;
      return React.createElement(displayName, rest, rest.children);
    };
    Comp.displayName = displayName;
    return Comp;
  };

  const componentTypes = [
    "View", "Text", "ScrollView", "TextInput", "Image",
    "ActivityIndicator", "Modal", "Switch",
    "TouchableOpacity", "TouchableHighlight", "TouchableWithoutFeedback",
    "Pressable", "RefreshControl", "KeyboardAvoidingView",
    "SafeAreaView", "StatusBar",
    "DrawerLayoutAndroid", "ProgressBarAndroid",
    "ProgressViewIOS", "Slider", "Picker",
  ];

  const rn: Record<string, any> = {};
  for (const name of componentTypes) {
    rn[name] = createComponent(name);
  }

  const FlatList: React.FC<any> = (props) => {
    const { data, renderItem, keyExtractor, ...rest } = props;
    const items = (data || []).map((item: any, index: number) => {
      const key = keyExtractor?.(item, index) ?? String(index);
      return React.createElement(
        "View",
        { key },
        renderItem({ item, index, separators: {} }),
      );
    });
    return React.createElement("View", rest, items);
  };
  FlatList.displayName = "FlatList";
  rn["FlatList"] = FlatList;

  return {
    ...rn,
    Platform: { OS: "ios", select: () => {} },
    Alert: { alert: jest.fn() },
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
      View: rn.View,
      Text: rn.Text,
      ScrollView: rn.ScrollView,
      createAnimatedComponent: (c: any) => c,
      timing: () => ({ start: () => {} }),
      spring: () => ({ start: () => {} }),
      Value: class {
        constructor() {}
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

// ─── Shared mocks ────────────────────────────────────────────────────────

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) =>
    React.createElement("Text", null, name),
}));

jest.mock("@/shared/ui/SkeletonLoader", () => ({
  PageSkeleton: () => React.createElement("View", { testID: "page-skeleton" }),
}));

jest.mock("@/shared/ui/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) =>
    React.createElement("View", null, children),
}));

// ─── Router mock ─────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
}));

// ─── Template hooks mock ─────────────────────────────────────────────────

const mockListTemplates = jest.fn();
const mockCreateTemplateMutate = jest.fn();
const mockDeleteTemplateMutate = jest.fn();

jest.mock("@/features/routines/hooks/useTemplates", () => ({
  useTemplates: (...args: any[]) => mockListTemplates(...args),
  useCreateTemplate: () => ({
    mutate: mockCreateTemplateMutate,
    isPending: false,
  }),
  useDeleteTemplate: () => ({
    mutate: mockDeleteTemplateMutate,
    isPending: false,
  }),
}));

// ─── Test data ───────────────────────────────────────────────────────────

const mockTemplates = [
  {
    id: "tpl-1",
    user_id: "coach-1",
    name: "Upper Body Push",
    description: "Chest and shoulders focus",
    program_block_id: null,
    is_public: false,
    created: "2024-01-01",
    updated: "2024-01-01",
    exercises: [
      {
        id: "te-1",
        workout_template_id: "tpl-1",
        exercise_id: "ex-1",
        sort_order: 0,
        target_sets: 3,
        target_reps: 10,
        target_rpe_low: 7,
        target_rpe_high: 8,
        rest_seconds: 90,
        notes: '{"blockName":"Main","blockType":"normal"}',
      },
    ],
  },
  {
    id: "tpl-2",
    user_id: "coach-1",
    name: "Leg Day",
    description: null,
    program_block_id: null,
    is_public: false,
    created: "2024-01-02",
    updated: "2024-01-02",
    exercises: [
      {
        id: "te-2",
        workout_template_id: "tpl-2",
        exercise_id: "ex-2",
        sort_order: 0,
        target_sets: 4,
        target_reps: 8,
        target_rpe_low: null,
        target_rpe_high: null,
        rest_seconds: 120,
        notes: null,
      },
    ],
  },
];

function setTemplates(templates: any[], isLoading = false) {
  mockListTemplates.mockReturnValue({
    data: templates,
    isLoading,
    refetch: jest.fn(),
    isRefetching: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setTemplates(mockTemplates);
});

// ─── Tests ───────────────────────────────────────────────────────────────

describe("WorkoutTemplateListScreen", () => {
  it("renders template names", () => {
    render(<WorkoutTemplateListScreen />);

    expect(screen.getByText("Upper Body Push")).toBeTruthy();
    expect(screen.getByText("Leg Day")).toBeTruthy();
  });

  it("renders template descriptions", () => {
    render(<WorkoutTemplateListScreen />);

    expect(screen.getByText("Chest and shoulders focus")).toBeTruthy();
  });

  it("shows exercise counts", () => {
    render(<WorkoutTemplateListScreen />);

    const exerciseLabels = screen.getAllByText("1 exercise");
    expect(exerciseLabels).toHaveLength(2);
  });

  it("shows set counts", () => {
    render(<WorkoutTemplateListScreen />);

    expect(screen.getByText("3 sets")).toBeTruthy();
    expect(screen.getByText("4 sets")).toBeTruthy();
  });

  it("shows block info from notes JSON", () => {
    render(<WorkoutTemplateListScreen />);

    expect(screen.getByText("1 block")).toBeTruthy();
  });

  it("shows empty state when no templates", () => {
    setTemplates([]);
    render(<WorkoutTemplateListScreen />);

    expect(screen.getByText("No Workout Templates Yet")).toBeTruthy();
    expect(screen.getByText("Create Template")).toBeTruthy();
  });

  it("shows loading skeleton when loading", () => {
    setTemplates([], true);
    render(<WorkoutTemplateListScreen />);

    expect(screen.getByTestId("page-skeleton")).toBeTruthy();
  });

  it("navigates to create new on FAB press", () => {
    render(<WorkoutTemplateListScreen />);

    fireEvent.press(screen.getByLabelText("Create new workout template"));

    expect(mockPush).toHaveBeenCalledWith("/(coach)/workout-builder");
  });

  it("navigates to edit on edit button press", () => {
    render(<WorkoutTemplateListScreen />);

    fireEvent.press(screen.getByLabelText("Edit Upper Body Push"));

    expect(mockPush).toHaveBeenCalledWith(
      "/(coach)/workout-builder/tpl-1",
    );
  });

  it("navigates on template tap", () => {
    render(<WorkoutTemplateListScreen />);

    fireEvent.press(screen.getByLabelText("Workout template: Upper Body Push"));

    expect(mockPush).toHaveBeenCalledWith(
      "/(coach)/workout-builder/tpl-1",
    );
  });

  it("duplicate button calls create with copy name", () => {
    render(<WorkoutTemplateListScreen />);

    fireEvent.press(screen.getByLabelText("Duplicate Upper Body Push"));

    expect(mockCreateTemplateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Upper Body Push (copy)",
      }),
      expect.any(Object),
    );
  });

  it("delete button shows confirmation", () => {
    const Alert = require("react-native").Alert;
    render(<WorkoutTemplateListScreen />);

    fireEvent.press(screen.getByLabelText("Delete Upper Body Push"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Delete Template",
      expect.any(String),
      expect.any(Array),
    );
  });

  it("calls delete mutation on confirm", () => {
    // Capture the Delete callback
    let onDelete: (() => void) | null = null;
    (require("react-native").Alert.alert as jest.Mock).mockImplementation(
      (_title: string, _msg: string, buttons: any[]) => {
        const deleteBtn = (buttons || []).find(
          (b: any) => b.text === "Delete",
        );
        onDelete = deleteBtn?.onPress ?? null;
      },
    );

    render(<WorkoutTemplateListScreen />);

    fireEvent.press(screen.getByLabelText("Delete Upper Body Push"));

    expect(onDelete).not.toBeNull();
    onDelete!();
    expect(mockDeleteTemplateMutate).toHaveBeenCalledWith("tpl-1", expect.any(Object));
  });

  it("renders FAB button", () => {
    render(<WorkoutTemplateListScreen />);

    expect(screen.getByLabelText("Create new workout template")).toBeTruthy();
  });

  it("filters templates by search", () => {
    render(<WorkoutTemplateListScreen />);

    const searchInput = screen.getByPlaceholderText("Search templates...");
    fireEvent.changeText(searchInput, "Leg");

    // Leg Day should show
    expect(screen.getByText("Leg Day")).toBeTruthy();
    // Upper Body Push should not
    expect(screen.queryByText("Upper Body Push")).toBeNull();
  });

  it("shows no results when search has no match", () => {
    render(<WorkoutTemplateListScreen />);

    const searchInput = screen.getByPlaceholderText("Search templates...");
    fireEvent.changeText(searchInput, "ZZZZZ");

    expect(screen.getByText("No Matching Templates")).toBeTruthy();
  });
});
