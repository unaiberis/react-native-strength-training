import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// ─── Mock expo-router (override global setup to capture navigation) ──────────

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Tabs: () => null,
}));

// ─── Mock auth hooks ─────────────────────────────────────────────────────────

const mockLogout = jest.fn();
jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "test@example.com", created_at: "2026-01-01T00:00:00Z", displayName: "Test User" },
    logout: mockLogout,
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// ─── Mock useProfileStats ────────────────────────────────────────────────────

const mockUseProfileStats = jest.fn();
jest.mock("@/features/profile/hooks/useProfileStats", () => ({
  useProfileStats: (...args: any[]) => mockUseProfileStats(...args),
}));

// ─── Mock usePendingSyncCount ────────────────────────────────────────────────

const mockUsePendingSyncCount = jest.fn();
jest.mock("@/features/profile/hooks/usePendingSyncCount", () => ({
  usePendingSyncCount: (...args: any[]) => mockUsePendingSyncCount(...args),
}));

// ─── Mock useProfileCoach ────────────────────────────────────────────────────

const mockUseProfileCoach = jest.fn();
jest.mock("@/features/profile/hooks/useProfileCoach", () => ({
  useProfileCoach: (...args: any[]) => mockUseProfileCoach(...args),
}));

// ─── Mock useUserTeams ──────────────────────────────────────────────────────

const mockUseUserTeams = jest.fn();
jest.mock("@/features/coach/hooks/useTeams", () => ({
  useUserTeams: (...args: any[]) => mockUseUserTeams(...args),
}));

// ─── Mock useNotifications ───────────────────────────────────────────────────

const mockUseNotifications = jest.fn();
jest.mock("@/features/notifications/hooks/useNotifications", () => ({
  useNotifications: (...args: any[]) => mockUseNotifications(...args),
}));

// ─── Mock Auth Store ─────────────────────────────────────────────────────────

jest.mock("@/stores/auth-store", () => ({
  useAuthStore: jest.fn((selector: any) => {
    const state = { role: null, isTeamCoach: false };
    return selector ? selector(state) : state;
  }),
}));

// Mock ScreenLayout to avoid reanimated animation issues
jest.mock("@/shared/ui/ScreenLayout", () => ({
  ScreenLayout: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

import { ProfileScreen } from "../ProfileScreen";

function defaultMocks() {
  mockUseProfileStats.mockReturnValue({
    data: { totalWorkouts: 50, currentStreak: 7, personalRecords: 12, totalVolume: 25000 },
    isLoading: false,
    isSuccess: true,
  });
  mockUsePendingSyncCount.mockReturnValue({
    data: { pending: 0, deadLetters: 0, authErrors: 0, hasPending: false },
  });
  mockUseUserTeams.mockReturnValue({
    data: [],
    isLoading: false,
  });
  mockUseNotifications.mockReturnValue({
    unreadCount: 0,
    notifications: [],
    isLoading: false,
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    refetch: jest.fn(),
  });
  mockUseProfileCoach.mockReturnValue({
    coaches: [],
    isLoading: false,
    error: null,
  });
}

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaultMocks();
  });

  it("renders user display name and email", () => {
    render(<ProfileScreen />);

    expect(screen.getByText("Test User")).toBeTruthy();
    expect(screen.getByText("test@example.com")).toBeTruthy();
  });

  it("renders stat cards with correct values", () => {
    render(<ProfileScreen />);

    expect(screen.getByText("50")).toBeTruthy();
    expect(screen.getByText("7 days")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("25.0t")).toBeTruthy(); // 25000 kg → 25.0t
  });

  it("renders profile menu items", () => {
    render(<ProfileScreen />);

    expect(screen.getAllByText("Edit Profile").length).toBe(1);
    expect(screen.getByText("Wellness Dashboard")).toBeTruthy();
    expect(screen.getByText("Workout History")).toBeTruthy();
    expect(screen.getByText("Help & Support")).toBeTruthy();
    expect(screen.getByText("Sign Out")).toBeTruthy();
  });

  it("renders Account Info section", () => {
    render(<ProfileScreen />);

    expect(screen.getByText("Account Info")).toBeTruthy();
    expect(screen.getByText("Member since")).toBeTruthy();
    expect(screen.getByText("User ID")).toBeTruthy();
  });

  it("renders without sync badge when no pending items", () => {
    render(<ProfileScreen />);

    expect(screen.queryByText(/pending sync/i)).toBeNull();
  });

  it("shows warning sync badge when pending items exist", () => {
    mockUsePendingSyncCount.mockReturnValue({
      data: { pending: 3, deadLetters: 0, authErrors: 0, hasPending: true },
    });

    render(<ProfileScreen />);

    expect(screen.getByText("3 pending sync")).toBeTruthy();
  });

  it("shows danger sync badge when dead letters or auth errors exist", () => {
    mockUsePendingSyncCount.mockReturnValue({
      data: { pending: 0, deadLetters: 2, authErrors: 1, hasPending: true },
    });

    render(<ProfileScreen />);

    expect(screen.getByText("3 pending sync")).toBeTruthy();
  });

  it("shows notification badge when notifications exist", () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 5,
      notifications: [],
      isLoading: false,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      refetch: jest.fn(),
    });

    render(<ProfileScreen />);

    expect(screen.getByText("5")).toBeTruthy();
  });

  it("renders Notifications menu item", () => {
    render(<ProfileScreen />);

    expect(screen.getByText("Notifications")).toBeTruthy();
  });

  it("navigates to edit-profile when Edit Profile is pressed", () => {
    render(<ProfileScreen />);

    fireEvent.press(screen.getAllByText("Edit Profile")[0]);
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/edit-profile");
  });
});
