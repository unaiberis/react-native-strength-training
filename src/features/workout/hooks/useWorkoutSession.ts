import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/auth-store";
import { useSessionStore } from "../../../stores/session-store";
import * as SessionsService from "../../../lib/pocketbase/services/sessions";
import type { LogSetInput, CompleteSessionInput } from "../../../lib/pocketbase/services/sessions";
// Offline modules imported dynamically — expo-sqlite native module unavailable on web
// import { getDb, ChangeQueue, OfflineSessionsService } from "../../../lib/db";

const SESSIONS_QUERY_KEY = "sessions";

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Lazily create an OfflineSessionsService instance using the singleton DB.
 * Dynamic import to avoid loading expo-sqlite on web (no native module).
 */
async function createOfflineSessions(): Promise<any> {
  const [{ getDb }, { ChangeQueue }, { OfflineSessionsService }] =
    await Promise.all([
      import("../../../lib/db/database"),
      import("../../../lib/db/change-queue"),
      import("../../../lib/db/services/offline-sessions"),
    ]);
  const db = await getDb();
  const queue = new ChangeQueue(db);
  return new OfflineSessionsService(db, queue);
}

// ─── Start Session ───────────────────────────────────────────────────────

/**
 * Create a new workout session.
 *
 * Accepts an optional `workoutTemplateId` — when provided the template's
 * exercises are pre-filled into the session store.
 *
 * Branches on connectivity: offline → OfflineSessionsService,
 * online → existing SessionsService.
 *
 * On success the Zustand store is populated with session + exercise state.
 * The calling component is responsible for navigation.
 */
export function useCreateSession() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const isOnline = useAuthStore((s) => s.isOnline);
  const store = useSessionStore();

  return useMutation({
    mutationFn: async (options?: { workoutTemplateId?: string; programBlockId?: string }) => {
      if (!isOnline) {
        const svc = await createOfflineSessions();
        const session = await svc.createSession(userId!, options?.workoutTemplateId);
        return {
          session: { id: session.id, workout_template_id: session.template_id },
          exercises: [] as SessionsService.SessionExercise[],
        };
      }
      return SessionsService.createSession(userId!, options);
    },
    onSuccess: (data) => {
      store.startSession(
        (data.session as any).id,
        (data.session as any).workout_template_id,
        data.exercises,
      );
      queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] });
    },
  });
}

// ─── Log Set ─────────────────────────────────────────────────────────────

/**
 * Log a set for the active session.
 *
 * Branches on connectivity: offline → OfflineSessionsService,
 * online → existing SessionsService.
 *
 * On success the Zustand store is updated with the logged set.
 */
export function useLogSet() {
  const store = useSessionStore();
  const queryClient = useQueryClient();
  const isOnline = useAuthStore((s) => s.isOnline);

  return useMutation({
    mutationFn: async (input: LogSetInput) => {
      if (!isOnline) {
        const svc = await createOfflineSessions();
        return svc.logSet(store.activeSessionId!, input as any);
      }
      return SessionsService.logSet(store.activeSessionId!, input);
    },
    onSuccess: (_data, input) => {
      store.addLoggedSet(input.exerciseId, {
        setNumber: input.setNumber,
        weightKg: input.weightKg,
        reps: input.reps,
        rpe: input.rpe ?? null,
        rir: input.rir ?? null,
        isWarmup: input.isWarmup ?? false,
        tempo: input.tempo ?? null,
        round: input.round ?? null,
        timerRemaining: input.timerRemaining ?? null,
        loggedAt: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] });
    },
  });
}

// ─── Complete Session ────────────────────────────────────────────────────

/**
 * Complete the active workout session.
 *
 * Branches on connectivity: offline → OfflineSessionsService,
 * online → existing SessionsService.
 *
 * On success the store is cleared and the caller navigates to complete screen.
 */
export function useCompleteSession() {
  const store = useSessionStore();
  const queryClient = useQueryClient();
  const isOnline = useAuthStore((s) => s.isOnline);

  return useMutation({
    mutationFn: async (input?: CompleteSessionInput) => {
      if (!isOnline) {
        const svc = await createOfflineSessions();
        await svc.completeSession(store.activeSessionId!, {
          notes: input?.notes ?? undefined,
        } as any);
        return;
      }
      return SessionsService.completeSession(store.activeSessionId!, {
        ...input,
        startedAt: store.startedAt ?? undefined,
      });
    },
    onSuccess: () => {
      // NOTE: Store is NOT cleared here — the calling view does it
      // after gathering summary data for the complete screen.
      queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] });
    },
  });
}

/**
 * Clear the session store after the complete screen has rendered.
 * Call this from the complete screen when navigating away.
 */
export function useClearSession() {
  const store = useSessionStore();
  return useCallback(() => store.clearSession(), [store]);
}

// ─── Cancel Session ──────────────────────────────────────────────────────

/**
 * Cancel the active workout session.
 *
 * On success the store is cleared.
 */
export function useCancelSession() {
  const store = useSessionStore();
  const queryClient = useQueryClient();
  const isOnline = useAuthStore((s) => s.isOnline);

  return useMutation({
    mutationFn: async () => {
      if (!isOnline) {
        const svc = await createOfflineSessions();
        await svc.cancelSession(store.activeSessionId!);
        return;
      }
      return SessionsService.cancelSession(store.activeSessionId!);
    },
    onSuccess: () => {
      store.clearSession();
      queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] });
    },
  });
}

// ─── Update duration ─────────────────────────────────────────────────────

/**
 * Update the elapsed duration of a session (called when completing).
 */
export function useUpdateDuration() {
  return useMutation({
    mutationFn: ({
      sessionId,
      durationMinutes,
    }: {
      sessionId: string;
      durationMinutes: number;
    }) => SessionsService.updateSessionDuration(sessionId, durationMinutes),
  });
}

// ─── Get Active Session (for rehydration / app state restore) ────────────

/**
 * Fetch the full session detail (with sets) from the server.
 */
export function useSessionDetail(sessionId: string | undefined) {
  return useQuery({
    queryKey: [SESSIONS_QUERY_KEY, sessionId],
    queryFn: () => SessionsService.getWorkoutSession(sessionId!),
    enabled: !!sessionId,
  });
}

// ─── Helper: compute the current exercise for convenience ────────────────

/**
 * Returns the current exercise object from the session store.
 */
export function useCurrentExercise() {
  const exercises = useSessionStore((s) => s.exercises);
  const index = useSessionStore((s) => s.currentExerciseIndex);

  if (exercises.length === 0) return null;
  if (index < 0 || index >= exercises.length) return null;

  return exercises[index];
}

/**
 * Check if all target sets for the current exercise have been logged.
 */
export function useIsCurrentExerciseComplete() {
  const current = useCurrentExercise();
  if (!current) return false;
  const setsLogged = current.loggedSets.length;
  return setsLogged >= current.targetSets;
}
