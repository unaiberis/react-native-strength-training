/**
 * Program types and hooks for the athlete's program view.
 *
 * A program is a structured training plan (assigned via program_assignments)
 * composed of phases, each containing workouts.
 */

import { useAthleteAssignments } from "./useAthleteAssignments";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ProgramPhaseSummary {
  id: string;
  name: string;
  weekStart: number; // 1-indexed starting week
  weekEnd: number;
  workoutCount: number;
}

export interface ProgramSummary {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  totalWeeks: number;
  weeksCompleted: number;
  progressPercent: number; // 0-100
  phases: ProgramPhaseSummary[];
  status: "active" | "completed" | "upcoming";
}

export interface UseProgramsResult {
  currentProgram: ProgramSummary | null;
  upcomingPrograms: ProgramSummary[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

// ─── Helper ─────────────────────────────────────────────────────────────────

/**
 * Compute progress metrics from program dates.
 */
export function computeProgramProgress(
  startDate: string,
  endDate: string,
  totalWeeks: number,
): { weeksCompleted: number; progressPercent: number } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (now < start) {
    return { weeksCompleted: 0, progressPercent: 0 };
  }
  if (now > end) {
    return { weeksCompleted: totalWeeks, progressPercent: 100 };
  }

  const elapsedMs = now.getTime() - start.getTime();
  const totalMs = end.getTime() - start.getTime();
  const elapsedWeeks = elapsedMs / (7 * 24 * 60 * 60 * 1000);
  const weeksCompleted = Math.floor(elapsedWeeks);
  const progressPercent = Math.min(
    100,
    Math.round((elapsedMs / totalMs) * 100),
  );

  return { weeksCompleted, progressPercent };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Hook to fetch the athlete's programs.
 *
 * Delegates to `useAthleteAssignments`, which calls `listAssignments(user.id)`
 * and maps each assignment into the `ProgramSummary` shape consumed by the
 * Programs tab and detail screens. The public return shape (`UseProgramsResult`)
 * is unchanged so existing screens need no prop changes (R2, R6).
 */
export function usePrograms(): UseProgramsResult {
  const { currentProgram, upcomingPrograms, isLoading, error, refetch } =
    useAthleteAssignments();

  return {
    currentProgram,
    upcomingPrograms,
    isLoading,
    error,
    refetch,
  };
}
