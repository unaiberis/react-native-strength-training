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

  it("shows the offline banner when not online", () => {
    mockAuthState.isOnline = false;
    render(<TabsLayout />);
    expect(
      screen.getByText(/You're offline/i),
    ).toBeTruthy();
  });

  it.each([
    ["syncing", /Syncing/i],
    ["dead-letters", /Some changes couldn't sync/i],
    ["auth-expired", /Session expired/i],
    ["error", /Sync error/i],
  ])("shows the sync banner for status %s", (status, matcher) => {
    mockAuthState.syncStatus = status;
    render(<TabsLayout />);
    expect(screen.getByText(matcher)).toBeTruthy();
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

  it("redirects to coach tabs when authenticated team coach", () => {
    jest.useFakeTimers();
    mockAuthState.state = "authenticated";
    mockAuthState.isTeamCoach = true;
    render(<TabsLayout />);
    act(() => {
      jest.runAllTimers();
    });
    expect(mockReplace).toHaveBeenCalledWith("/(coach)");
  });
});
