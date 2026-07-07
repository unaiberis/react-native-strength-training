import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";

// ─── Constants ─────────────────────────────────────────────────────────────

const WELLNESS_QUERY_KEY = "wellness";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface WellnessRow {
  id: string;
  user_id: string;
  date: string;
  session_rpe: number | null;
  sleep: number | null;
  fatigue: number | null;
  soreness: number | null;
  mood: number | null;
  session_id: string | null;
  created_at: string;
}

export interface WellnessTrendPeriod {
  /** "7d" | "30d" | "90d" */
  period: string;
  /** Average session RPE (1-10) */
  avgSessionRpe: number | null;
  /** Average sleep quality (1-5) */
  avgSleep: number | null;
  /** Average fatigue (1-5) */
  avgFatigue: number | null;
  /** Average soreness (1-5) */
  avgSoreness: number | null;
  /** Average mood (1-5) */
  avgMood: number | null;
  /** Number of entries in this period */
  entryCount: number;
}

export interface WellnessTimeSeries {
  /** ISO date string */
  date: string;
  /** Session RPE (1-10) */
  sessionRpe: number | null;
  /** Sleep quality (1-5) */
  sleep: number | null;
  /** Fatigue (1-5) */
  fatigue: number | null;
  /** Soreness (1-5) */
  soreness: number | null;
  /** Mood (1-5) */
  mood: number | null;
}

export interface WellnessTrends {
  /** Rolling averages for each period */
  periods: WellnessTrendPeriod[];
  /** Full time series data, sorted chronologically */
  timeSeries: WellnessTimeSeries[];
  /** Raw wellness entries */
  entries: WellnessRow[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: Error | null;
  /** Refetch function */
  refetch: () => void;
}

// ─── Local SQLite Query ────────────────────────────────────────────────────

/**
 * Fetch wellness entries from local SQLite.
 */
async function fetchWellnessFromLocal(): Promise<WellnessRow[]> {
  const { getDb } = await import("@/lib/db/database");
  const db = await getDb();

  const rows = await db.getAllAsync<WellnessRow>(
    `SELECT * FROM daily_wellness ORDER BY date ASC`,
  );

  return rows;
}

// ─── Pure Calculation Functions ────────────────────────────────────────────

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
 * Calculate rolling average trends for a given time window.
 */
function calcPeriodTrends(
  entries: WellnessRow[],
  days: number,
  period: string,
): WellnessTrendPeriod {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().substring(0, 10);

  const filtered = entries.filter((e) => e.date >= cutoffStr);

  return {
    period,
    avgSessionRpe: average(filtered.map((e) => e.session_rpe)),
    avgSleep: average(filtered.map((e) => e.sleep)),
    avgFatigue: average(filtered.map((e) => e.fatigue)),
    avgSoreness: average(filtered.map((e) => e.soreness)),
    avgMood: average(filtered.map((e) => e.mood)),
    entryCount: filtered.length,
  };
}

/**
 * Convert raw wellness rows to time series data.
 */
function buildTimeSeries(entries: WellnessRow[]): WellnessTimeSeries[] {
  return entries.map((e) => ({
    date: e.date,
    sessionRpe: e.session_rpe,
    sleep: e.sleep,
    fatigue: e.fatigue,
    soreness: e.soreness,
    mood: e.mood,
  }));
}

/**
 * Compute all wellness trend periods from raw entries.
 */
export function computeWellnessTrends(
  entries: WellnessRow[],
): Pick<WellnessTrends, "periods" | "timeSeries"> {
  const periods = [
    calcPeriodTrends(entries, 7, "7d"),
    calcPeriodTrends(entries, 30, "30d"),
    calcPeriodTrends(entries, 90, "90d"),
  ];

  const timeSeries = buildTimeSeries(entries);

  return { periods, timeSeries };
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Hook for wellness trends data.
 *
 * Reads daily_wellness entries from local SQLite and computes
 * rolling averages for 7, 30, and 90 day periods.
 * Uses TanStack Query for caching and reactivity.
 */
export function useWellnessTrends(): WellnessTrends {
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery({
    queryKey: [WELLNESS_QUERY_KEY, "trends", userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchWellnessFromLocal();
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 min — wellness changes daily
  });

  const entries = query.data ?? [];

  const { periods, timeSeries } = useMemo(
    () => computeWellnessTrends(entries),
    [entries],
  );

  return {
    periods,
    timeSeries,
    entries,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => query.refetch(),
  };
}
