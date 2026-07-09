/**
 * Hook to fetch a single program's detail (phases, workouts, progress).
 */
import type { ProgramSummary } from "./usePrograms";

export interface UseProgramDetailResult {
  program: ProgramSummary | null;
  isLoading: boolean;
}

/**
 * Hook to fetch detailed program data by ID.
 *
 * For now, returns null — ready for when the full program backend
 * is wired with phase, workout, and session progress data.
 */
export function useProgramDetail(
  _programId: string,
): UseProgramDetailResult {
  // TODO: Wire up with full program backend.
  // Expected integration:
  //   const { data: assignment } = useQuery({
  //     queryKey: [PROGRAM_DETAIL_KEY, programId],
  //     queryFn: () => getAssignment(programId), // or dedicated detail endpoint
  //     enabled: !!programId,
  //   });
  //   → expand template → build phases + workout list from template blocks
  //   → compute progress per phase from session data

  return {
    program: null,
    isLoading: false,
  };
}
