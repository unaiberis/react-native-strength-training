import { supabase } from "../client";

export interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  equipment: string[] | null;
  body_region: string | null;
  description: string | null;
  default_sets: number;
  default_reps: number;
  default_rest_seconds: number;
  is_public: boolean;
  created_at: string;
}

export interface ExerciseListResult {
  data: ExerciseRow[];
  count: number;
}

/**
 * Fetch a paginated list of exercises, optionally filtered by category.
 */
export async function listExercises(
  category?: string | null,
  page = 0,
  pageSize = 20,
): Promise<ExerciseListResult> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("exercises")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range(from, to);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return { data: (data ?? []) as ExerciseRow[], count: count ?? 0 };
}

/**
 * Fetch a single exercise by ID.
 */
export async function getExercise(id: string): Promise<ExerciseRow | null> {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(error.message);
  }

  return data as ExerciseRow;
}

/**
 * Search exercises by name (case-insensitive).
 */
export async function searchExercises(
  query: string,
  limit = 20,
): Promise<ExerciseRow[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .ilike("name", `%${query}%`)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ExerciseRow[];
}

/**
 * Get distinct exercise categories.
 */
export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("category")
    .order("category", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const categories = [...new Set(data.map((r) => r.category))];
  return categories;
}
