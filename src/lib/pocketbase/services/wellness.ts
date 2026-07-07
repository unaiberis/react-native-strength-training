import { pb } from "@/lib/pocketbase/client";
import type { WellnessRow } from "@/types/pocketbase";

const WELLNESS_COLLECTION = "daily_wellness";

/**
 * Create a daily wellness entry for the given user and date.
 * Uses UNIQUE(user_id, date) constraint — caller should handle
 * the error if an entry already exists.
 */
export async function createWellnessEntry(
  userId: string,
  data: {
    date: string;
    session_rpe?: number | null;
    sleep?: number | null;
    fatigue?: number | null;
    soreness?: number | null;
    mood?: number | null;
    session_id?: string | null;
  },
): Promise<WellnessRow> {
  const record = await pb.collection(WELLNESS_COLLECTION).create({
    user_id: userId,
    date: data.date,
    session_rpe: data.session_rpe ?? null,
    sleep: data.sleep ?? null,
    fatigue: data.fatigue ?? null,
    soreness: data.soreness ?? null,
    mood: data.mood ?? null,
    session_id: data.session_id ?? null,
  });
  return record as unknown as WellnessRow;
}

/**
 * Get a wellness entry for a specific user and date.
 * Returns null if no entry exists.
 */
export async function getWellnessEntry(
  userId: string,
  date: string,
): Promise<WellnessRow | null> {
  try {
    const record = await pb.collection(WELLNESS_COLLECTION).getFirstListItem(
      `user_id="${userId}" && date="${date}"`,
    );
    return record as unknown as WellnessRow;
  } catch {
    return null;
  }
}
