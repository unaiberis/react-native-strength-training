import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mock Auth Store ────────────────────────────────────────────────────────

const mockUserId = "user-123";
jest.mock("@/stores/auth-store", () => ({
  useAuthStore: jest.fn((selector: any) => {
    const state = { user: { id: mockUserId }, isOnline: true };
    return selector ? selector(state) : state;
  }),
}));

// ─── Mock Session Store ──────────────────────────────────────────────────────

const mockStartSession = jest.fn();
const mockAddLoggedSet = jest.fn();
const mockClearSession = jest.fn();
let mockActiveSessionId = "session-1";
let mockStartedAt = "2026-07-07T10:00:00Z";

jest.mock("@/stores/session-store", () => ({
  useSessionStore: jest.fn((selector: any) => {
    const state = {
      activeSessionId: mockActiveSessionId,
      startedAt: mockStartedAt,
      exercises: [],
      currentExerciseIndex: 0,
      restTimer: { isRunning: false, remainingSeconds: 0, totalSeconds: 0 },
      startSession: mockStartSession,
      addLoggedSet: mockAddLoggedSet,
      clearSession: mockClearSession,
      tickRest: jest.fn(),
      stopRest: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// ─── Mock Sessions Service ───────────────────────────────────────────────────

const mockCreateSession = jest.fn();
const mockLogSet = jest.fn();
const mockCompleteSession = jest.fn();
const mockCancelSession = jest.fn();

jest.mock("@/lib/pocketbase/services/sessions", () => ({
  __esModule: true,
  createSession: (...args: any[]) => mockCreateSession(...args),
  logSet: (...args: any[]) => mockLogSet(...args),
  completeSession: (...args: any[]) => mockCompleteSession(...args),
  cancelSession: (...args: any[]) => mockCancelSession(...args),
  updateSessionDuration: jest.fn(),
  getWorkoutSession: jest.fn(),
  getSessionDetail: jest.fn(),
}));

import {
  useCreateSession,
  useLogSet,
  useCompleteSession,
  useCancelSession,
  useClearSession,
  useCurrentExercise,
  useIsCurrentExerciseComplete,
  useSessionDetail,
  useUpdateDuration,
} from "../useWorkoutSession";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useCreateSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a new session online and updates store", async () => {
    const mockResult = {
      session: { id: "session-new", workout_template_id: null },
      exercises: [],
    };
    mockCreateSession.mockResolvedValueOnce(mockResult);

    const { result } = renderHook(() => useCreateSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(undefined as any);
    });

    expect(mockCreateSession).toHaveBeenCalledWith(mockUserId, undefined);
    expect(mockStartSession).toHaveBeenCalledWith("session-new", null, []);
  });

  it("creates a session with template id", async () => {
    const mockResult = {
      session: { id: "session-tmpl", workout_template_id: "tmpl-1" },
      exercises: [{ exerciseId: "ex-1", exerciseName: "Bench Press", targetSets: 3, targetReps: 10 }],
    };
    mockCreateSession.mockResolvedValueOnce(mockResult);

    const { result } = renderHook(() => useCreateSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ workoutTemplateId: "tmpl-1" });
    });

    expect(mockCreateSession).toHaveBeenCalledWith(mockUserId, {
      workoutTemplateId: "tmpl-1",
    });
    expect(mockStartSession).toHaveBeenCalledWith(
      "session-tmpl",
      "tmpl-1",
      mockResult.exercises,
    );
  });

  it("handles create session error", async () => {
    mockCreateSession.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useCreateSession(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync(undefined as any);
      }),
    ).rejects.toThrow("Network error");
  });
});

describe("useLogSet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("logs a set online and updates store", async () => {
    const setRecord = { id: "set-1", exercise_id: "ex-1" };
    mockLogSet.mockResolvedValueOnce(setRecord);

    const input = {
      exerciseId: "ex-1",
      setNumber: 1,
      weightKg: 100,
      reps: 5,
      rpe: 8,
      rir: null,
      isWarmup: false,
    };

    const { result } = renderHook(() => useLogSet(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(mockLogSet).toHaveBeenCalledWith(mockActiveSessionId, input);
    expect(mockAddLoggedSet).toHaveBeenCalledWith("ex-1", expect.objectContaining({
      setNumber: 1,
      weightKg: 100,
      reps: 5,
      rpe: 8,
    }));
  });

  it("handles log set error", async () => {
    mockLogSet.mockRejectedValueOnce(new Error("DB error"));

    const { result } = renderHook(() => useLogSet(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          exerciseId: "ex-1",
          setNumber: 1,
          weightKg: 100,
          reps: 5,
        });
      }),
    ).rejects.toThrow("DB error");
  });
});

describe("useCompleteSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("completes a session online", async () => {
    const completedRecord = { id: "session-1", status: "completed" };
    mockCompleteSession.mockResolvedValueOnce(completedRecord);

    const { result } = renderHook(() => useCompleteSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ notes: "Great workout" });
    });

    expect(mockCompleteSession).toHaveBeenCalledWith(
      mockActiveSessionId,
      expect.objectContaining({
        notes: "Great workout",
        startedAt: mockStartedAt,
      }),
    );
  });

  it("handles complete session error", async () => {
    mockCompleteSession.mockRejectedValueOnce(new Error("Session not found"));

    const { result } = renderHook(() => useCompleteSession(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync(undefined as any);
      }),
    ).rejects.toThrow("Session not found");
  });
});

describe("useCancelSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("cancels a session and clears store", async () => {
    mockCancelSession.mockResolvedValueOnce({ id: "session-1", status: "cancelled" });

    const { result } = renderHook(() => useCancelSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockCancelSession).toHaveBeenCalledWith(mockActiveSessionId);
    expect(mockClearSession).toHaveBeenCalled();
  });

  it("handles cancel session error", async () => {
    mockCancelSession.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useCancelSession(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync();
      }),
    ).rejects.toThrow("Network error");
  });
});

describe("useClearSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a function that clears the session", () => {
    const { result } = renderHook(() => useClearSession(), {
      wrapper: createWrapper(),
    });

    result.current();

    expect(mockClearSession).toHaveBeenCalled();
  });
});

describe("useCurrentExercise", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when no exercises", () => {
    const { result } = renderHook(() => useCurrentExercise(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeNull();
  });

  it("returns null when index is out of bounds", () => {
    const storeModule = require("@/stores/session-store");
    storeModule.useSessionStore.mockImplementation((selector: any) => {
      const state = {
        exercises: [{ exerciseId: "ex-1", exerciseName: "Bench Press" }],
        currentExerciseIndex: 5, // out of bounds
      };
      return selector ? selector(state) : state;
    });

    const { result } = renderHook(() => useCurrentExercise(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeNull();
  });

  it("returns current exercise when index is valid", () => {
    const storeModule = require("@/stores/session-store");
    storeModule.useSessionStore.mockImplementation((selector: any) => {
      const state = {
        exercises: [{ exerciseId: "ex-1", exerciseName: "Bench Press", targetSets: 3, loggedSets: [] }],
        currentExerciseIndex: 0,
      };
      return selector ? selector(state) : state;
    });

    const { result } = renderHook(() => useCurrentExercise(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual({ exerciseId: "ex-1", exerciseName: "Bench Press", targetSets: 3, loggedSets: [] });
  });
});

describe("useIsCurrentExerciseComplete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns false when no current exercise", () => {
    const { result } = renderHook(() => useIsCurrentExerciseComplete(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(false);
  });

  it("returns false when not all sets are logged", () => {
    const storeModule = require("@/stores/session-store");
    storeModule.useSessionStore.mockImplementation((selector: any) => {
      const state = {
        exercises: [{ exerciseId: "ex-1", exerciseName: "Bench Press", targetSets: 3, loggedSets: [{ setNumber: 1 }] }],
        currentExerciseIndex: 0,
      };
      return selector ? selector(state) : state;
    });

    const { result } = renderHook(() => useIsCurrentExerciseComplete(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(false);
  });

  it("returns true when all target sets are logged", () => {
    const storeModule = require("@/stores/session-store");
    storeModule.useSessionStore.mockImplementation((selector: any) => {
      const state = {
        exercises: [{
          exerciseId: "ex-1",
          exerciseName: "Bench Press",
          targetSets: 3,
          loggedSets: [{ setNumber: 1 }, { setNumber: 2 }, { setNumber: 3 }],
        }],
        currentExerciseIndex: 0,
      };
      return selector ? selector(state) : state;
    });

    const { result } = renderHook(() => useIsCurrentExerciseComplete(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(true);
  });
});

describe("useSessionDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("is disabled when sessionId is undefined", () => {
    const { result } = renderHook(() => useSessionDetail(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
  });
});

describe("useUpdateDuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls updateSessionDuration via the service", async () => {
    const sessionsModule = require("@/lib/pocketbase/services/sessions");
    sessionsModule.updateSessionDuration = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateDuration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ sessionId: "s1", durationMinutes: 45 });
    });

    expect(sessionsModule.updateSessionDuration).toHaveBeenCalledWith("s1", 45);
  });
});
