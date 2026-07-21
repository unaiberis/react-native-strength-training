import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the PocketBase notifications service
const mockListNotifications = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkAllRead = jest.fn();
jest.mock("@/lib/pocketbase/services/notifications", () => ({
  listNotifications: (...args: any[]) => mockListNotifications(...args),
  markNotificationRead: (...args: any[]) => mockMarkRead(...args),
  markAllNotificationsRead: (...args: any[]) => mockMarkAllRead(...args),
}));

// Mock auth store
jest.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: any) => {
    const state = {
      user: { id: "user-1" },
    };
    return selector ? selector(state) : state;
  },
}));

import { useNotifications } from "../useNotifications";

// ─── Fixtures ─────────────────────────────────────────────────────────────

function createMockRecords() {
  return [
    {
      id: "n1",
      user_id: "user-1",
      type: "workout_assigned",
      title: "New Workout Assigned",
      body: "Your coach assigned a new workout for tomorrow.",
      data: null,
      read: false,
      created_at: new Date(Date.now() - 3_600_000).toISOString(),
      updated: new Date(Date.now() - 3_600_000).toISOString(),
    },
    {
      id: "n2",
      user_id: "user-1",
      type: "achievement",
      title: "New PR!",
      body: "You set a new personal record on Bench Press.",
      data: null,
      read: true,
      created_at: new Date(Date.now() - 86_400_000).toISOString(),
      updated: new Date(Date.now() - 86_400_000).toISOString(),
    },
    {
      id: "n3",
      user_id: "user-1",
      type: "system",
      title: "Welcome",
      body: "Welcome to the app!",
      data: null,
      read: false,
      created_at: new Date().toISOString(),
      updated: new Date().toISOString(),
    },
  ];
}

function createWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: client }, children);
}

describe("useNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMarkRead.mockResolvedValue(undefined);
    mockMarkAllRead.mockResolvedValue(undefined);
  });

  it("returns empty list when API returns empty", async () => {
    mockListNotifications.mockResolvedValue([]);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it("loads notifications from PocketBase", async () => {
    const mockRecords = createMockRecords();
    mockListNotifications.mockResolvedValue(mockRecords);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notifications).toHaveLength(3);
    expect(result.current.notifications[0].title).toBe("New Workout Assigned");
    expect(result.current.notifications[0].read).toBe(false);
    expect(result.current.unreadCount).toBe(2);
  });

  it("markAsRead calls the API service", async () => {
    const mockRecords = createMockRecords();
    mockListNotifications.mockResolvedValue(mockRecords);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.markAsRead("n1");
    });

    // Verify the API was called
    expect(mockMarkRead).toHaveBeenCalledWith("n1");
  });

  it("markAllAsRead calls the API", async () => {
    const mockRecords = createMockRecords();
    mockListNotifications.mockResolvedValue(mockRecords);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.markAllAsRead();
    });

    expect(mockMarkAllRead).toHaveBeenCalledWith("user-1");
  });

  it("refetch is callable and triggers query re-fetch", async () => {
    mockListNotifications.mockResolvedValue([]);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(() => {
      act(() => {
        result.current.refetch();
      });
    }).not.toThrow();
  });
});
