import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/auth-store";
import * as FeedbackService from "../../../lib/pocketbase/services/feedback";

const FEEDBACK_QUERY_KEY = "workout-feedback";

/**
 * Lazily create an OfflineFeedbackService instance using the singleton DB.
 * Dynamic import to avoid loading expo-sqlite on web (no native module).
 */
async function createOfflineFeedback(): Promise<any> {
  const [{ getDb }, { ChangeQueue }, { OfflineFeedbackService }] =
    await Promise.all([
      import("../../../lib/db/database"),
      import("../../../lib/db/change-queue"),
      import("../../../lib/db/services/offline-feedback"),
    ]);
  const db = await getDb();
  const queue = new ChangeQueue(db);
  return new OfflineFeedbackService(db, queue);
}

// ─── Types ────────────────────────────────────────────────────────────────

export interface SubmitFeedbackInput {
  sessionId: string;
  athleteId: string;
  coachId?: string | null;
  rating: number;
  notes?: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Submit feedback for a completed workout.
 *
 * Branches on connectivity: offline → OfflineFeedbackService,
 * online → FeedbackService (PocketBase).
 *
 * Invalidates the feedback query on success so coach views update.
 */
export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  const isOnline = useAuthStore((s) => s.isOnline);

  return useMutation({
    mutationFn: async (input: SubmitFeedbackInput) => {
      if (!isOnline) {
        const svc = await createOfflineFeedback();
        await svc.submitFeedback({
          sessionId: input.sessionId,
          athleteId: input.athleteId,
          coachId: input.coachId ?? null,
          rating: input.rating,
          notes: input.notes ?? null,
        });
        return;
      }
      return FeedbackService.submitFeedback({
        sessionId: input.sessionId,
        athleteId: input.athleteId,
        coachId: input.coachId ?? null,
        rating: input.rating,
        notes: input.notes ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FEEDBACK_QUERY_KEY] });
    },
  });
}
