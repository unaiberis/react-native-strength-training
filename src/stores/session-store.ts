import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────────

export interface LoggedSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe: number | null;
  rir: number | null;
  isWarmup: boolean;
  tempo?: string | null;
  loggedAt: string;
}

export interface ExerciseInSession {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  targetRpeLow: number | null;
  targetRpeHigh: number | null;
  restSeconds: number;
  notes: string | null;
  loggedSets: LoggedSet[];
}

interface RestTimerState {
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
}

interface SessionStore {
  /** The active workout session ID (null when no workout in progress) */
  activeSessionId: string | null;
  /** The template this session was started from (null for blank workouts) */
  workoutTemplateId: string | null;
  /** Exercises for the current workout (pre-filled from template or added manually) */
  exercises: ExerciseInSession[];
  /** Index into the exercises array — which exercise the user is currently on */
  currentExerciseIndex: number;
  /** Session start time for computing elapsed duration */
  startedAt: string | null;

  // Rest timer
  restTimer: RestTimerState;

  // ─── Actions ───────────────────────────────────────────────────────────

  /** Start a new session — populates the store from the service response */
  startSession: (
    sessionId: string,
    templateId: string | null,
    exercises: Omit<ExerciseInSession, "loggedSets">[],
  ) => void;

  /** Navigate to a specific exercise */
  setCurrentExerciseIndex: (index: number) => void;

  /** Record a logged set for the given exercise */
  addLoggedSet: (exerciseId: string, set: LoggedSet) => void;

  /** Start the rest timer for a given duration (seconds) */
  startRest: (seconds: number) => void;

  /** Decrement the rest timer by one second */
  tickRest: () => void;

  /** Stop the rest timer early */
  stopRest: () => void;

  /** Reset the entire store (after session complete/cancel) */
  clearSession: () => void;
}

// ─── Initial state ───────────────────────────────────────────────────────

const initialRestTimer: RestTimerState = {
  isRunning: false,
  remainingSeconds: 0,
  totalSeconds: 0,
};

const initialState = {
  activeSessionId: null as string | null,
  workoutTemplateId: null as string | null,
  exercises: [] as ExerciseInSession[],
  currentExerciseIndex: 0,
  startedAt: null as string | null,
  restTimer: { ...initialRestTimer },
};

// ─── Store ───────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,

  startSession: (sessionId, templateId, exercises) => {
    // Persist active session id to SyncMeta (fire-and-forget)
    persistActiveSessionId(sessionId);

    return set({
      activeSessionId: sessionId,
      workoutTemplateId: templateId,
      exercises: exercises.map((ex) => ({ ...ex, loggedSets: [] })),
      currentExerciseIndex: 0,
      startedAt: new Date().toISOString(),
      restTimer: { ...initialRestTimer },
    });
  },

  setCurrentExerciseIndex: (index) =>
    set({ currentExerciseIndex: index }),

  addLoggedSet: (exerciseId, setRecord) =>
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.exerciseId === exerciseId
          ? { ...ex, loggedSets: [...ex.loggedSets, setRecord] }
          : ex,
      ),
    })),

  startRest: (seconds) =>
    set({
      restTimer: {
        isRunning: true,
        remainingSeconds: Math.max(1, seconds),
        totalSeconds: Math.max(1, seconds),
      },
    }),

  tickRest: () =>
    set((state) => {
      const next = state.restTimer.remainingSeconds - 1;
      if (next <= 0) {
        return { restTimer: { ...state.restTimer, isRunning: false, remainingSeconds: 0 } };
      }
      return { restTimer: { ...state.restTimer, remainingSeconds: next } };
    }),

  stopRest: () =>
    set((state) => ({
      restTimer: { ...state.restTimer, isRunning: false, remainingSeconds: 0 },
    })),

  clearSession: () => {
    // Clear active session id from SyncMeta (fire-and-forget)
    clearActiveSessionId();

    return set({ ...initialState });
  },
}));

// ─── Helpers: SyncMeta persistence (fire-and-forget) ────────────────────

async function persistActiveSessionId(sessionId: string): Promise<void> {
  try {
    const [{ getDb }, { SyncMeta }] = await Promise.all([
      import("../lib/db/database"),
      import("../lib/db/sync-meta"),
    ]);
    const db = await getDb();
    const meta = new SyncMeta(db);
    await meta.setActiveSessionId(sessionId);
  } catch {
    // Best effort — DB may not be initialised yet
  }
}

async function clearActiveSessionId(): Promise<void> {
  try {
    const [{ getDb }, { SyncMeta }] = await Promise.all([
      import("../lib/db/database"),
      import("../lib/db/sync-meta"),
    ]);
    const db = await getDb();
    const meta = new SyncMeta(db);
    await meta.clearActiveSessionId();
  } catch {
    // Best effort
  }
}
