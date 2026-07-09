/**
 * Program types and hooks for the athlete's program view.
 *
 * A program is a structured training plan (assigned via program_assignments)
 * composed of phases, each containing workouts.
 */

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
}

// ─── Helper ─────────────────────────────────────────────────────────────────

/**
 * Compute progress metrics from program dates.
 */
function computeProgramProgress(
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
 * Fetches from `program_assignments` PocketBase service and computes
 * progress metrics. Returns the current active program (if any) plus
 * a list of upcoming queued programs.
 *
 * For now, returns empty data — ready for when the full program backend
 * is wired with phase and workout data.
 */
export function usePrograms(): UseProgramsResult {
  // TODO: Wire up with full program backend.
  // Current state: the service (listAssignments) exists but we need
  // template expansion + phase/workout data to build ProgramSummary.
  //
  // Expected integration:
  //   const userId = useAuthStore((s) => s.user?.id);
  //   const { data: assignments } = useQuery({
  //     queryKey: [PROGRAMS_QUERY_KEY, userId],
  //     queryFn: () => listAssignments(userId!),
  //     enabled: !!userId,
  //   });
  //   → map assignments to ProgramSummary using template expand + phases

  return {
    currentProgram: null,
    upcomingPrograms: [],
    isLoading: false,
  };
}
