/**
 * Tests for the SetSchemeEditor component
 *
 * Uses the same RN mock pattern as teams.test.tsx (overrides jest.setup.ts
 * so FlatList renders items and TextInput fires onChangeText properly).
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import {
  SetSchemeEditor,
  createSetEntry,
  createDefaultSets,
  type SetEntry,
} from "../SetSchemeEditor";

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

// ─── Helpers ─────────────────────────────────────────────────────────────

function findTextInputWithValue(value: string): any {
  // The rendered TextInputs have their value as children or via value prop
  // In the mock, they render as <TextInput>children</TextInput>
  // We need to find them by querying for the value text
  return screen.queryAllByDisplayValue(value);
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("SetSchemeEditor", () => {
  const defaultSets = createDefaultSets(3);

  it("renders with initial sets", () => {
    const onChange = jest.fn();
    render(<SetSchemeEditor sets={defaultSets} onChange={onChange} />);

    // Should show the set count
    expect(screen.getByText("3 sets")).toBeTruthy();
    expect(screen.getByText(/Set Scheme/)).toBeTruthy();
  });

  it("renders empty state when no sets", () => {
    const onChange = jest.fn();
    render(<SetSchemeEditor sets={[]} onChange={onChange} />);

    expect(screen.getByText("No sets configured. Tap \"Add Set\" below.")).toBeTruthy();
    expect(screen.getByText("0 sets")).toBeTruthy();
  });

  it("adds a set when Add Set button pressed", () => {
    const onChange = jest.fn();
    const sets = [createSetEntry({ reps: 10 })];
    render(<SetSchemeEditor sets={sets} onChange={onChange} />);

    fireEvent.press(screen.getByLabelText("Add set"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const newSets = onChange.mock.calls[0][0];
    expect(newSets).toHaveLength(2);
  });

  it("removes a set when remove button pressed", () => {
    const onChange = jest.fn();
    const sets = [
      createSetEntry({ reps: 10 }),
      createSetEntry({ reps: 8 }),
    ];
    render(<SetSchemeEditor sets={sets} onChange={onChange} />);

    // Remove the first set
    const removeButtons = screen.getAllByLabelText(/Remove set/);
    expect(removeButtons).toHaveLength(2);
    fireEvent.press(removeButtons[0]);

    expect(onChange).toHaveBeenCalledTimes(1);
    const newSets = onChange.mock.calls[0][0];
    expect(newSets).toHaveLength(1);
    expect(newSets[0].reps).toBe(8);
  });

  it("toggles AMRAP on last set", () => {
    const onChange = jest.fn();
    const sets = [
      createSetEntry({ reps: 10 }),
      createSetEntry({ reps: 8 }),
    ];
    render(<SetSchemeEditor sets={sets} onChange={onChange} />);

    fireEvent.press(screen.getByLabelText("Toggle AMRAP for last set"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const newSets = onChange.mock.calls[0][0];
    expect(newSets[1].isAmrap).toBe(true);
  });

  it("toggles warmup on a set", () => {
    const onChange = jest.fn();
    const sets = [createSetEntry({ reps: 10 })];
    render(<SetSchemeEditor sets={sets} onChange={onChange} />);

    fireEvent.press(screen.getByLabelText("Toggle warmup for set 1"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const newSets = onChange.mock.calls[0][0];
    expect(newSets[0].isWarmup).toBe(true);
  });

  it("shows volume estimate", () => {
    const onChange = jest.fn();
    const sets = [
      createSetEntry({ reps: 10 }),
      createSetEntry({ reps: 8 }),
      createSetEntry({ reps: 6 }),
    ];
    render(<SetSchemeEditor sets={sets} onChange={onChange} />);

    // Total volume should be ~24
    expect(screen.getByText("~24 reps")).toBeTruthy();
  });

  it("excludes AMRAP sets from volume estimate", () => {
    const onChange = jest.fn();
    const sets = [
      createSetEntry({ reps: 10 }),
      createSetEntry({ reps: 8, isAmrap: true }),
    ];
    render(<SetSchemeEditor sets={sets} onChange={onChange} />);

    // Only the first set counts (10 reps)
    expect(screen.getByText("~10 reps")).toBeTruthy();
  });

  it("changes reps via text input", () => {
    const onChange = jest.fn();
    const sets = [createSetEntry({ reps: 10 })];
    const { rerender } = render(
      <SetSchemeEditor sets={sets} onChange={onChange} />,
    );

    // Simulate typing "12" — the onChange will be called with the new value
    // We need to trigger the TextInput onChangeText
    const setCard = screen.getAllByText("#1")[0];
    expect(setCard).toBeTruthy();

    // Let's test via the onChange callback directly by simulating what
    // the component does: find all TextInputs with value="10"
    const inputs = screen.getAllByDisplayValue("10");
    expect(inputs.length).toBeGreaterThanOrEqual(1);

    // Fire onChangeText on the first "10" input (reps field)
    fireEvent.changeText(inputs[0], "12");

    expect(onChange).toHaveBeenCalledTimes(1);
    const newSets = onChange.mock.calls[0][0];
    expect(newSets[0].reps).toBe(12);
  });
});
