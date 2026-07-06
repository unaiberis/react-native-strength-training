import { pb } from "../client";

// ─── Types ──────────────────────────────────────────────────────────────

export interface DailyWellnessInput {
  sessionId?: string | null;
  date: string;
  sessionRpe: number;
  sleepQuality: number;
  fatigue: number;
  soreness: number;
  mood: number;
  notes?: string | null;
}

export interface DailyWellnessRow {
  id: string;
  user_id: string;
  session_id: string | null;
  date: string;
  session_rpe: number;
  sleep_quality: number;
  fatigue: number;
  soreness: number;
  mood: number;
  notes: string | null;
  created_at: string;
}

// ─── Save Self-Assessment ───────────────────────────────────────────────

/**
 * Save a self-assessment / daily wellness entry to PocketBase.
 *
 * This is an online-only operation. Wellness data is considered low-priority
 * and does NOT go through the offline queue.
 */
export async function saveWellness(
  userId: string,
  input: DailyWellnessInput,
): Promise<DailyWellnessRow> {
  try {
    const record = await pb.collection("daily_wellness").create({
      user_id: userId,
      session_id: input.sessionId ?? null,
      date: input.date,
      session_rpe: input.sessionRpe,
      sleep_quality: input.sleepQuality,
      fatigue: input.fatigue,
      soreness: input.soreness,
      mood: input.mood,
      notes: input.notes ?? null,
    });

    if (!record) throw new Error("Failed to save wellness entry");
    return record as unknown as DailyWellnessRow;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to save wellness entry");
  }
}

/**
 * Fetch wellness entries for a user within a date range.
 */
export async function listWellness(
  userId: string,
  options?: { fromDate?: string; toDate?: string; page?: number; pageSize?: number },
): Promise<{ data: DailyWellnessRow[]; count: number }> {
  const { fromDate, toDate, page = 0, pageSize = 20 } = options ?? {};

  try {
    const conditions: string[] = [`user_id = '${userId}'`];
    if (fromDate) conditions.push(`date >= '${fromDate}'`);
    if (toDate) conditions.push(`date <= '${toDate}'`);

    const filter = conditions.join(" && ");

    const result = await pb.collection("daily_wellness").getList(page + 1, pageSize, {
      filter,
      sort: "-date",
    });

    return {
      data: (result.items ?? []) as unknown as DailyWellnessRow[],
      count: result.totalItems,
    };
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to list wellness entries");
  }
}
