import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/auth-store";
import { useSessionStore } from "../../../stores/session-store";
import * as SessionsService from "../../../lib/supabase/services/sessions";
import type { LogSetInput, CompleteSessionInput } from "../../../lib/supabase/services/sessions";

const SESSIONS_QUERY_KEY = "sessions";

// ─── Start Session ───────────────────────────────────────────────────────

/**
 * Create a new workout session.
 *
 * Accepts an optional `workoutTemplateId` — when provided the template's
 * exercises are pre-filled into the session store.
 *
 * On success the Zustand store is populated with session + exercise state.
 * The calling component is responsible for navigation.
 */
export function useCreateSession() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const store = useSessionStore();

  return useMutation({
    mutationFn: (options?: { workoutTemplateId?: string; programBlockId?: string }) =>
      SessionsService.createSession(userId!, options),
    onSuccess: (data) => {
      store.startSession(
        data.session.id,
        data.session.workout_template_id,
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
 * On success the Zustand store is updated with the logged set.
 */
export function useLogSet() {
  const store = useSessionStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LogSetInput) =>
      SessionsService.logSet(store.activeSessionId!, input),
    onSuccess: (_data, input) => {
      store.addLoggedSet(input.exerciseId, {
        setNumber: input.setNumber,
        weightKg: input.weightKg,
        reps: input.reps,
        rpe: input.rpe ?? null,
        rir: input.rir ?? null,
        isWarmup: input.isWarmup ?? false,
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
 * On success the store is cleared and the caller navigates to complete screen.
 */
export function useCompleteSession() {
  const store = useSessionStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input?: CompleteSessionInput) =>
      SessionsService.completeSession(store.activeSessionId!, {
        ...input,
        startedAt: store.startedAt ?? undefined,
      }),
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

  return useMutation({
    mutationFn: () => SessionsService.cancelSession(store.activeSessionId!),
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
    queryFn: () => SessionsService.getSession(sessionId!),
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
