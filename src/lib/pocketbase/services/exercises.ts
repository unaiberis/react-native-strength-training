import { pb } from "../client";
import type { ExerciseRow } from "../../../types/pocketbase";

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
  const filter = category && category !== "all" ? `category = '${category}'` : "";

  try {
    const result = await pb.collection("exercises").getList(page + 1, pageSize, {
      filter,
      sort: "name",
    });

    return {
      data: (result.items ?? []) as unknown as ExerciseRow[],
      count: result.totalItems,
    };
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch exercises");
  }
}

/**
 * Fetch a single exercise by ID.
 */
export async function getExercise(id: string): Promise<ExerciseRow | null> {
  try {
    const record = await pb.collection("exercises").getOne(id);
    return record as unknown as ExerciseRow;
  } catch (err: any) {
    if (
      err?.status === 404 ||
      err?.message?.includes("The requested resource wasn't found")
    ) {
      return null;
    }
    throw new Error(err.message ?? "Failed to fetch exercise");
  }
}

/**
 * Search exercises by name (case-insensitive).
 */
export async function searchExercises(
  query: string,
  limit = 20,
): Promise<ExerciseRow[]> {
  try {
    const records = await pb.collection("exercises").getFullList({
      filter: `name ~ '${query}'`,
      sort: "name",
    });

    return (records ?? []) as unknown as ExerciseRow[];
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to search exercises");
  }
}

/**
 * Get distinct exercise categories.
 */
export async function getCategories(): Promise<string[]> {
  try {
    const records = await pb.collection("exercises").getFullList({
      fields: "category",
    });

    const categories = [...new Set((records ?? []).map((r: any) => r.category))];
    return categories.sort();
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to fetch categories");
  }
}

// ─── Coach CRUD Operations ──────────────────────────────────────────────

/** Input for creating a new exercise. */
export interface CreateExerciseInput {
  name: string;
  category: string;
  equipment?: string[] | null;
  bodyRegion?: string | null;
  description?: string | null;
  defaultSets?: number;
  defaultReps?: number;
  defaultRestSeconds?: number;
  videoUrl?: string | null;
}

/** Input for updating an existing exercise. */
export interface UpdateExerciseInput {
  name?: string;
  category?: string;
  equipment?: string[] | null;
  bodyRegion?: string | null;
  description?: string | null;
  defaultSets?: number;
  defaultReps?: number;
  defaultRestSeconds?: number;
  videoUrl?: string | null;
}

/**
 * Create a new exercise (coach-facing).
 */
export async function createExercise(
  input: CreateExerciseInput,
  coachId: string,
): Promise<ExerciseRow> {
  try {
    const record = await pb.collection("exercises").create({
      name: input.name,
      category: input.category,
      equipment: input.equipment ?? null,
      body_region: input.bodyRegion ?? null,
      description: input.description ?? null,
      default_sets: input.defaultSets ?? 3,
      default_reps: input.defaultReps ?? 10,
      default_rest_seconds: input.defaultRestSeconds ?? 90,
      video_url: input.videoUrl ?? null,
      is_public: false,
      is_archived: false,
      created_by: coachId,
    });

    if (!record) throw new Error("Failed to create exercise");
    return record as unknown as ExerciseRow;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to create exercise");
  }
}

/**
 * Update an existing exercise (coach-facing).
 */
export async function updateExercise(
  id: string,
  input: UpdateExerciseInput,
): Promise<ExerciseRow> {
  try {
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.category !== undefined) payload.category = input.category;
    if (input.equipment !== undefined) payload.equipment = input.equipment;
    if (input.bodyRegion !== undefined) payload.body_region = input.bodyRegion;
    if (input.description !== undefined) payload.description = input.description;
    if (input.defaultSets !== undefined) payload.default_sets = input.defaultSets;
    if (input.defaultReps !== undefined) payload.default_reps = input.defaultReps;
    if (input.defaultRestSeconds !== undefined) payload.default_rest_seconds = input.defaultRestSeconds;
    if (input.videoUrl !== undefined) payload.video_url = input.videoUrl;

    const record = await pb.collection("exercises").update(id, payload);

    if (!record) throw new Error("Exercise not found");
    return record as unknown as ExerciseRow;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to update exercise");
  }
}

/**
 * Soft-delete an exercise by setting is_archived = true.
 * The exercise remains in the DB (history intact) but is hidden from lists.
 */
export async function archiveExercise(id: string): Promise<void> {
  try {
    await pb.collection("exercises").update(id, { is_archived: true });
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to archive exercise");
  }
}

/**
 * Restore an archived exercise.
 */
export async function unarchiveExercise(id: string): Promise<void> {
  try {
    await pb.collection("exercises").update(id, { is_archived: false });
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to restore exercise");
  }
}
