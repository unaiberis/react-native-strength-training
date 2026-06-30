import { useQuery } from "@tanstack/react-query";
import * as ExercisesService from "../../../lib/supabase/services/exercises";

const EXERCISES_QUERY_KEY = "exercises";
const CATEGORIES_QUERY_KEY = "exercise-categories";

/**
 * Query hook for paginated exercise list with optional category filter.
 */
export function useExercises(category?: string | null, page = 0, pageSize = 20) {
  return useQuery({
    queryKey: [EXERCISES_QUERY_KEY, category, page, pageSize],
    queryFn: () => ExercisesService.listExercises(category, page, pageSize),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Query hook for fetching a single exercise by ID.
 */
export function useExercise(id: string | undefined) {
  return useQuery({
    queryKey: [EXERCISES_QUERY_KEY, id],
    queryFn: () => ExercisesService.getExercise(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Query hook for searching exercises by name.
 */
export function useExerciseSearch(query: string) {
  return useQuery({
    queryKey: [EXERCISES_QUERY_KEY, "search", query],
    queryFn: () => ExercisesService.searchExercises(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 30,
  });
}

/**
 * Query hook for fetching distinct exercise categories.
 */
export function useCategories() {
  return useQuery({
    queryKey: [CATEGORIES_QUERY_KEY],
    queryFn: () => ExercisesService.getCategories(),
    staleTime: 1000 * 60 * 30,
  });
}
