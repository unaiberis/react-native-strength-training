/**
 * Coach-facing hook to fetch a specific athlete's program assignments
 * and build a CalendarMonth-compatible shape for the calendar grid.
 */

import { useQuery } from "@tanstack/react-query";
import { listAssignments } from "@/lib/pocketbase/services/program-assignments";
import type { ProgramAssignmentRow } from "@/types/pocketbase";
import {
  buildCalendarMonth,
  type CalendarMonth,
} from "@/features/calendar/hooks/useCalendar";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface UseAthleteCalendarResult {
  calendarMonth: CalendarMonth | null;
  isLoading: boolean;
  assignments: ProgramAssignmentRow[];
  refetch: () => void;
}

const ATHLETE_CALENDAR_QUERY_KEY = "athlete-calendar";

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Build a CalendarMonth from program_assignments.
 * Uses the existing `buildCalendarMonth` from the athlete calendar,
 * deriving workoutMap from the started_at field of each assignment.
 */
export function buildAssignmentCalendarMonth(
  assignments: ProgramAssignmentRow[],
  year: number,
  month: number,
): CalendarMonth {
  const assignmentMap = new Map<string, { count: number; sessionIds: string[] }>();

  for (const a of assignments) {
    const dateStr = a.started_at.slice(0, 10);
    const existing = assignmentMap.get(dateStr);
    if (existing) {
      existing.count += 1;
      existing.sessionIds.push(a.id);
    } else {
      assignmentMap.set(dateStr, { count: 1, sessionIds: [a.id] });
    }
  }

  return buildCalendarMonth(year, month, assignmentMap);
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Fetch assignments for a specific athlete and return a CalendarMonth
 * grid compatible with the existing CalendarGrid component.
 */
export function useAthleteCalendar(
  athleteId: string | undefined,
  year: number,
  month: number,
): UseAthleteCalendarResult {
  const query = useQuery({
    queryKey: [ATHLETE_CALENDAR_QUERY_KEY, athleteId, year, month],
    queryFn: async () => {
      const rows = await listAssignments(athleteId!);
      return {
        rows,
        calendarMonth: buildAssignmentCalendarMonth(rows, year, month),
      };
    },
    enabled: !!athleteId,
    staleTime: 1000 * 60 * 2,
  });

  const rows = query.data?.rows ?? [];
  const calendarMonth = query.data?.calendarMonth ?? null;

  return {
    calendarMonth,
    isLoading: query.isLoading,
    assignments: rows,
    refetch: () => {
      void query.refetch();
    },
  };
}
