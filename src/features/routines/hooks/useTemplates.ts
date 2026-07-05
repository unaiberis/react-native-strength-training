import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/auth-store";
import * as TemplatesService from "../../../lib/pocketbase/services/templates";
import type { WorkoutTemplateInput } from "../../../shared/schemas/template";
// Offline modules imported dynamically — expo-sqlite native module unavailable on web
// import { getDb, ChangeQueue, OfflineTemplatesService } from "../../../lib/db";
import type { CreateTemplateInput, UpdateTemplateInput } from "../../../lib/db/services/offline-templates";

const TEMPLATES_QUERY_KEY = "templates";

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Lazily create an OfflineTemplatesService instance using the singleton DB.
 * Dynamic import to avoid loading expo-sqlite on web (no native module).
 */
async function createOfflineTemplates(): Promise<any> {
  const [{ getDb }, { ChangeQueue }, { OfflineTemplatesService }] =
    await Promise.all([
      import("../../../lib/db/database"),
      import("../../../lib/db/change-queue"),
      import("../../../lib/db/services/offline-templates"),
    ]);
  const db = await getDb();
  const queue = new ChangeQueue(db);
  return new OfflineTemplatesService(db, queue);
}

/**
 * Convert a WorkoutTemplateInput (shared schema) to CreateTemplateInput
 * (offline service format).
 */
function toOfflineCreateInput(
  userId: string,
  input: WorkoutTemplateInput,
): CreateTemplateInput {
  return {
    userId,
    name: input.name,
    description: input.description ?? undefined,
    exercises: input.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sortOrder: ex.sortOrder,
      targetSets: ex.targetSets,
      targetReps: ex.targetReps,
      restSeconds: ex.restSeconds,
      notes: ex.notes ?? undefined,
    })),
  };
}

/**
 * Convert a WorkoutTemplateInput (shared schema) to UpdateTemplateInput
 * (offline service format).
 */
function toOfflineUpdateInput(
  userId: string,
  input: WorkoutTemplateInput,
): UpdateTemplateInput {
  return {
    userId,
    name: input.name,
    description: input.description ?? undefined,
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────

/**
 * Query hook for listing all user's templates with exercises.
 */
export function useTemplates() {
  const userId = useAuthStore((s) => s.user?.id);
  const user = useAuthStore((s) => s.user);

  console.log("[useTemplates]", { userId, userEmail: user?.email, hasUser: !!user });

  const query = useQuery({
    queryKey: [TEMPLATES_QUERY_KEY],
    queryFn: async () => {
      console.log("[useTemplates] queryFn called with userId:", userId);
      const result = await TemplatesService.listTemplates(userId!);
      console.log("[useTemplates] queryFn result:", result?.length, "templates");
      return result;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  if (query.error) {
    console.log("[useTemplates] ERROR:", query.error);
  }

  return query;
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

// ─── Mutations ───────────────────────────────────────────────────────────

/**
 * Mutation hook for creating a new template.
 *
 * Branches on connectivity: offline → OfflineTemplatesService,
 * online → existing TemplatesService.
 *
 * Invalidates the template list on success.
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const isOnline = useAuthStore((s) => s.isOnline);

  return useMutation({
    mutationFn: async (input: WorkoutTemplateInput) => {
      if (!isOnline) {
        const svc = await createOfflineTemplates();
        return svc.createTemplate(toOfflineCreateInput(userId!, input));
      }
      return TemplatesService.createTemplate(userId!, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY] });
    },
  });
}

/**
 * Mutation hook for updating an existing template.
 *
 * Branches on connectivity: offline → OfflineTemplatesService,
 * online → existing TemplatesService.
 *
 * Invalidates the template list and individual template query.
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const isOnline = useAuthStore((s) => s.isOnline);

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: WorkoutTemplateInput;
    }) => {
      if (!isOnline) {
        const svc = await createOfflineTemplates();
        return svc.updateTemplate(id, toOfflineUpdateInput(userId!, input));
      }
      return TemplatesService.updateTemplate(id, input);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [TEMPLATES_QUERY_KEY, variables.id],
      });
    },
  });
}

/**
 * Mutation hook for deleting a template.
 *
 * Branches on connectivity: offline → OfflineTemplatesService,
 * online → existing TemplatesService.
 *
 * Invalidates the template list on success.
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const isOnline = useAuthStore((s) => s.isOnline);

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isOnline) {
        const svc = await createOfflineTemplates();
        return svc.deleteTemplate(id);
      }
      return TemplatesService.deleteTemplate(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY] });
    },
  });
}

/**
 * Mutation hook for reordering exercises within a template.
 *
 * NOTE: Reordering is not supported in offline mode — falls through
 * to the online service. If offline, the mutation will fail gracefully.
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
