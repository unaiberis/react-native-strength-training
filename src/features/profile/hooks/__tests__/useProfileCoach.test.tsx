/**
 * Tests for useProfileCoach hook.
 *
 * Validates fetching coach(es) for the authenticated athlete,
 * including enabled guards and error handling.
 */

// Mock auth store with mutable state
let mockUserId = "user-1";
let mockRole = "athlete";
jest.mock("@/stores/auth-store", () => ({
  useAuthStore: jest.fn((selector: any) => {
    const state = { user: { id: mockUserId }, role: mockRole };
    return selector ? selector(state) : state;
  }),
}));

// Mock the coach-athletes service
const mockGetAthleteCoach = jest.fn();
jest.mock("@/lib/pocketbase/services/coach-athletes", () => ({
  getAthleteCoach: (...args: any[]) => mockGetAthleteCoach(...args),
}));

import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProfileCoach } from "../useProfileCoach";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useProfileCoach", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = "user-1";
    mockRole = "athlete";
  });

  it("returns coaches for the authenticated athlete", async () => {
    mockGetAthleteCoach.mockResolvedValueOnce([
      { id: "coach-1", displayName: "Coach One", email: "coach@test.com" },
    ]);

    const { result } = renderHook(() => useProfileCoach(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.coaches).toHaveLength(1);
    expect(result.current.coaches[0].displayName).toBe("Coach One");
    expect(mockGetAthleteCoach).toHaveBeenCalledWith("user-1");
  });

  it("returns empty array when no coaches found", async () => {
    mockGetAthleteCoach.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useProfileCoach(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.coaches).toEqual([]);
  });

  it("does not fetch when user is not authenticated (no userId)", () => {
    mockUserId = "";

    const { result } = renderHook(() => useProfileCoach(), {
      wrapper: createWrapper(),
    });

    expect(mockGetAthleteCoach).not.toHaveBeenCalled();
  });

  it("does not fetch when role is not athlete", () => {
    mockRole = "coach";

    const { result } = renderHook(() => useProfileCoach(), {
      wrapper: createWrapper(),
    });

    expect(mockGetAthleteCoach).not.toHaveBeenCalled();
  });

  it("surfaces service errors", async () => {
    mockGetAthleteCoach.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useProfileCoach(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBeDefined());

    expect(result.current.coaches).toEqual([]);
  });
});
