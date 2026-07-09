/**
 * Tests for the ExercisePrescriptionForm component
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import {
  ExercisePrescriptionForm,
  createDefaultPrescription,
  type ExercisePrescription,
} from "../ExercisePrescriptionForm";

// ─── RN Mock (overrides jest.setup.ts) ───────────────────────────────────

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

  // Modal always renders children for RTL host component detection
  const Modal: React.FC<any> = (props: any) => {
    return React.createElement("View", props, props.children);
  };
  Modal.displayName = "Modal";
  rn["Modal"] = Modal;
  rn["FlatList"] = ({ data, renderItem }: any) =>
    React.createElement(
      "View",
      null,
      (data || []).map((item: any, i: number) =>
        React.createElement("View", { key: i }, renderItem({ item })),
      ),
    );

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

// ─── Mock Ionicons ───────────────────────────────────────────────────────

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) =>
    React.createElement("Text", null, name),
}));

// ─── Mock exercise search hook ───────────────────────────────────────────

const mockSearchExercises = jest.fn();
jest.mock("@/features/exercises/hooks/useExercises", () => ({
  useExerciseSearch: (...args: any[]) => mockSearchExercises(...args),
}));

// ─── Mock SetSchemeEditor to simplify testing ────────────────────────────
// We dont want to test SetSchemeEditor internals here, just that it's wired up

jest.mock("../SetSchemeEditor", () => ({
  ...jest.requireActual("../SetSchemeEditor"),
  SetSchemeEditor: ({ sets, onChange }: any) =>
    React.createElement("View", { testID: "set-scheme-editor" },
      React.createElement("Text", null, `SetSchemeEditor: ${sets.length} sets`),
    ),
}));

// ─── Test Data ───────────────────────────────────────────────────────────

const mockExercises = [
  { id: "ex-1", name: "Bench Press", category: "Strength", body_region: "chest", default_sets: 3, default_reps: 10, default_rest_seconds: 90 },
  { id: "ex-2", name: "Squat", category: "Strength", body_region: "legs", default_sets: 4, default_reps: 8, default_rest_seconds: 120 },
  { id: "ex-3", name: "Pull Up", category: "Bodyweight", body_region: "back", default_sets: 3, default_reps: 8, default_rest_seconds: 60 },
];

function mockSearch(query: string) {
  if (query.length < 2) return { data: [], isLoading: false };
  return {
    data: mockExercises.filter((ex) =>
      ex.name.toLowerCase().includes(query.toLowerCase()),
    ),
    isLoading: false,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchExercises.mockImplementation((query: string) => mockSearch(query));
});

// ─── Tests ───────────────────────────────────────────────────────────────

describe("ExercisePrescriptionForm", () => {
  it("shows exercise selector when no exercise selected", () => {
    const value: ExercisePrescription = createDefaultPrescription();
    const onChange = jest.fn();
    render(
      <ExercisePrescriptionForm value={value} onChange={onChange} />,
    );

    expect(screen.getByText("Tap to select exercise")).toBeTruthy();
  });

  it("shows exercise details when exercise is selected", () => {
    const value: ExercisePrescription = {
      ...createDefaultPrescription(),
      exerciseId: "ex-1",
      exerciseName: "Bench Press",
      exerciseCategory: "Strength",
    };
    const onChange = jest.fn();
    render(
      <ExercisePrescriptionForm value={value} onChange={onChange} />,
    );

    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.getByText("Strength")).toBeTruthy();
  });

  it("renders SetSchemeEditor when exercise is selected", () => {
    const value: ExercisePrescription = {
      ...createDefaultPrescription(),
      exerciseId: "ex-1",
      exerciseName: "Bench Press",
    };
    const onChange = jest.fn();
    render(
      <ExercisePrescriptionForm value={value} onChange={onChange} />,
    );

    expect(screen.getByText(/SetSchemeEditor: 1 sets/)).toBeTruthy();
  });

  it("opens exercise picker modal when tap to select pressed", () => {
    const value: ExercisePrescription = createDefaultPrescription();
    const onChange = jest.fn();
    render(
      <ExercisePrescriptionForm value={value} onChange={onChange} />,
    );

    fireEvent.press(screen.getByLabelText("Select exercise"));

    // The modal should be visible — check for the search input
    expect(screen.getByText("Select Exercise")).toBeTruthy();
  });

  it("calls onChange when rest seconds change", () => {
    const value: ExercisePrescription = {
      ...createDefaultPrescription(),
      exerciseId: "ex-1",
      exerciseName: "Bench Press",
      restSeconds: 90,
    };
    const onChange = jest.fn();
    render(
      <ExercisePrescriptionForm value={value} onChange={onChange} />,
    );

    const restInput = screen.getByDisplayValue("90");
    fireEvent.changeText(restInput, "120");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].restSeconds).toBe(120);
  });

  it("calls onChange when notes change", () => {
    const value: ExercisePrescription = {
      ...createDefaultPrescription(),
      exerciseId: "ex-1",
      exerciseName: "Bench Press",
      notes: "",
    };
    const onChange = jest.fn();
    render(
      <ExercisePrescriptionForm value={value} onChange={onChange} />,
    );

    const notesInput = screen.getByPlaceholderText("Cues, tempo, execution notes...");
    fireEvent.changeText(notesInput, "Slow eccentric, pause at bottom");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].notes).toBe(
      "Slow eccentric, pause at bottom",
    );
  });

  it("change exercise button swaps exercise", () => {
    const value: ExercisePrescription = {
      ...createDefaultPrescription(),
      exerciseId: "ex-1",
      exerciseName: "Bench Press",
    };
    const onChange = jest.fn();
    render(
      <ExercisePrescriptionForm value={value} onChange={onChange} />,
    );

    fireEvent.press(screen.getByLabelText("Change exercise"));

    // Should open the modal again
    expect(screen.getByText("Select Exercise")).toBeTruthy();
  });

  it("calls onRemove when remove button pressed", () => {
    const value: ExercisePrescription = {
      ...createDefaultPrescription(),
      exerciseId: "ex-1",
      exerciseName: "Bench Press",
    };
    const onChange = jest.fn();
    const onRemove = jest.fn();
    render(
      <ExercisePrescriptionForm
        value={value}
        onChange={onChange}
        onRemove={onRemove}
      />,
    );

    fireEvent.press(screen.getByLabelText("Remove exercise"));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("hides remove button when hideRemove is true", () => {
    const value: ExercisePrescription = {
      ...createDefaultPrescription(),
      exerciseId: "ex-1",
      exerciseName: "Bench Press",
    };
    const onChange = jest.fn();
    render(
      <ExercisePrescriptionForm
        value={value}
        onChange={onChange}
        hideRemove
      />,
    );

    expect(screen.queryByLabelText("Remove exercise")).toBeNull();
  });
});
