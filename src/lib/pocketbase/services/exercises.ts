import { pb } from '../client';
import type { ExerciseRow } from '../../../types/pocketbase';

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
  pageSize = 20
): Promise<ExerciseListResult> {
  const filter =
    category && category !== 'all' ? `category = '${category}'` : '';

  try {
    const result = await pb
      .collection('exercises')
      .getList(page + 1, pageSize, {
        filter,
        sort: 'name',
      });

    return {
      data: (result.items ?? []) as unknown as ExerciseRow[],
      count: result.totalItems,
    };
  } catch (err: any) {
    throw new Error(err.message ?? 'Failed to fetch exercises');
  }
}

/**
 * Fetch a single exercise by ID.
 */
export async function getExercise(id: string): Promise<ExerciseRow | null> {
  try {
    const record = await pb.collection('exercises').getOne(id);
    return record as unknown as ExerciseRow;
  } catch (err: any) {
    if (
      err?.status === 404 ||
      err?.message?.includes("The requested resource wasn't found")
    ) {
      return null;
    }
    throw new Error(err.message ?? 'Failed to fetch exercise');
  }
}

/**
 * Search exercises by name (case-insensitive).
 */
export async function searchExercises(
  query: string,
  limit = 20
): Promise<ExerciseRow[]> {
  // limit is intentionally unused — PocketBase getFullList ignores page size
  void limit;
  try {
    const records = await pb.collection('exercises').getFullList({
      filter: `name ~ '${query}'`,
      sort: 'name',
    });

    return (records ?? []) as unknown as ExerciseRow[];
  } catch (err: any) {
    throw new Error(err.message ?? 'Failed to search exercises');
  }
}

/**
 * Get distinct exercise categories.
 */
export async function getCategories(): Promise<string[]> {
  try {
    const records = await pb.collection('exercises').getFullList({
      fields: 'category',
    });

    const categories = [
      ...new Set((records ?? []).map((r: any) => r.category)),
    ];
    return categories.sort();
  } catch (err: any) {
    throw new Error(err.message ?? 'Failed to fetch categories');
  }
}
