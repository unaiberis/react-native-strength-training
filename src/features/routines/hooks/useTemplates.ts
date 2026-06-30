import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/auth-store";
import * as TemplatesService from "../../../lib/supabase/services/templates";
import type { WorkoutTemplateInput } from "../../../shared/schemas/template";

const TEMPLATES_QUERY_KEY = "templates";

/**
 * Query hook for listing all user's templates with exercises.
 */
export function useTemplates() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: [TEMPLATES_QUERY_KEY],
    queryFn: () => TemplatesService.listTemplates(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Query hook for fetching a single template with exercises.
 */
export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: [TEMPLATES_QUERY_KEY, id],
    queryFn: () => TemplatesService.getTemplate(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Mutation hook for creating a new template.
 * Invalidates the template list on success.
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (input: WorkoutTemplateInput) =>
      TemplatesService.createTemplate(userId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY] });
    },
  });
}

/**
 * Mutation hook for updating an existing template.
 * Invalidates the template list and individual template query.
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: WorkoutTemplateInput;
    }) => TemplatesService.updateTemplate(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [TEMPLATES_QUERY_KEY, data.id],
      });
    },
  });
}

/**
 * Mutation hook for deleting a template.
 * Invalidates the template list on success.
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => TemplatesService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY] });
    },
  });
}

/**
 * Mutation hook for reordering exercises within a template.
 */
export function useReorderExercises() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      exerciseIdsInOrder,
    }: {
      templateId: string;
      exerciseIdsInOrder: string[];
    }) =>
      TemplatesService.reorderTemplateExercises(templateId, exerciseIdsInOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY] });
    },
  });
}
