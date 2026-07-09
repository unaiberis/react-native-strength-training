import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// Mock the notifications hook so we can control its return value per test
const mockMarkAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();
const mockRefetch = jest.fn();

let mockNotifications: any[] = [];
let mockUnreadCount = 0;

jest.mock("@/features/notifications/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: mockNotifications,
    unreadCount: mockUnreadCount,
    isLoading: false,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    refetch: mockRefetch,
  }),
}));

// Mock expo-router
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Tabs: () => null,
}));

import NotificationsScreen from "../notifications";

function createMockNotifications() {
  return [
    {
      id: "n1",
      type: "workout_assigned",
      title: "New Workout",
      body: "A new workout has been assigned.",
      read: false,
      created_at: new Date(Date.now() - 3_600_000).toISOString(),
    },
    {
      id: "n2",
      type: "achievement",
      title: "New PR!",
      body: "You set a new record.",
      read: true,
      created_at: new Date(Date.now() - 86_400_000).toISOString(),
    },
  ];
}

describe("NotificationsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotifications = [];
    mockUnreadCount = 0;
  });

  it("renders empty state when no notifications", () => {
    const { getByText } = render(<NotificationsScreen />);

    expect(getByText("No notifications yet")).toBeTruthy();
    expect(getByText(/they will appear here/i)).toBeTruthy();
  });

  it("renders notification list with items", () => {
    mockNotifications = createMockNotifications();
    mockUnreadCount = 1;

    const { getByText, queryByText } = render(<NotificationsScreen />);

    // Shows notification titles
    expect(getByText("New Workout")).toBeTruthy();
    expect(getByText("New PR!")).toBeTruthy();

    // Shows Mark All Read button when there are unread
    expect(getByText("Mark All Read")).toBeTruthy();

    // Empty state should not be present
    expect(queryByText("No notifications yet")).toBeNull();
  });

  it("shows time-ago formatting for each notification", () => {
    mockNotifications = createMockNotifications();
    mockUnreadCount = 1;

    const { getByText } = render(<NotificationsScreen />);

    // n1 was created 1h ago
    expect(getByText("1h ago")).toBeTruthy();
    // n2 was created 1d ago
    expect(getByText("1d ago")).toBeTruthy();
  });

  it("Mark All Read button calls markAllAsRead", () => {
    mockNotifications = createMockNotifications();
    mockUnreadCount = 1;

    const { getByText } = render(<NotificationsScreen />);

    fireEvent.press(getByText("Mark All Read"));
    expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1);
  });

  it("tap on notification marks as read and navigates to detail", () => {
    mockNotifications = createMockNotifications();
    mockUnreadCount = 1;

    const { getByText } = render(<NotificationsScreen />);

    fireEvent.press(getByText("New Workout"));

    // Should mark as read
    expect(mockMarkAsRead).toHaveBeenCalledWith("n1");

    // Should navigate to detail with correct params
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(tabs)/notification/[id]",
      params: {
        id: "n1",
        type: "workout_assigned",
        title: "New Workout",
        body: "A new workout has been assigned.",
        createdAt: expect.any(String),
        hasAction: "1",
      },
    });
  });

  it("does not show Mark All Read when all notifications are read", () => {
    mockNotifications = createMockNotifications().map((n) => ({
      ...n,
      read: true,
    }));
    mockUnreadCount = 0;

    const { queryByText } = render(<NotificationsScreen />);

    expect(queryByText("Mark All Read")).toBeNull();
  });
});
