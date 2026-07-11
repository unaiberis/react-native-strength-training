import React from "react";
import { render, screen } from "@testing-library/react-native";
import fs from "fs";
import path from "path";

let capturedScreens: any[] = [];
const mockPush = jest.fn();

jest.mock("expo-router", () => {
  const TabsScreen = ({ name }: any) => null;
  const Tabs = ({ children }: any) => {
    capturedScreens = React.Children.toArray(children);
    return null;
  };
  Tabs.Screen = TabsScreen;
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
    useSegments: () => [],
    useLocalSearchParams: () => ({}),
    Stack: { Screen: () => null },
    Tabs,
  };
});

jest.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector?: any) => {
    const state = {
      state: "authenticated",
      role: "athlete",
      isTeamCoach: false,
      isOnline: true,
      syncStatus: "idle",
    };
    return selector ? selector(state) : state;
  },
}));

import TabsLayout from "../_layout";

function screenNames(): string[] {
  return capturedScreens
    .map((child: any) => child?.props?.name)
    .filter((n: any) => typeof n === "string");
}

describe("TabsLayout progress tab removal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedScreens = [];
  });

  it("does not register a 'progress' tab screen (RED 2.3)", () => {
    render(<TabsLayout />);
    const names = screenNames();
    expect(names).not.toContain("progress");
  });

  it("does not map a 'progress' icon in tabIcons (RED 2.3)", () => {
    const layoutPath = path.join(__dirname, "..", "_layout.tsx");
    const source = fs.readFileSync(layoutPath, "utf8");
    expect(source).not.toMatch(/progress:\s*"trending-up-outline"/);
  });
});
