/**
 * Tests for the Teams list screen.
 *
 * Overrides the jest.setup.ts RN mock because:
 * 1. FlatList needs to actually render items via renderItem + data
 * 2. Alert needs to be available so we can test the delete flow
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import TeamsScreen from "../teams";

// ─── Extended RN mock ────────────────────────────────────────────────────
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

  // FlatList must render items (jest.setup.ts mock just renders <FlatList />)
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

// ─── Shared UI mocks ─────────────────────────────────────────────────────
jest.mock("@/shared/ui/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: any }) => children,
}));

// ─── Teams hook mocks ────────────────────────────────────────────────────
const mockUserTeams = jest.fn();
const mockCreateTeamMutate = jest.fn();
const mockDeleteTeamMutate = jest.fn();

jest.mock("@/features/coach/hooks/useTeams", () => ({
  useUserTeams: (...args: any[]) => mockUserTeams(...args),
  useCreateTeam: () => ({ mutate: mockCreateTeamMutate, isPending: false }),
  useDeleteTeam: () => ({ mutate: mockDeleteTeamMutate, isPending: false }),
}));

// ─── Router mock (overrides jest.setup.ts so we can assert on push) ──────
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
}));

// ─── Test data ───────────────────────────────────────────────────────────
const baseTeam = {
  created_by: "user-1",
  membership_position: null,
  athlete_count: 0,
  coach_count: 0,
  created: "2024-01-01",
  updated: "2024-01-01",
};

const mockTeams = [
  {
    ...baseTeam,
    id: "team-1",
    name: "Team Alpha",
    description: "First team",
    membership_role: "coach" as const,
    member_count: 5,
  },
  {
    ...baseTeam,
    id: "team-2",
    name: "Team Beta",
    description: null,
    membership_role: "admin" as const,
    member_count: 10,
  },
];

function setTeams(teams: any[], isLoading = false) {
  mockUserTeams.mockReturnValue({
    data: teams,
    isLoading,
    refetch: jest.fn(),
    isRefetching: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setTeams(mockTeams);
});

// ─── Tests ───────────────────────────────────────────────────────────────
describe("TeamsScreen", () => {
  it("renders teams list with team names", () => {
    render(<TeamsScreen />);

    expect(screen.getByText("Team Alpha")).toBeTruthy();
    expect(screen.getByText("Team Beta")).toBeTruthy();
    expect(screen.getByText("First team")).toBeTruthy();
  });

  it("shows empty state when no teams", () => {
    setTeams([]);
    render(<TeamsScreen />);

    expect(screen.getByText("No Teams Yet")).toBeTruthy();
    expect(screen.queryByText("Team Alpha")).toBeNull();
  });

  it("shows loading indicator when loading", () => {
    setTeams([], true);
    render(<TeamsScreen />);

    // Neither team names nor empty state should render during loading
    expect(screen.queryByText("Team Alpha")).toBeNull();
    expect(screen.queryByText("No Teams Yet")).toBeNull();
  });

  it("tapping a team navigates to team detail", () => {
    render(<TeamsScreen />);

    fireEvent.press(screen.getByLabelText("View team: Team Alpha"));

    expect(mockPush).toHaveBeenCalledWith("/(coach)/teams/team-1");
  });

  it("shows create form when New Team button pressed", () => {
    render(<TeamsScreen />);

    expect(screen.queryByPlaceholderText("Team name")).toBeNull();

    fireEvent.press(screen.getByLabelText("Create new team"));

    expect(screen.getByPlaceholderText("Team name")).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Description (optional)"),
    ).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
    expect(screen.getByText("Create")).toBeTruthy();
  });

  it("delete button calls delete mutation", () => {
    // Capture the "Delete" callback from Alert.alert and call it
    let onDelete: (() => void) | null = null;
    (require("react-native").Alert.alert as jest.Mock).mockImplementation(
      (_title: string, _msg: string, buttons: any[]) => {
        const deleteBtn = (buttons || []).find(
          (b: any) => b.text === "Delete",
        );
        onDelete = deleteBtn?.onPress ?? null;
      },
    );

    render(<TeamsScreen />);

    fireEvent.press(screen.getByLabelText("Delete team Team Alpha"));

    expect(onDelete).not.toBeNull();
    onDelete!();
    expect(mockDeleteTeamMutate).toHaveBeenCalledWith("team-1");
  });

  it("renders member count for each team", () => {
    render(<TeamsScreen />);

    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
  });
});
