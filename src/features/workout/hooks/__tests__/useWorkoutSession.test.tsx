import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../../../../lib/pocketbase/services/sessions', () => ({
  createSession: jest.fn(),
  logSet: jest.fn(),
  completeSession: jest.fn(),
  cancelSession: jest.fn(),
}));

// Mock expo-sqlite for the session-store dynamic imports (fire-and-forget)
jest.mock('expo-sqlite', () => ({}));

import * as SessionsService from '../../../../lib/pocketbase/services/sessions';
import { useAuthStore } from '../../../../stores/auth-store';
import { useSessionStore } from '../../../../stores/session-store';
import {
  useCreateSession,
  useLogSet,
  useCompleteSession,
  useCancelSession,
} from '../useWorkoutSession';

// ─── Wrapper ─────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockSessionResult = {
  session: { id: 'session-1', workout_template_id: 'template-1' },
  exercises: [
    {
      exerciseId: 'ex-1',
      exerciseName: 'Bench Press',
      targetSets: 3,
      targetReps: 10,
      targetRpeLow: null,
      targetRpeHigh: null,
      restSeconds: 90,
      notes: null,
    },
  ],
};

const mockSetResult = {
  id: 'set-1',
  workout_session_id: 'session-1',
  exercise_id: 'ex-1',
  set_number: 1,
  weight_kg: 80,
  reps: 10,
  rpe: null,
  rir: null,
  is_warmup: false,
  tempo: null,
};

const mockCompletedSession = {
  id: 'session-1',
  status: 'completed',
};

const logSetInput = {
  exerciseId: 'ex-1',
  setNumber: 1,
  weightKg: 80,
  reps: 10,
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Set up auth store with authenticated user and online
  useAuthStore.setState({
    state: 'authenticated',
    session: { user: { id: 'user-1' } } as any,
    user: { id: 'user-1' } as any,
    isOnline: true,
  });

  // Reset session store to initial state
  useSessionStore.setState({
    activeSessionId: 'session-1',
    workoutTemplateId: null,
    exercises: [],
    currentExerciseIndex: 0,
    startedAt: '2026-01-01T10:00:00Z',
    restTimer: { isRunning: false, remainingSeconds: 0, totalSeconds: 0 },
  });

  // Set up mock service responses
  (SessionsService.createSession as jest.Mock).mockResolvedValue(
    mockSessionResult
  );
  (SessionsService.logSet as jest.Mock).mockResolvedValue(mockSetResult);
  (SessionsService.completeSession as jest.Mock).mockResolvedValue(
    mockCompletedSession
  );
  (SessionsService.cancelSession as jest.Mock).mockResolvedValue(
    mockCompletedSession
  );
});

// ─── useCreateSession ────────────────────────────────────────────────────────

describe('useCreateSession', () => {
  it('calls createSession and starts session in store', async () => {
    const { result } = renderHook(() => useCreateSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        workoutTemplateId: 'template-1',
      });
    });

    expect(SessionsService.createSession).toHaveBeenCalledWith('user-1', {
      workoutTemplateId: 'template-1',
    });

    const state = useSessionStore.getState();
    expect(state.activeSessionId).toBe('session-1');
    expect(state.workoutTemplateId).toBe('template-1');
    expect(state.exercises).toHaveLength(1);
    expect(state.exercises[0].exerciseName).toBe('Bench Press');
  });

  it('calls createSession without template', async () => {
    const { result } = renderHook(() => useCreateSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    expect(SessionsService.createSession).toHaveBeenCalledWith(
      'user-1',
      undefined
    );
  });

  it('throws when createSession fails', async () => {
    (SessionsService.createSession as jest.Mock).mockRejectedValue(
      new Error('Create failed')
    );

    const { result } = renderHook(() => useCreateSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(undefined)).rejects.toThrow(
        'Create failed'
      );
    });
  });
});

// ─── useLogSet ────────────────────────────────────────────────────────────────

describe('useLogSet', () => {
  it('calls logSet and adds set to store', async () => {
    // Pre-populate the store with an active session that has exercises
    // (startSession is normally called by useCreateSession on success)
    useSessionStore.getState().startSession('session-1', 'template-1', [
      {
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        targetSets: 3,
        targetReps: 10,
        targetRpeLow: null,
        targetRpeHigh: null,
        restSeconds: 90,
        notes: null,
      },
    ]);

    const { result } = renderHook(() => useLogSet(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(logSetInput);
    });

    expect(SessionsService.logSet).toHaveBeenCalledWith(
      'session-1',
      logSetInput
    );

    const state = useSessionStore.getState();
    expect(state.exercises[0].loggedSets).toHaveLength(1);
    expect(state.exercises[0].loggedSets[0].weightKg).toBe(80);
  });

  it('throws when logSet fails', async () => {
    (SessionsService.logSet as jest.Mock).mockRejectedValue(
      new Error('Log failed')
    );

    const { result } = renderHook(() => useLogSet(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(logSetInput)).rejects.toThrow(
        'Log failed'
      );
    });
  });
});

// ─── useCompleteSession ─────────────────────────────────────────────────────

describe('useCompleteSession', () => {
  it('calls completeSession and does not clear store', async () => {
    const { result } = renderHook(() => useCompleteSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ notes: 'Great session' });
    });

    expect(SessionsService.completeSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ notes: 'Great session' })
    );

    // Store should NOT be cleared — the calling view does it
    const state = useSessionStore.getState();
    expect(state.activeSessionId).toBe('session-1');
  });

  it('throws when completeSession fails', async () => {
    (SessionsService.completeSession as jest.Mock).mockRejectedValue(
      new Error('Complete failed')
    );

    const { result } = renderHook(() => useCompleteSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(undefined)).rejects.toThrow(
        'Complete failed'
      );
    });
  });
});

// ─── useCancelSession ────────────────────────────────────────────────────────

describe('useCancelSession', () => {
  it('calls cancelSession and clears the store', async () => {
    const { result } = renderHook(() => useCancelSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    expect(SessionsService.cancelSession).toHaveBeenCalledWith('session-1');

    const state = useSessionStore.getState();
    expect(state.activeSessionId).toBeNull();
    expect(state.exercises).toEqual([]);
  });

  it('throws when cancelSession fails', async () => {
    (SessionsService.cancelSession as jest.Mock).mockRejectedValue(
      new Error('Cancel failed')
    );

    const { result } = renderHook(() => useCancelSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync(undefined as any)
      ).rejects.toThrow('Cancel failed');
    });
  });
});
