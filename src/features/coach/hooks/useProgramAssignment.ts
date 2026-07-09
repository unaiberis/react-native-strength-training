import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  assignProgram,
  unassignProgram,
  updateAssignment,
  listAssignments,
  listCoachAssignments,
  getAssignment,
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
 * Query hook for fetching a single assignment by ID with expanded data.
 */
export function useAssignment(id: string | undefined) {
  return useQuery({
    queryKey: [ASSIGNMENTS_QUERY_KEY, id],
    queryFn: () => getAssignment(id!),
    enabled: !!id,
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
      startedAt: string;
      teamId?: string;
    }) =>
      assignProgram({
        athleteId: input.athleteId,
        coachId: userId!,
        templateId: input.templateId,
        startedAt: input.startedAt,
        teamId: input.teamId,
        assignedAt: new Date().toISOString(),
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
      status?: "active" | "completed" | "paused" | "cancelled";
      startedAt?: string;
    }) => updateAssignment(assignmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [COACH_ASSIGNMENTS_KEY] });
    },
  });
}
