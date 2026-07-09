import { renderHook, act } from "@testing-library/react-native";
import { useNotifications, type AppNotification } from "../useNotifications";

// ─── Fixtures ─────────────────────────────────────────────────────────────

function createMockNotifications(): AppNotification[] {
  return [
    {
      id: "n1",
      type: "workout_assigned",
      title: "New Workout Assigned",
      body: "Your coach assigned a new workout for tomorrow.",
      read: false,
      created_at: new Date(Date.now() - 3_600_000).toISOString(), // 1h ago
    },
    {
      id: "n2",
      type: "achievement",
      title: "New PR!",
      body: "You set a new personal record on Bench Press.",
      read: true,
      created_at: new Date(Date.now() - 86_400_000).toISOString(), // 1d ago
    },
    {
      id: "n3",
      type: "system",
      title: "Welcome",
      body: "Welcome to the app!",
      read: false,
      created_at: new Date().toISOString(),
    },
  ];
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("useNotifications", () => {
  it("returns empty list initially", () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("markAsRead updates read state for a single notification", () => {
    const mock = createMockNotifications();
    const { result } = renderHook(() => useNotifications(mock));

    expect(result.current.notifications[0].read).toBe(false);

    act(() => {
      result.current.markAsRead("n1");
    });

    expect(result.current.notifications[0].read).toBe(true);
    // Other notifications should not be affected
    expect(result.current.notifications[1].read).toBe(true);
    expect(result.current.notifications[2].read).toBe(false);
  });

  it("markAllAsRead marks every notification as read", () => {
    const mock = createMockNotifications();
    const { result } = renderHook(() => useNotifications(mock));

    expect(result.current.unreadCount).toBe(2);

    act(() => {
      result.current.markAllAsRead();
    });

    expect(result.current.notifications.every((n) => n.read)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it("unreadCount decreases after markAsRead", () => {
    const mock = createMockNotifications();
    const { result } = renderHook(() => useNotifications(mock));

    expect(result.current.unreadCount).toBe(2);

    act(() => {
      result.current.markAsRead("n3");
    });

    expect(result.current.unreadCount).toBe(1);

    act(() => {
      result.current.markAsRead("n1");
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it("refetch is callable and does not throw", () => {
    const { result } = renderHook(() => useNotifications());

    expect(() => {
      act(() => {
        result.current.refetch();
      });
    }).not.toThrow();
  });
});
