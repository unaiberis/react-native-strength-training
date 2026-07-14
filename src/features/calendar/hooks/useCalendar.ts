import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { pb } from "@/lib/pocketbase/client";
import { fetchTemplateNames } from "@/lib/pocketbase/services/fetch-template-names";

const CALENDAR_QUERY_KEY = "calendar";

// ─── Types ──────────────────────────────────────────────────────────────

export interface CalendarDay {
  date: string;       // YYYY-MM-DD
  day: number;        // 1-31
  isCurrentMonth: boolean;
  isToday: boolean;
  workoutCount: number;
  workoutSessionIds: string[];
}

export interface CalendarMonth {
  year: number;
  month: number;      // 0-11
  days: CalendarDay[];
}

export interface CalendarWorkoutSummary {
  id: string;
  templateName: string | null;
  startedAt: string;
  durationMinutes: number | null;
  exerciseCount: number;
}

// ─── Calendar Helpers ────────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Build a full month grid including overflow days from prev/next months.
 */
export function buildCalendarMonth(
  year: number,
  month: number,
  workoutMap: Map<string, { count: number; sessionIds: string[] }>,
): CalendarMonth {
  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const days: CalendarDay[] = [];

  // Previous month overflow
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevTotalDays = daysInMonth(prevYear, prevMonth);
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevTotalDays - i;
    const dateStr = formatDate(prevYear, prevMonth, d);
    const data = workoutMap.get(dateStr);
    days.push({
      date: dateStr,
      day: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      workoutCount: data?.count ?? 0,
      workoutSessionIds: data?.sessionIds ?? [],
    });
  }

  // Current month
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = formatDate(year, month, d);
    const data = workoutMap.get(dateStr);
    days.push({
      date: dateStr,
      day: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      workoutCount: data?.count ?? 0,
      workoutSessionIds: data?.sessionIds ?? [],
    });
  }

  // Next month overflow
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const dateStr = formatDate(nextYear, nextMonth, d);
    const data = workoutMap.get(dateStr);
    days.push({
      date: dateStr,
      day: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      workoutCount: data?.count ?? 0,
      workoutSessionIds: data?.sessionIds ?? [],
    });
  }

  return { year, month, days };
}

// ─── Data Fetching ───────────────────────────────────────────────────────

interface SessionForCalendar {
  id: string;
  started_at: string;
  status: string;
  workout_template_id: string | null;
}

async function fetchMonthSessions(
  userId: string,
  year: number,
  month: number,
): Promise<Map<string, { count: number; sessionIds: string[] }>> {
  const startOfMonth = formatDate(year, month, 1);
  const endOfMonth = formatDate(
    month === 11 ? year + 1 : year,
    month === 11 ? 0 : month + 1,
    1,
  );

  const sessions = await pb.collection("workout_sessions").getFullList({
    filter: `user_id = '${userId}' && status = 'completed' && started_at >= '${startOfMonth}' && started_at < '${endOfMonth}'`,
    sort: "started_at",
    fields: "id,started_at,status,workout_template_id",
    requestKey: null,
  });

  const rows = (sessions ?? []) as unknown as SessionForCalendar[];
  const map = new Map<string, { count: number; sessionIds: string[] }>();

  for (const s of rows) {
    const dateKey = s.started_at.slice(0, 10);
    const existing = map.get(dateKey);
    if (existing) {
      existing.count += 1;
      existing.sessionIds.push(s.id);
    } else {
      map.set(dateKey, { count: 1, sessionIds: [s.id] });
    }
  }

  return map;
}

/**
 * Fetch sessions for a specific date — returns summary data for the day-detail panel.
 */
export async function fetchSessionsForDate(
  userId: string,
  dateStr: string,
): Promise<CalendarWorkoutSummary[]> {
  const nextDayNum = Number(dateStr.slice(8)) + 1;
  const endDate = dateStr.slice(0, 8) + String(nextDayNum).padStart(2, "0");

  const sessions = await pb.collection("workout_sessions").getFullList({
    filter: `user_id = '${userId}' && status = 'completed' && started_at >= '${dateStr}' && started_at < '${endDate}'`,
    sort: "started_at",
    fields: "id,started_at,status,workout_template_id",
    requestKey: null,
  });

  const rows = (sessions ?? []) as unknown as SessionForCalendar[];

  // Batch-fetch template names for all sessions in one call
  const templateIds = [...new Set(rows.map((r) => r.workout_template_id).filter((id): id is string => id != null))];
  const nameMap = await fetchTemplateNames(templateIds);

  return Promise.all(
    rows.map(async (s) => {
      const templateName = nameMap.get(s.workout_template_id ?? "") ?? null;

      const sets = await pb.collection("exercise_sets").getFullList({
        filter: `workout_session_id = '${s.id}'`,
        fields: "id,exercise_id",
        requestKey: null,
      });

      const setList = (sets ?? []) as unknown as Array<{ id: string; exercise_id: string }>;
      const uniqueExercises = new Set(setList.map((set) => set.exercise_id));

      return {
        id: s.id,
        templateName,
        startedAt: s.started_at,
        durationMinutes: null,
        exerciseCount: uniqueExercises.size,
      };
    }),
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────

/**
 * Hook for calendar data — returns month grid with workout indicators.
 */
export function useCalendar(year: number, month: number) {
  const userId = useAuthStore((s) => s.user?.id);

  const queryKey = useMemo(
    () => [CALENDAR_QUERY_KEY, year, month],
    [year, month],
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const workoutMap = await fetchMonthSessions(userId!, year, month);
      return buildCalendarMonth(year, month, workoutMap);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  return {
    ...query,
    calendarMonth: query.data,
  };
}
