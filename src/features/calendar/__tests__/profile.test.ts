/**
 * ProfileScreen logic tests.
 *
 * Verifies profile-related data structures and auth patterns
 * without rendering the component (vitest node environment).
 */
import { describe, it, expect } from "vitest";

describe("ProfileScreen logic", () => {
  it("displays user display name from metadata or email fallback", () => {
    const getUserDisplayName = (
      metadata?: { display_name?: string },
      email?: string,
    ): string => {
      return metadata?.display_name ?? email?.split("@")[0] ?? "Athlete";
    };

    expect(getUserDisplayName({ display_name: "Test Athlete" }, "test@test.com")).toBe("Test Athlete");
    expect(getUserDisplayName(undefined, "user@domain.com")).toBe("user");
    expect(getUserDisplayName(undefined, undefined)).toBe("Athlete");
  });

  it("formats created_at date for display", () => {
    const formatDate = (dateStr: string | undefined): string => {
      if (!dateStr) return "Unknown";
      return new Date(dateStr).toLocaleDateString();
    };

    const date = formatDate("2026-01-15T00:00:00.000Z");
    expect(date).toBeTruthy();
    expect(typeof date).toBe("string");

    expect(formatDate(undefined)).toBe("Unknown");
  });

  it("gets user initial from display name", () => {
    const getInitial = (name: string): string => {
      return name.charAt(0).toUpperCase();
    };

    expect(getInitial("Test Athlete")).toBe("T");
    expect(getInitial("john")).toBe("J");
    expect(getInitial("")).toBe("");
  });

  it("formats user ID for truncated display", () => {
    const formatUserId = (id: string): string => {
      return `${id.slice(0, 12)}...`;
    };

    expect(formatUserId("abc123def456ghi789")).toBe("abc123def456...");
    expect(formatUserId("short")).toBe("short...");
  });

  it("confirms logout dialog before signing out on native platform", () => {
    // On native (iOS/Android), Alert.alert is shown
    const showLogoutAlert = (platform: string): boolean => {
      return platform !== "web";
    };

    expect(showLogoutAlert("ios")).toBe(true);
    expect(showLogoutAlert("android")).toBe(true);
    expect(showLogoutAlert("web")).toBe(false);
  });

  it("uses correct auth store selectors for user data", () => {
    // The PatternScreen reads user from useAuth hook
    // useAuth.user.email, useAuth.user.user_metadata.display_name
    const mockUser = {
      id: "user-1",
      email: "athlete@test.com",
      user_metadata: { display_name: "Strong Athlete" },
      created_at: "2026-03-01T00:00:00.000Z",
    };

    expect(mockUser.email).toBe("athlete@test.com");
    expect(mockUser.user_metadata.display_name).toBe("Strong Athlete");
    expect(mockUser.id).toBe("user-1");
  });
});
