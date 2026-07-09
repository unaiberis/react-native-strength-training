/**
 * Program hooks for the athlete's program view.
 */

import { useAthleteAssignments } from "./useAthleteAssignments";
import type { UseProgramsResult } from "../program-types";

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

// Re-export types for convenience (consumers can still `from "../hooks/usePrograms"`)
export type {
  ProgramPhaseSummary,
  ProgramSummary,
  UseProgramsResult,
} from "../program-types";
export { computeProgramProgress } from "../program-types";
