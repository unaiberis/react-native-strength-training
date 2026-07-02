// Mock expo-sqlite before any imports (needed by database.ts which session-store imports)
jest.mock('expo-sqlite', () => ({}));

import { useSessionStore, type LoggedSet } from '../session-store';

// Reset the store before each test
beforeEach(() => {
  useSessionStore.setState({
    activeSessionId: null,
    workoutTemplateId: null,
    exercises: [],
    currentExerciseIndex: 0,
    startedAt: null,
    restTimer: { isRunning: false, remainingSeconds: 0, totalSeconds: 0 },
  });
});

function makeExercise(exerciseId: string, name: string) {
  return {
    exerciseId,
    exerciseName: name,
    targetSets: 3,
    targetReps: 10,
    targetRpeLow: null,
    targetRpeHigh: null,
    restSeconds: 90,
    notes: null,
    loggedSets: [] as LoggedSet[],
  };
}

// ─── Initial State ─────────────────────────────────────────────────────────

describe('session-store initial state', () => {
  it('has no active session', () => {
    const { activeSessionId } = useSessionStore.getState();
    expect(activeSessionId).toBeNull();
  });

  it('has empty exercises array', () => {
    const { exercises } = useSessionStore.getState();
    expect(exercises).toEqual([]);
  });

  it('has rest timer stopped at 0', () => {
    const { restTimer } = useSessionStore.getState();
    expect(restTimer.isRunning).toBe(false);
    expect(restTimer.remainingSeconds).toBe(0);
  });
});

// ─── startSession ──────────────────────────────────────────────────────────

describe('startSession', () => {
  it('populates store with session data', () => {
    const exercises = [
      makeExercise('ex-1', 'Squat'),
      makeExercise('ex-2', 'Bench'),
    ];
    useSessionStore
      .getState()
      .startSession('session-1', 'template-1', exercises);

    const state = useSessionStore.getState();
    expect(state.activeSessionId).toBe('session-1');
    expect(state.workoutTemplateId).toBe('template-1');
    expect(state.exercises).toHaveLength(2);
    expect(state.exercises[0].exerciseName).toBe('Squat');
    expect(state.exercises[1].exerciseName).toBe('Bench');
    expect(state.currentExerciseIndex).toBe(0);
    expect(state.startedAt).not.toBeNull();
    expect(state.restTimer.isRunning).toBe(false);
  });

  it('initializes each exercise with empty loggedSets', () => {
    const exercises = [makeExercise('ex-1', 'Squat')];
    useSessionStore.getState().startSession('session-1', null, exercises);

    const { exercises: stored } = useSessionStore.getState();
    expect(stored[0].loggedSets).toEqual([]);
  });

  it('accepts a null template (blank workout)', () => {
    useSessionStore.getState().startSession('session-1', null, []);
    expect(useSessionStore.getState().workoutTemplateId).toBeNull();
  });
});

// ─── setCurrentExerciseIndex ───────────────────────────────────────────────

describe('setCurrentExerciseIndex', () => {
  it('updates the current exercise index', () => {
    const exercises = [
      makeExercise('ex-1', 'Squat'),
      makeExercise('ex-2', 'Bench'),
    ];
    useSessionStore.getState().startSession('s1', null, exercises);
    useSessionStore.getState().setCurrentExerciseIndex(1);

    expect(useSessionStore.getState().currentExerciseIndex).toBe(1);
  });

  it('allows setting index to 0 after previously being non-zero', () => {
    const exercises = [
      makeExercise('ex-1', 'Squat'),
      makeExercise('ex-2', 'Bench'),
    ];
    useSessionStore.getState().startSession('s1', null, exercises);
    useSessionStore.getState().setCurrentExerciseIndex(1);
    useSessionStore.getState().setCurrentExerciseIndex(0);

    expect(useSessionStore.getState().currentExerciseIndex).toBe(0);
  });
});

// ─── addLoggedSet ──────────────────────────────────────────────────────────

describe('addLoggedSet', () => {
  it('adds a logged set to the matching exercise', () => {
    const exercises = [
      makeExercise('ex-1', 'Squat'),
      makeExercise('ex-2', 'Bench'),
    ];
    useSessionStore.getState().startSession('s1', null, exercises);

    const set: LoggedSet = {
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      rpe: 8,
      rir: null,
      isWarmup: false,
      loggedAt: new Date().toISOString(),
    };
    useSessionStore.getState().addLoggedSet('ex-1', set);

    const { exercises: stored } = useSessionStore.getState();
    expect(stored[0].loggedSets).toHaveLength(1);
    expect(stored[0].loggedSets[0].weightKg).toBe(100);
    expect(stored[1].loggedSets).toHaveLength(0); // other exercise untouched
  });

  it('appends multiple sets to the same exercise', () => {
    const exercises = [makeExercise('ex-1', 'Squat')];
    useSessionStore.getState().startSession('s1', null, exercises);

    const set1: LoggedSet = {
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      rpe: 8,
      rir: null,
      isWarmup: false,
      loggedAt: new Date().toISOString(),
    };
    const set2: LoggedSet = {
      setNumber: 2,
      weightKg: 100,
      reps: 8,
      rpe: 9,
      rir: null,
      isWarmup: false,
      loggedAt: new Date().toISOString(),
    };

    useSessionStore.getState().addLoggedSet('ex-1', set1);
    useSessionStore.getState().addLoggedSet('ex-1', set2);

    expect(useSessionStore.getState().exercises[0].loggedSets).toHaveLength(2);
  });
});

// ─── Rest Timer ────────────────────────────────────────────────────────────

describe('rest timer', () => {
  it('starts the rest timer with given seconds', () => {
    useSessionStore.getState().startRest(90);
    const { restTimer } = useSessionStore.getState();
    expect(restTimer.isRunning).toBe(true);
    expect(restTimer.remainingSeconds).toBe(90);
    expect(restTimer.totalSeconds).toBe(90);
  });

  it('startRest clamps to minimum of 1 second', () => {
    useSessionStore.getState().startRest(0);
    const { restTimer } = useSessionStore.getState();
    expect(restTimer.isRunning).toBe(true);
    expect(restTimer.remainingSeconds).toBe(1);
  });

  it('tickRest decrements the timer', () => {
    useSessionStore.getState().startRest(3);
    useSessionStore.getState().tickRest();
    expect(useSessionStore.getState().restTimer.remainingSeconds).toBe(2);
  });

  it('tickRest stops the timer when reaching 0', () => {
    useSessionStore.getState().startRest(1);
    useSessionStore.getState().tickRest();
    const { restTimer } = useSessionStore.getState();
    expect(restTimer.isRunning).toBe(false);
    expect(restTimer.remainingSeconds).toBe(0);
  });

  it('tickRest does not go negative', () => {
    useSessionStore.getState().startRest(1);
    useSessionStore.getState().tickRest(); // -> 0, stops
    useSessionStore.getState().tickRest(); // should stay at 0
    expect(useSessionStore.getState().restTimer.remainingSeconds).toBe(0);
  });

  it('stopRest stops the timer and resets to 0', () => {
    useSessionStore.getState().startRest(90);
    useSessionStore.getState().stopRest();
    const { restTimer } = useSessionStore.getState();
    expect(restTimer.isRunning).toBe(false);
    expect(restTimer.remainingSeconds).toBe(0);
  });
});

// ─── clearSession ──────────────────────────────────────────────────────────

describe('clearSession', () => {
  it('resets to initial state', () => {
    // Set up a complex state
    useSessionStore
      .getState()
      .startSession('s1', 't1', [makeExercise('ex-1', 'Squat')]);
    useSessionStore.getState().addLoggedSet('ex-1', {
      setNumber: 1,
      weightKg: 100,
      reps: 8,
      rpe: 8,
      rir: null,
      isWarmup: false,
      loggedAt: new Date().toISOString(),
    });
    useSessionStore.getState().startRest(30);

    // Now clear
    useSessionStore.getState().clearSession();

    const state = useSessionStore.getState();
    expect(state.activeSessionId).toBeNull();
    expect(state.workoutTemplateId).toBeNull();
    expect(state.exercises).toEqual([]);
    expect(state.currentExerciseIndex).toBe(0);
    expect(state.startedAt).toBeNull();
    expect(state.restTimer.isRunning).toBe(false);
    expect(state.restTimer.remainingSeconds).toBe(0);
  });
});
