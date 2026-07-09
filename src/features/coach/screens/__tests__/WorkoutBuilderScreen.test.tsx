/**
 * Tests for the WorkoutBuilderScreen
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { WorkoutBuilderScreen } from "../WorkoutBuilderScreen";

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

  // Modal always renders for RTL host component detection
  const ModalComponent: React.FC<any> = (props: any) => {
    return React.createElement("View", props, props.children);
  };
  ModalComponent.displayName = "Modal";
  rn["Modal"] = ModalComponent;

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

jest.mock("@/shared/ui/GradientBackground", () => ({
  GradientBackground: ({ children }: { children: React.ReactNode }) =>
    React.createElement("View", null, children),
}));

jest.mock("@/shared/ui/SkeletonLoader", () => ({
  PageSkeleton: () => React.createElement("View", { testID: "page-skeleton" }),
}));

// ─── Router mock ─────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
}));

// ─── Template hooks mock ─────────────────────────────────────────────────

const mockCreateTemplate = jest.fn();
const mockUpdateTemplate = jest.fn();

jest.mock("@/features/routines/hooks/useTemplates", () => ({
  useTemplates: () => ({ data: [], isLoading: false }),
  useTemplate: () => ({ data: null, isLoading: false }),
  useCreateTemplate: () => ({
    mutateAsync: mockCreateTemplate,
    isPending: false,
  }),
  useUpdateTemplate: () => ({
    mutateAsync: mockUpdateTemplate,
    isPending: false,
  }),
  useDeleteTemplate: () => ({ mutate: jest.fn(), isPending: false }),
}));

// ─── ExercisePrescriptionForm stub — controllable for tests ──────────────
// Exposes a trigger function that tests can call to simulate exercise selection

let exerciseFormTriggers: Array<{
  onChange: (v: any) => void;
  onRemove?: () => void;
}> = [];

beforeEach(() => {
  exerciseFormTriggers = [];
});

// Inlined factory functions — avoids importing the real module which pulls in PocketBase ESM
let _mockSetKey = 0;
function _mockCreateSetEntry(overrides?: Record<string, any>) {
  _mockSetKey += 1;
  return {
    key: `set-${_mockSetKey}`,
    reps: 8,
    repsMin: null,
    repsMax: null,
    rpe: null,
    weightType: "absolute",
    weightValue: null,
    isWarmup: false,
    isAmrap: false,
    ...overrides,
  };
}
function _mockCreateDefaultPrescription() {
  return {
    exerciseId: "",
    exerciseName: "",
    exerciseCategory: undefined,
    sets: [_mockCreateSetEntry({ reps: 10, isWarmup: false })],
    restSeconds: 90,
    notes: "",
    alternativeExerciseIds: [],
  };
}

jest.mock(
  "@/features/coach/components/ExercisePrescriptionForm",
  () => ({
    createDefaultPrescription: _mockCreateDefaultPrescription,
    createSetEntry: _mockCreateSetEntry,
    ExercisePrescriptionForm: ({
      value,
      onChange,
      onRemove,
    }: {
      value: any;
      onChange: (v: any) => void;
      onRemove?: () => void;
    }) => {
      const idx = exerciseFormTriggers.length;
      exerciseFormTriggers.push({ onChange, onRemove });
      return React.createElement("View", { testID: `exercise-form-${idx}` },
        React.createElement("Text", null,
          value.exerciseId
            ? `Exercise: ${value.exerciseName || value.exerciseId}`
            : "No exercise selected",
        ),
      );
    },
  }),
);

// ─── Helper to simulate exercise selection ──────────────────────────────

function selectExercise(
  formIndex = 0,
  overrides: Record<string, any> = {},
) {
  const form = exerciseFormTriggers[formIndex];
  if (!form) throw new Error(`No exercise form at index ${formIndex}`);
  form.onChange({
    exerciseId: "ex-1",
    exerciseName: "Bench Press",
    sets: [{ key: "s1", reps: 10, repsMin: null, repsMax: null, rpe: null, weightType: "absolute", weightValue: null, isWarmup: false, isAmrap: false }],
    restSeconds: 90,
    notes: "Slow eccentric",
    alternativeExerciseIds: [],
    ...overrides,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("WorkoutBuilderScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the screen title and kicker", () => {
    render(<WorkoutBuilderScreen />);

    expect(screen.getByText("COACH TOOLS")).toBeTruthy();
    expect(screen.getByText("Build Workout")).toBeTruthy();
  });

  it("shows cancel and save buttons", () => {
    render(<WorkoutBuilderScreen />);

    // "Cancel" appears as the header cancel link
    expect(screen.getByText("Save Template")).toBeTruthy();
    // Use getAllByText for Cancel since it appears in two places
    const cancelButtons = screen.getAllByText("Cancel");
    expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows initial block stats", () => {
    render(<WorkoutBuilderScreen />);

    expect(screen.getByText("1")).toBeTruthy(); // 1 block
    expect(screen.getByText("0")).toBeTruthy(); // 0 exercises
  });

  it("has workout name input", () => {
    render(<WorkoutBuilderScreen />);

    expect(
      screen.getByPlaceholderText("e.g. Upper Body Push Day"),
    ).toBeTruthy();
  });

  it("has description input", () => {
    render(<WorkoutBuilderScreen />);

    expect(
      screen.getByPlaceholderText("Describe this workout..."),
    ).toBeTruthy();
  });

  it("renders block type add buttons", () => {
    render(<WorkoutBuilderScreen />);

    expect(screen.getByText("+ Normal")).toBeTruthy();
    expect(screen.getByText("+ Warmup")).toBeTruthy();
    expect(screen.getByText("+ Cooldown")).toBeTruthy();
    expect(screen.getByText("+ Superset")).toBeTruthy();
  });

  it("adds a warmup block when Warmup button pressed", () => {
    render(<WorkoutBuilderScreen />);

    fireEvent.press(screen.getByText("+ Warmup"));

    // Should now show 2 blocks (1 initial + 1 warmup)
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("shows validation when saving without name", async () => {
    const Alert = require("react-native").Alert;
    render(<WorkoutBuilderScreen />);

    fireEvent.press(screen.getByText("Save Template"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Validation",
        "Workout name is required",
      );
    });
  });

  it("shows add exercise button inside normal block", () => {
    render(<WorkoutBuilderScreen />);

    const addExerciseButtons = screen.getAllByLabelText(
      "Add exercise to Normal block",
    );
    expect(addExerciseButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty exercise state in initial block", () => {
    render(<WorkoutBuilderScreen />);

    expect(
      screen.getByText("No exercises in this block. Add one below."),
    ).toBeTruthy();
  });

  it("adds exercise form when add exercise button pressed", () => {
    render(<WorkoutBuilderScreen />);

    // Initially 0 exercise forms
    expect(exerciseFormTriggers).toHaveLength(0);

    fireEvent.press(screen.getByLabelText("Add exercise to Normal block"));

    // Now should have 1 exercise form trigger
    expect(exerciseFormTriggers).toHaveLength(1);
  });

  it("saves with name and exercise triggers createTemplate", async () => {
    mockCreateTemplate.mockResolvedValueOnce({ id: "new-template" });
    render(<WorkoutBuilderScreen />);

    // Enter a name
    const nameInput = screen.getByPlaceholderText("e.g. Upper Body Push Day");
    fireEvent.changeText(nameInput, "Upper Body Day");

    // Add an exercise and select it
    fireEvent.press(screen.getByLabelText("Add exercise to Normal block"));
    await act(async () => {
      selectExercise(0);
    });

    // Save
    fireEvent.press(screen.getByText("Save Template"));

    await waitFor(() => {
      expect(mockCreateTemplate).toHaveBeenCalledTimes(1);
    });
  });

  it("navigates back after successful save", async () => {
    mockCreateTemplate.mockResolvedValueOnce({ id: "new-template" });

    render(<WorkoutBuilderScreen />);

    const nameInput = screen.getByPlaceholderText("e.g. Upper Body Push Day");
    fireEvent.changeText(nameInput, "Upper Body Day");

    // Add and select an exercise
    fireEvent.press(screen.getByLabelText("Add exercise to Normal block"));
    await act(async () => {
      selectExercise(0);
    });

    fireEvent.press(screen.getByText("Save Template"));

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it("shows cancel confirmation dialog", () => {
    const Alert = require("react-native").Alert;
    render(<WorkoutBuilderScreen />);

    // Get the header "Cancel" (first instance)
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.press(cancelButtons[0]);

    expect(Alert.alert).toHaveBeenCalledWith(
      "Discard Changes",
      expect.any(String),
      expect.any(Array),
    );
  });

  it("shows validation when saving without any exercise selected", async () => {
    const Alert = require("react-native").Alert;
    render(<WorkoutBuilderScreen />);

    // Enter a name but don't add any exercises
    const nameInput = screen.getByPlaceholderText("e.g. Upper Body Push Day");
    fireEvent.changeText(nameInput, "Upper Body Day");

    fireEvent.press(screen.getByText("Save Template"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Validation",
        "Add at least one exercise to the workout.",
      );
    });
  });
});
