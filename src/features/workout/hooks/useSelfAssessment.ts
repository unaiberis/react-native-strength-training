import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/auth-store";
import * as WellnessService from "../../../lib/pocketbase/services/wellness";

const WELLNESS_QUERY_KEY = "wellness";

// ─── Types ──────────────────────────────────────────────────────────────

export interface SelfAssessmentInput {
  /** The session this assessment is for, if any */
  sessionId?: string | null;
  /** ISO date string for the assessment */
  date: string;
  /** Session RPE: 1 (very light) – 10 (max effort) */
  sessionRpe: number;
  /** Sleep quality: 1 (poor) – 5 (excellent) */
  sleepQuality: number;
  /** Fatigue level: 1 (low energy) – 5 (very fatigued) */
  fatigue: number;
  /** Soreness level: 1 (none) – 5 (very sore) */
  soreness: number;
  /** Mood: 1 (very low) – 5 (great) */
  mood: number;
  /** Optional notes */
  notes?: string | null;
}

// ─── Validation ─────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate self-assessment input fields.
 * Returns an object with `valid` boolean and a map of field → error message.
 */
export function validateSelfAssessment(input: Partial<SelfAssessmentInput>): ValidationResult {
  const errors: Record<string, string> = {};

  if (input.sessionRpe != null) {
    if (!Number.isInteger(input.sessionRpe) || input.sessionRpe < 1 || input.sessionRpe > 10) {
      errors.sessionRpe = "Session RPE must be between 1 and 10";
    }
  } else {
    errors.sessionRpe = "Session RPE is required";
  }

  if (input.sleepQuality != null) {
    if (!Number.isInteger(input.sleepQuality) || input.sleepQuality < 1 || input.sleepQuality > 5) {
      errors.sleepQuality = "Sleep quality must be between 1 and 5";
    }
  } else {
    errors.sleepQuality = "Sleep quality is required";
  }

  if (input.fatigue != null) {
    if (!Number.isInteger(input.fatigue) || input.fatigue < 1 || input.fatigue > 5) {
      errors.fatigue = "Fatigue must be between 1 and 5";
    }
  } else {
    errors.fatigue = "Fatigue is required";
  }

  if (input.soreness != null) {
    if (!Number.isInteger(input.soreness) || input.soreness < 1 || input.soreness > 5) {
      errors.soreness = "Soreness must be between 1 and 5";
    }
  } else {
    errors.soreness = "Soreness is required";
  }

  if (input.mood != null) {
    if (!Number.isInteger(input.mood) || input.mood < 1 || input.mood > 5) {
      errors.mood = "Mood must be between 1 and 5";
    }
  } else {
    errors.mood = "Mood is required";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ─── Hook ───────────────────────────────────────────────────────────────

/**
 * Mutation hook to save a self-assessment (daily wellness entry).
 *
 * The assessment is saved to PocketBase directly. This is an online-only
 * operation — wellness data is not queued for offline sync.
 */
export function useSaveSelfAssessment() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (input: SelfAssessmentInput) => {
      if (!userId) throw new Error("User not authenticated");

      return WellnessService.saveWellness(userId, {
        sessionId: input.sessionId ?? null,
        date: input.date,
        sessionRpe: input.sessionRpe,
        sleepQuality: input.sleepQuality,
        fatigue: input.fatigue,
        soreness: input.soreness,
        mood: input.mood,
        notes: input.notes ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WELLNESS_QUERY_KEY] });
    },
  });
}
