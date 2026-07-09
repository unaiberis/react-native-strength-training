/**
 * Tests for the AssignedProgramsScreen
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { AssignedProgramsScreen } from "../AssignedProgramsScreen";

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

const mockUseCoachAssignments = jest.fn();

jest.mock("@/features/coach/hooks/useProgramAssignment", () => ({
  useCoachAssignments: (...args: any[]) => mockUseCoachAssignments(...args),
  useAssignment: () => ({ data: null, isLoading: false }),
  useAssignProgram: () => ({ mutate: jest.fn(), isPending: false }),
  useUnassignProgram: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateAssignment: () => ({ mutate: jest.fn(), isPending: false }),
}));

// ─── Test data ───────────────────────────────────────────────────────────

const mockAssignments = [
  {
    id: "assign-1",
    athlete_id: "athlete-1",
    coach_id: "coach-1",
    template_id: "tpl-1",
    assigned_at: "2026-05-25",
    started_at: "2026-06-01",
    completed_at: null,
    program_id: null,
    notes: null,
    team_id: "team-1",
    status: "active",
    created: "2026-05-25",
    updated: "2026-05-25",
    expand: {
      template: { id: "tpl-1", name: "Summer Strength", user_id: "coach-1", description: "Full body program", program_block_id: null, is_public: false, created: "2026-01-01", updated: "2026-01-01" },
      athlete: { id: "athlete-1", email: "athlete@test.com", displayName: "John Doe", role: "athlete", coach: null, created: "2026-01-01", updated: "2026-01-01" },
    },
  },
  {
    id: "assign-2",
    athlete_id: "athlete-2",
    coach_id: "coach-1",
    template_id: "tpl-2",
    assigned_at: "2026-05-10",
    started_at: "2026-05-15",
    completed_at: null,
    program_id: null,
    notes: null,
    team_id: "team-1",
    status: "completed",
    created: "2026-05-10",
    updated: "2026-05-10",
    expand: {
      template: { id: "tpl-2", name: "Power Building", user_id: "coach-1", description: "Strength focus", program_block_id: null, is_public: false, created: "2026-01-01", updated: "2026-01-01" },
      athlete: { id: "athlete-2", email: "athlete2@test.com", displayName: "Jane Smith", role: "athlete", coach: null, created: "2026-01-01", updated: "2026-01-01" },
    },
  },
];

function setAssignments(data: any[] | null, isLoading = false) {
  mockUseCoachAssignments.mockReturnValue({
    data,
    isLoading,
    refetch: jest.fn(),
    isRefetching: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setAssignments(mockAssignments);
});

// ─── Tests ───────────────────────────────────────────────────────────────

describe("AssignedProgramsScreen", () => {
  it("renders screen title and kicker", () => {
    render(<AssignedProgramsScreen />);

    expect(screen.getByText("COACH TOOLS")).toBeTruthy();
    expect(screen.getByText("Assigned Programs")).toBeTruthy();
  });

  it("renders program names", () => {
    render(<AssignedProgramsScreen />);

    expect(screen.getByText("Summer Strength")).toBeTruthy();
    expect(screen.getByText("Power Building")).toBeTruthy();
  });

  it("renders athlete names", () => {
    render(<AssignedProgramsScreen />);

    expect(screen.getByText("John Doe")).toBeTruthy();
    expect(screen.getByText("Jane Smith")).toBeTruthy();
  });

  it("renders status badges", () => {
    render(<AssignedProgramsScreen />);

    // Status text appears in both badges and filter chips — use getAllByText
    const activeElements = screen.getAllByText("Active");
    expect(activeElements.length).toBeGreaterThanOrEqual(1);
    const completedElements = screen.getAllByText("Completed");
    expect(completedElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when no assignments", () => {
    setAssignments([]);
    render(<AssignedProgramsScreen />);

    expect(screen.getByText("No Programs Assigned")).toBeTruthy();
  });

  it("shows loading skeleton when loading", () => {
    setAssignments(null, true);
    render(<AssignedProgramsScreen />);

    expect(screen.getByTestId("page-skeleton")).toBeTruthy();
  });

  it("filters by status via filter chips", () => {
    render(<AssignedProgramsScreen />);

    // Default: all, both should show
    expect(screen.getByText("Summer Strength")).toBeTruthy();
    expect(screen.getByText("Power Building")).toBeTruthy();

    // Click "Active" filter
    fireEvent.press(screen.getByLabelText("Filter: Active"));

    expect(screen.getByText("Summer Strength")).toBeTruthy(); // active
    expect(screen.queryByText("Power Building")).toBeNull(); // completed
  });

  it("filters by search query", () => {
    render(<AssignedProgramsScreen />);

    const searchInput = screen.getByPlaceholderText("Search athlete or program...");
    fireEvent.changeText(searchInput, "Jane");

    expect(screen.queryByText("Summer Strength")).toBeNull();
    expect(screen.getByText("Power Building")).toBeTruthy();
  });

  it("shows no results when search has no match", () => {
    render(<AssignedProgramsScreen />);

    const searchInput = screen.getByPlaceholderText("Search athlete or program...");
    fireEvent.changeText(searchInput, "ZZZZZ");

    expect(screen.getByText("No Matching Assignments")).toBeTruthy();
  });

  it("navigates to assignment detail on tap", () => {
    render(<AssignedProgramsScreen />);

    fireEvent.press(
      screen.getByLabelText("Assignment: Summer Strength for John Doe"),
    );

    expect(mockPush).toHaveBeenCalledWith("/(coach)/assignment/assign-1");
  });

  it("renders filter chips", () => {
    render(<AssignedProgramsScreen />);

    expect(screen.getByLabelText("Filter: All")).toBeTruthy();
    expect(screen.getByLabelText("Filter: Active")).toBeTruthy();
    expect(screen.getByLabelText("Filter: Completed")).toBeTruthy();
    expect(screen.getByLabelText("Filter: Cancelled")).toBeTruthy();
  });

  it("shows search bar when assignments exist", () => {
    render(<AssignedProgramsScreen />);

    expect(
      screen.getByPlaceholderText("Search athlete or program..."),
    ).toBeTruthy();
  });
});
