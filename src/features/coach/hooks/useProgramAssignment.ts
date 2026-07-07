import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  assignProgram,
  unassignProgram,
  updateAssignment,
  listAssignments,
  listCoachAssignments,
} from "@/lib/pocketbase/services/program-assignments";
import { useQuery } from "@tanstack/react-query";

const ASSIGNMENTS_QUERY_KEY = "program-assignments";
const COACH_ASSIGNMENTS_KEY = "coach-assignments";

/**
 * Query hook for fetching assignments for a given athlete.
 */
export function useAssignments(athleteId: string | undefined) {
  return useQuery({
    queryKey: [ASSIGNMENTS_QUERY_KEY, athleteId],
    queryFn: () => listAssignments(athleteId!),
    enabled: !!athleteId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Query hook for fetching all assignments created by the current coach.
 */
export function useCoachAssignments() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: [COACH_ASSIGNMENTS_KEY, userId],
    queryFn: () => listCoachAssignments(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Mutation hook to assign a program (template) to an athlete.
 */
export function useAssignProgram() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (input: {
      athleteId: string;
      templateId: string;
      startDate: string;
    }) =>
      assignProgram({
        athleteId: input.athleteId,
        coachId: userId!,
        templateId: input.templateId,
        startDate: input.startDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [COACH_ASSIGNMENTS_KEY] });
    },
  });
}

/**
 * Mutation hook to unassign (delete) a program assignment.
 */
export function useUnassignProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: string) => unassignProgram(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [COACH_ASSIGNMENTS_KEY] });
    },
  });
}

/**
 * Mutation hook to update an assignment (status, date).
 */
export function useUpdateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      ...input
    }: {
      assignmentId: string;
      status?: "active" | "completed" | "cancelled";
      startDate?: string;
    }) => updateAssignment(assignmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [COACH_ASSIGNMENTS_KEY] });
    },
  });
}
