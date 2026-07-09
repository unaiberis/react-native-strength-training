/**
 * Hook to fetch a single program's detail (phases, workouts, progress).
 *
 * Reads the coach-assigned `program_assignment` by id and maps it into the
 * `ProgramSummary` shape used by `ProgramDetailScreen`.
 * Falls back to `null` only on hard error / no data.
 */
import { useQuery } from "@tanstack/react-query";
import { getAssignment } from "../../../lib/pocketbase/services/program-assignments";
import { mapAssignmentToProgramSummary } from "./useAthleteAssignments";
import type { ProgramAssignmentRow } from "../../../types/pocketbase";
import type { ProgramSummary } from "../program-types";

export interface UseProgramDetailResult {
  program: ProgramSummary | null;
  isLoading: boolean;
  error: unknown;
}

/**
 * Hook to fetch detailed program data by assignment id.
 */
export function useProgramDetail(programId: string): UseProgramDetailResult {
  const query = useQuery({
    queryKey: ["program-detail", programId],
    queryFn: () => getAssignment(programId),
    enabled: !!programId,
  });

  return {
    program: query.data
      ? mapAssignmentToProgramSummary(query.data as ProgramAssignmentRow)
      : null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
