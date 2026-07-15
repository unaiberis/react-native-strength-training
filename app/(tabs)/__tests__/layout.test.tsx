import React from "react";
import { render, screen, act } from "@testing-library/react-native";
import fs from "fs";
import path from "path";

let capturedScreens: any[] = [];
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => {
  const TabsScreen = ({ name, options }: any) => {
    // Exercise the tabBarIcon callback so its body is covered.
    if (options && options.tabBarIcon) options.tabBarIcon({ focused: false });
    return null;
  };
  const Tabs = ({ children }: any) => {
    capturedScreens = React.Children.toArray(children);
    return <>{children}</>;
  };
  Tabs.Screen = TabsScreen;
  return {
    useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
    useSegments: () => [],
    useLocalSearchParams: () => ({}),
    usePathname: () => "/(tabs)/home",
    Stack: { Screen: () => null },
    Tabs,
  };
});

const mockAuthState: any = {
  state: "authenticated",
  role: "athlete",
  isTeamCoach: false,
  isOnline: true,
  syncStatus: "idle",
};

jest.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector?: any) =>
    selector ? selector(mockAuthState) : mockAuthState,
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
    mockAuthState.state = "authenticated";
    mockAuthState.role = "athlete";
    mockAuthState.isTeamCoach = false;
    mockAuthState.isOnline = true;
    mockAuthState.syncStatus = "idle";
    jest.useRealTimers();
  });

  it("does not register a 'progress' tab screen (RED 2.3)", () => {
    render(<TabsLayout />);
    expect(screenNames()).not.toContain("progress");
  });

  it("does not map a 'progress' icon in tabIcons (RED 2.3)", () => {
    const layoutPath = path.join(__dirname, "..", "_layout.tsx");
    const source = fs.readFileSync(layoutPath, "utf8");
    expect(source).not.toMatch(/progress:\s*"trending-up-outline"/);
  });

  it("redirects to login when unauthenticated", () => {
    jest.useFakeTimers();
    mockAuthState.state = "unauthenticated";
    render(<TabsLayout />);
    act(() => {
      jest.runAllTimers();
    });
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
  });

  it("shows the coach submenu for coach users", () => {
    mockAuthState.role = "coach";
    render(<TabsLayout />);
    expect(screen.getByText("Athletes")).toBeTruthy();
    expect(screen.getByText("Templates")).toBeTruthy();
  });

  it("hides the coach submenu for athlete users", () => {
    mockAuthState.role = "athlete";
    render(<TabsLayout />);
    expect(screen.queryByText("Athletes")).toBeNull();
    expect(screen.queryByText("Templates")).toBeNull();
  });
});
