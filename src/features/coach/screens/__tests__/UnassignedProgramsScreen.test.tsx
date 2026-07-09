/**
 * Tests for the UnassignedProgramsScreen
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { UnassignedProgramsScreen } from "../UnassignedProgramsScreen";

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

// ─── Hooks mock ──────────────────────────────────────────────────────────

const mockUseTemplates = jest.fn();
const mockUseCoachAssignments = jest.fn();
const mockUseMyTeams = jest.fn();
const mockUseTeamMembers = jest.fn();
const mockAssignMutate = jest.fn();

jest.mock("@/features/routines/hooks/useTemplates", () => ({
  useTemplates: (...args: any[]) => mockUseTemplates(...args),
}));

jest.mock("@/features/coach/hooks/useProgramAssignment", () => ({
  useCoachAssignments: (...args: any[]) => mockUseCoachAssignments(...args),
  useAssignProgram: () => ({ mutate: mockAssignMutate, isPending: false }),
  useUnassignProgram: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateAssignment: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/features/coach/hooks/useTeams", () => ({
  useMyTeams: (...args: any[]) => mockUseMyTeams(...args),
  useTeamMembers: (...args: any[]) => mockUseTeamMembers(...args),
}));

// ─── Test data ───────────────────────────────────────────────────────────

const mockTemplates = [
  {
    id: "tpl-1",
    user_id: "coach-1",
    name: "Summer Strength",
    description: "Full body program",
    program_block_id: null,
    is_public: false,
    created: "2026-01-01",
    updated: "2026-01-01",
    exercises: [
      {
        id: "te-1",
        workout_template_id: "tpl-1",
        exercise_id: "ex-1",
        sort_order: 0,
        target_sets: 3,
        target_reps: 10,
        target_rpe_low: null,
        target_rpe_high: null,
        rest_seconds: 90,
        notes: null,
      },
    ],
  },
  {
    id: "tpl-2",
    user_id: "coach-1",
    name: "Power Building",
    description: null,
    program_block_id: null,
    is_public: false,
    created: "2026-01-02",
    updated: "2026-01-02",
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

const mockAssignments = [
  {
    id: "assign-1",
    athlete_id: "athlete-1",
    coach_id: "coach-1",
    template_id: "tpl-1", // tpl-1 is assigned
    assigned_at: "2026-05-25",
    started_at: "2026-06-01",
    completed_at: null,
    program_id: null,
    notes: null,
    team_id: "team-1",
    status: "active",
    created: "2026-05-25",
    updated: "2026-05-25",
  },
];

function setData(templates: any[] | null, assignments: any[] | null, isLoading = false) {
  mockUseTemplates.mockReturnValue({
    data: templates,
    isLoading,
    refetch: jest.fn(),
    isRefetching: false,
  });
  mockUseCoachAssignments.mockReturnValue({
    data: assignments,
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setData(mockTemplates, mockAssignments);
  mockUseMyTeams.mockReturnValue({
    data: [{ id: "team-1", name: "Varsity", description: null, created_by: "coach-1", created: "", updated: "" }],
    isLoading: false,
  });
  mockUseTeamMembers.mockReturnValue({
    data: [
      { id: "mem-1", user_id: "athlete-1", team_id: "team-1", role: "athlete", user_name: "John Doe", user_email: "john@test.com", user_avatar: null, joined_at: "", position: null, created: "", updated: "" },
    ],
    isLoading: false,
  });
});

// ─── Tests ───────────────────────────────────────────────────────────────

describe("UnassignedProgramsScreen", () => {
  it("renders screen title and kicker", () => {
    render(<UnassignedProgramsScreen />);

    expect(screen.getByText("COACH TOOLS")).toBeTruthy();
    expect(screen.getByText("Unassigned Programs")).toBeTruthy();
  });

  it("renders unassigned templates (tpl-2 not assigned)", () => {
    render(<UnassignedProgramsScreen />);

    // tpl-1 is assigned, so should not appear
    expect(screen.queryByText("Summer Strength")).toBeNull();
    // tpl-2 is unassigned
    expect(screen.getByText("Power Building")).toBeTruthy();
  });

  it("shows exercise and set counts for unassigned templates", () => {
    render(<UnassignedProgramsScreen />);

    expect(screen.getByText("1 exercise")).toBeTruthy();
    expect(screen.getByText("4 sets")).toBeTruthy();
  });

  it("shows estimated duration", () => {
    render(<UnassignedProgramsScreen />);

    expect(screen.getByText("~10 min")).toBeTruthy();
  });

  it("shows 'All Templates Assigned' when none unassigned", () => {
    setData(mockTemplates, [
      { ...mockAssignments[0] },
      {
        id: "assign-2",
        athlete_id: "athlete-1",
        coach_id: "coach-1",
        template_id: "tpl-2", // tpl-2 also assigned
        assigned_at: "2026-05-25",
        started_at: "2026-06-01",
        completed_at: null,
        program_id: null,
        notes: null,
        team_id: "team-1",
        status: "active",
        created: "2026-05-25",
        updated: "2026-05-25",
      },
    ]);
    render(<UnassignedProgramsScreen />);

    expect(screen.getByText("All Templates Assigned")).toBeTruthy();
  });

  it("shows loading skeleton when loading", () => {
    setData(null, null, true);
    render(<UnassignedProgramsScreen />);

    expect(screen.getByTestId("page-skeleton")).toBeTruthy();
  });

  it("has assign button on each unassigned template", () => {
    render(<UnassignedProgramsScreen />);

    // The "Assign to Athlete" button should exist for Power Building
    const assignButtons = screen.getAllByText("Assign to Athlete");
    expect(assignButtons).toHaveLength(1);
  });

  it("opens assign modal on button press", () => {
    render(<UnassignedProgramsScreen />);

    fireEvent.press(screen.getByText("Assign to Athlete"));

    // Modal should open showing the template name
    expect(screen.getByText("Assign: Power Building")).toBeTruthy();
  });

  it("shows athletes in assign modal", () => {
    render(<UnassignedProgramsScreen />);

    fireEvent.press(screen.getByText("Assign to Athlete"));

    expect(screen.getByText("John Doe")).toBeTruthy();
  });

  it("filters templates by search", () => {
    render(<UnassignedProgramsScreen />);

    const searchInput = screen.getByPlaceholderText("Search templates...");
    fireEvent.changeText(searchInput, "Power");

    expect(screen.getByText("Power Building")).toBeTruthy();
    expect(screen.queryByText("Summer Strength")).toBeNull();
  });

  it("shows no results when search has no match", () => {
    render(<UnassignedProgramsScreen />);

    const searchInput = screen.getByPlaceholderText("Search templates...");
    fireEvent.changeText(searchInput, "ZZZZZ");

    expect(screen.getByText("No Matching Templates")).toBeTruthy();
  });
});
