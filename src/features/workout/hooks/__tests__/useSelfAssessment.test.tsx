import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSaveSelfAssessment, validateSelfAssessment } from "../useSelfAssessment";

// Mock the auth store
const mockUserId = "user-123";
jest.mock("@/stores/auth-store", () => ({
  useAuthStore: jest.fn((selector: any) => {
    const state = { user: { id: mockUserId } };
    return selector ? selector(state) : state;
  }),
}));

// Mock the wellness service
const mockCreateWellnessEntry = jest.fn();
jest.mock("@/lib/pocketbase/services/wellness", () => ({
  createWellnessEntry: (...args: unknown[]) => mockCreateWellnessEntry(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("validateSelfAssessment", () => {
  it("returns valid for complete, valid input", () => {
    const result = validateSelfAssessment({
      sessionRpe: 7,
      sleepQuality: 4,
      fatigue: 3,
      soreness: 2,
      mood: 5,
    });
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("rejects missing RPE", () => {
    const result = validateSelfAssessment({
      sleepQuality: 4,
      fatigue: 3,
      soreness: 2,
      mood: 5,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.sessionRpe).toBe("Session RPE is required");
  });

  it("rejects RPE out of range (0)", () => {
    const result = validateSelfAssessment({
      sessionRpe: 0,
      sleepQuality: 4,
      fatigue: 3,
      soreness: 2,
      mood: 5,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.sessionRpe).toBe("Session RPE must be between 1 and 10");
  });

  it("rejects sleep quality out of range", () => {
    const result = validateSelfAssessment({
      sessionRpe: 5,
      sleepQuality: 6,
      fatigue: 3,
      soreness: 2,
      mood: 4,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.sleepQuality).toBe("Sleep quality must be between 1 and 5");
  });

  it("rejects missing multiple fields", () => {
    const result = validateSelfAssessment({});
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors)).toHaveLength(5);
  });
});

describe("useSaveSelfAssessment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls createWellnessEntry with correct data on submit", async () => {
    mockCreateWellnessEntry.mockResolvedValue({
      id: "w1",
      user_id: mockUserId,
      date: "2026-07-07",
    });

    const { result } = renderHook(() => useSaveSelfAssessment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        sessionId: "session-456",
        date: "2026-07-07",
        sessionRpe: 8,
        sleepQuality: 4,
        fatigue: 3,
        soreness: 2,
        mood: 5,
      });
    });

    expect(mockCreateWellnessEntry).toHaveBeenCalledWith(mockUserId, {
      date: "2026-07-07",
      session_rpe: 8,
      sleep: 4,
      fatigue: 3,
      soreness: 2,
      mood: 5,
      session_id: "session-456",
    });
  });

  it("throws error when user is not authenticated", async () => {
    // Override mock to return no user
    const authStore = require("@/stores/auth-store");
    authStore.useAuthStore.mockImplementation((selector: any) => {
      const state = { user: null };
      return selector ? selector(state) : state;
    });

    const { result } = renderHook(() => useSaveSelfAssessment(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        date: "2026-07-07",
        sessionRpe: 8,
        sleepQuality: 4,
        fatigue: 3,
        soreness: 2,
        mood: 5,
      }),
    ).rejects.toThrow("User not authenticated");
  });

  it("handles createWellnessEntry failure", async () => {
    // Restore auth store mock
    const authStore = require("@/stores/auth-store");
    authStore.useAuthStore.mockImplementation((selector: any) => {
      const state = { user: { id: mockUserId } };
      return selector ? selector(state) : state;
    });

    mockCreateWellnessEntry.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSaveSelfAssessment(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        date: "2026-07-07",
        sessionRpe: 8,
        sleepQuality: 4,
        fatigue: 3,
        soreness: 2,
        mood: 5,
      }),
    ).rejects.toThrow("Network error");
  });
});
