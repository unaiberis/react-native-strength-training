/**
 * Week-based calendar hook.
 *
 * Generates 7-day week strips centered around Monday, tracks
 * completed workout dates from local SQLite, and provides
 * week navigation (prev/next/today).
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

const WEEK_CALENDAR_QUERY_KEY = "week-calendar";

// ─── Types ──────────────────────────────────────────────────────────────

export interface WeekDay {
  date: string; // YYYY-MM-DD
  dayName: string; // "M", "T", "W", "T", "F", "S", "S"
  dayNumber: number; // 1-31
  isToday: boolean;
  isSelected: boolean;
  hasWorkout: boolean;
  hasCompletedWorkout: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get the Monday of the week containing the given date.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  // Sunday (0) → go back 6 days; Mon (1) → stay; Tue (2) → back 1; …
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function generateWeekDays(
  weekStart: Date,
): Omit<WeekDay, "isSelected" | "hasWorkout" | "hasCompletedWorkout">[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayAbbrs = ["M", "T", "W", "T", "F", "S", "S"];
  const days: Omit<
    WeekDay,
    "isSelected" | "hasWorkout" | "hasCompletedWorkout"
  >[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    date.setHours(0, 0, 0, 0);
    days.push({
      date: formatISODate(date),
      dayName: dayAbbrs[i],
      dayNumber: date.getDate(),
      isToday: date.getTime() === today.getTime(),
    });
  }

  return days;
}

function formatWeekLabel(start: Date, end: Date): string {
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const startMonth = months[start.getMonth()];
  const endMonth = months[end.getMonth()];

  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${start.getDate()} — ${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} — ${endMonth} ${end.getDate()}`;
}

interface WeekSessionRow {
  workout_date: string;
  has_completed: number;
}

async function fetchWeekSessions(
  weekStart: Date,
): Promise<{ allDates: string[]; completedDates: string[] }> {
  const { getDb } = await import("@/lib/db/database");
  const db = await getDb();

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startStr = formatISODate(weekStart);
  const endStr = formatISODate(weekEnd);

  const rows = await db.getAllAsync<WeekSessionRow>(
    `SELECT DISTINCT DATE(started_at) as workout_date,
            MAX(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as has_completed
     FROM workout_sessions
     WHERE DATE(started_at) >= ? AND DATE(started_at) <= ?
     GROUP BY DATE(started_at)
     ORDER BY DATE(started_at)`,
    [startStr, endStr],
  );

  const allDates: string[] = [];
  const completedDates: string[] = [];

  for (const row of rows) {
    allDates.push(row.workout_date);
    if (row.has_completed === 1) {
      completedDates.push(row.workout_date);
    }
  }

  return { allDates, completedDates };
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function useWeekCalendar() {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStart(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatISODate(new Date()),
  );

  const weekStartStr = useMemo(() => formatISODate(weekStart), [weekStart]);

  const { data: sessionDates, isLoading } = useQuery({
    queryKey: [WEEK_CALENDAR_QUERY_KEY, weekStartStr],
    queryFn: () => fetchWeekSessions(weekStart),
    staleTime: 1000 * 60 * 2,
  });

  const allSet = useMemo(
    () => new Set(sessionDates?.allDates ?? []),
    [sessionDates],
  );
  const completedSet = useMemo(
    () => new Set(sessionDates?.completedDates ?? []),
    [sessionDates],
  );

  const weekDays = useMemo<WeekDay[]>(() => {
    const baseDays = generateWeekDays(weekStart);
    return baseDays.map((day) => ({
      ...day,
      isSelected: day.date === selectedDate,
      hasWorkout: allSet.has(day.date),
      hasCompletedWorkout: completedSet.has(day.date),
    }));
  }, [weekStart, selectedDate, allSet, completedSet]);

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return formatWeekLabel(weekStart, end);
  }, [weekStart]);

  const selectDate = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const goToPrevWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const goToToday = useCallback(() => {
    const today = new Date();
    setWeekStart(getWeekStart(today));
    setSelectedDate(formatISODate(today));
  }, []);

  return {
    weekDays,
    selectedDate,
    weekLabel,
    selectDate,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    isLoading,
  };
}
