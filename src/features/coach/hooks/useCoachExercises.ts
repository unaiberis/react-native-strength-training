import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  listExercises,
  getExercise,
  createExercise,
  updateExercise,
  archiveExercise,
  unarchiveExercise,
  getCategories,
  type CreateExerciseInput,
  type UpdateExerciseInput,
} from "@/lib/pocketbase/services/exercises";

const COACH_EXERCISES_QUERY_KEY = "coach-exercises";
const EXERCISE_CATEGORIES_KEY = "exercise-categories";

/**
 * Query hook for coach exercise list — includes archived exercises.
 */
export function useCoachExercises(category?: string | null, page = 0) {
  return useQuery({
    queryKey: [COACH_EXERCISES_QUERY_KEY, category, page],
    queryFn: () => listExercises(category, page, 50),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Query hook for fetching a single exercise.
 */
export function useCoachExercise(id: string | undefined) {
  return useQuery({
    queryKey: [COACH_EXERCISES_QUERY_KEY, id],
    queryFn: () => getExercise(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Query hook for exercise categories.
 */
export function useCoachCategories() {
  return useQuery({
    queryKey: [EXERCISE_CATEGORIES_KEY],
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Mutation hook to create a new exercise.
 */
export function useCreateExercise() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (input: CreateExerciseInput) => createExercise(input, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COACH_EXERCISES_QUERY_KEY] });
    },
  });
}

/**
 * Mutation hook to update an existing exercise.
 */
export function useUpdateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: { id: string } & UpdateExerciseInput) => updateExercise(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COACH_EXERCISES_QUERY_KEY] });
    },
  });
}

/**
 * Mutation hook to archive (soft-delete) an exercise.
 */
export function useArchiveExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COACH_EXERCISES_QUERY_KEY] });
    },
  });
}

/**
 * Mutation hook to restore an archived exercise.
 */
export function useUnarchiveExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unarchiveExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COACH_EXERCISES_QUERY_KEY] });
    },
  });
}
