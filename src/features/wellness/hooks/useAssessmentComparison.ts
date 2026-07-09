import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase/client";

// ─── Types ─────────────────────────────────────────────────────────────────

export type Trend = "up" | "down" | "same";

export interface MetricValue {
  sessionRpe: number | null;
  sleep: number | null;
  fatigue: number | null;
  soreness: number | null;
  mood: number | null;
}

export interface AssessmentComparison {
  current: MetricValue;
  weekAverage: MetricValue;
  trends: Record<keyof MetricValue, Trend>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compute the average of an array of numbers (ignoring null).
 * Returns null if all values are null/empty.
 */
function average(values: (number | null)[]): number | null {
  const filtered = values.filter((v): v is number => v !== null);
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, v) => sum + v, 0) / filtered.length;
}

/**
 * Determine trend direction for a metric.
 * - 'up'   when current > average by 0.5+
 * - 'down' when current < average by 0.5+
 * - 'same' when within 0.5 range
 */
function trending(current: number | null, avg: number | null): Trend {
  if (current == null || avg == null) return "same";
  const diff = current - avg;
  if (diff >= 0.5) return "up";
  if (diff <= -0.5) return "down";
  return "same";
}

// ─── Query Keys ────────────────────────────────────────────────────────────

const WELLNESS_ENTRY_QUERY_KEY = "wellness-entry";
const WELLNESS_HISTORY_QUERY_KEY = "wellness-history";

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Compare a wellness entry against the rolling 7-day average.
 *
 * Takes a wellness entry ID, fetches the current entry from PocketBase
 * and historical entries from local SQLite, then computes trend direction
 * for each metric.
 *
 * Returns null when no entry ID is provided or the entry is not found.
 */
export function useAssessmentComparison(
  wellnessEntryId: string | null,
): {
  comparison: AssessmentComparison | null;
  isLoading: boolean;
} {
  // Fetch the specific entry from PocketBase
  const entryQuery = useQuery({
    queryKey: [WELLNESS_ENTRY_QUERY_KEY, wellnessEntryId],
    queryFn: async () => {
      if (!wellnessEntryId) return null;
      const record = await pb
        .collection("daily_wellness")
        .getOne(wellnessEntryId);
      return record as unknown as {
        id: string;
        session_rpe: number | null;
        sleep: number | null;
        fatigue: number | null;
        soreness: number | null;
        mood: number | null;
        date: string;
      };
    },
    enabled: !!wellnessEntryId,
    staleTime: 1000 * 60 * 5, // 5 min — entry doesn't change
  });

  // Fetch all entries from local SQLite for historical averages
  // Only runs when we have a target entry to compare against
  const historyQuery = useQuery({
    queryKey: [WELLNESS_HISTORY_QUERY_KEY, wellnessEntryId],
    queryFn: async (): Promise<
      Array<{
        id: string;
        session_rpe: number | null;
        sleep: number | null;
        fatigue: number | null;
        soreness: number | null;
        mood: number | null;
        date: string;
      }>
    > => {
      const { getDb } = await import("@/lib/db/database");
      const db = await getDb();
      const rows = await db.getAllAsync<{
        id: string;
        session_rpe: number | null;
        sleep: number | null;
        fatigue: number | null;
        soreness: number | null;
        mood: number | null;
        date: string;
      }>("SELECT id, session_rpe, sleep, fatigue, soreness, mood, date FROM daily_wellness ORDER BY date ASC");
      return rows;
    },
    enabled: !!wellnessEntryId,
    staleTime: 1000 * 60 * 2, // 2 min — wellness changes daily
  });

  // Compute the comparison
  const comparison = useMemo<AssessmentComparison | null>(() => {
    const entry = entryQuery.data;
    if (!entry) return null;

    const allEntries = historyQuery.data ?? [];

    const current: MetricValue = {
      sessionRpe: entry.session_rpe ?? null,
      sleep: entry.sleep ?? null,
      fatigue: entry.fatigue ?? null,
      soreness: entry.soreness ?? null,
      mood: entry.mood ?? null,
    };

    // Filter out the current entry — compute averages from the rest
    const otherEntries = allEntries.filter((e) => e.id !== wellnessEntryId);

    const weekAverage: MetricValue = {
      sessionRpe: average(otherEntries.map((e) => e.session_rpe)),
      sleep: average(otherEntries.map((e) => e.sleep)),
      fatigue: average(otherEntries.map((e) => e.fatigue)),
      soreness: average(otherEntries.map((e) => e.soreness)),
      mood: average(otherEntries.map((e) => e.mood)),
    };

    return {
      current,
      weekAverage,
      trends: {
        sessionRpe: trending(current.sessionRpe, weekAverage.sessionRpe),
        sleep: trending(current.sleep, weekAverage.sleep),
        fatigue: trending(current.fatigue, weekAverage.fatigue),
        soreness: trending(current.soreness, weekAverage.soreness),
        mood: trending(current.mood, weekAverage.mood),
      },
    };
  }, [entryQuery.data, historyQuery.data, wellnessEntryId]);

  // When no entry ID, short-circuit: both queries are disabled
  const isLoading = !!wellnessEntryId && (entryQuery.isLoading || historyQuery.isLoading);

  return {
    comparison,
    isLoading,
  };
}
