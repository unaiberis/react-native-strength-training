import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { i18n } from "../../../i18n";
import { useAuthStore } from "../../../stores/auth-store";
import * as PRsService from "../../../lib/pocketbase/services/prs";
import type { ComputedPR, PRType } from "../../../lib/pocketbase/services/prs";

const PRS_QUERY_KEY = "personal-records";

// ─── Display types ────────────────────────────────────────────────────────

/**
 * A flattened PR display item, analogous to the old supabase PRWithExercise.
 * Built from ComputedPR for backward-compatible screen rendering.
 */
export interface PRDisplayItem {
  id: string;
  exercise_id: string;
  exerciseName: string;
  pr_type: PRType;
  value: number;
  weight_kg: number | null;
  reps: number | null;
  achieved_at: string | null;
}

/**
 * Flatten a ComputedPR (one per exercise with all PR values as fields)
 * into individual PRDisplayItems — one per PR type that has a value.
 */
function flattenPR(computed: ComputedPR): PRDisplayItem[] {
  const items: PRDisplayItem[] = [];
  const baseId = computed.exerciseId;

  if (computed.oneRepMax !== null) {
    items.push({
      id: `${baseId}-1rm`,
      exercise_id: computed.exerciseId,
      exerciseName: computed.exerciseName,
      pr_type: "one_rep_max",
      value: computed.oneRepMax,
      weight_kg: computed.oneRepMax,
      reps: 1,
      achieved_at: null,
    });
  }

  if (computed.estimatedOneRepMax !== null) {
    items.push({
      id: `${baseId}-e1rm`,
      exercise_id: computed.exerciseId,
      exerciseName: computed.exerciseName,
      pr_type: "estimated_one_rep_max",
      value: computed.estimatedOneRepMax,
      weight_kg: null,
      reps: null,
      achieved_at: null,
    });
  }

  if (computed.bestVolumeSet !== null) {
    items.push({
      id: `${baseId}-vol`,
      exercise_id: computed.exerciseId,
      exerciseName: computed.exerciseName,
      pr_type: "best_volume_set",
      value: computed.bestVolumeSet,
      weight_kg: null,
      reps: null,
      achieved_at: null,
    });
  }

  return items;
}

/**
 * Query hook for all personal records, computed on-the-fly from exercise_sets.
 *
 * PRs are expensive to compute (fetches all user sets, groups, calculates).
 * We use a longer staleTime (5 min) and gcTime (30 min) to avoid refetching
 * during the same session. PRs only change when a new workout is logged.
 */
export function usePersonalRecords() {
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery({
    queryKey: [PRS_QUERY_KEY, userId],
    queryFn: () => PRsService.listPRs(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,   // 5 min — PRs change slowly
    gcTime: 1000 * 60 * 30,      // 30 min — keep in memory across navigations
  });

  const computedPRs = query.data ?? [];

  // Build grouped view: one group per exercise, PRDisplayItem records
  const groupedByExercise = useMemo(() => {
    const groups = computedPRs.map((computed) => ({
      exerciseId: computed.exerciseId,
      exerciseName: computed.exerciseName,
      records: flattenPR(computed),
    }));

    // Sort groups by exercise name
    return groups.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  }, [computedPRs]);

  const totalPRs = useMemo(
    () => groupedByExercise.reduce((sum, g) => sum + g.records.length, 0),
    [groupedByExercise],
  );

  return {
    ...query,
    prs: computedPRs,
    groupedByExercise,
    totalPRs,
  };
}

/**
 * Query hook for PRs for a specific exercise.
 */
export function useExercisePRs(exerciseId: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: [PRS_QUERY_KEY, userId, exerciseId],
    queryFn: () => PRsService.getExercisePRs(userId!, exerciseId!),
    enabled: !!userId && !!exerciseId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

// ─── Display helpers ──────────────────────────────────────────────────────

const PR_TYPE_LABELS: Record<PRType, string> = {
  one_rep_max: "1RM",
  estimated_one_rep_max: "Estimated 1RM",
  best_volume_set: "Best Volume Set",
  best_reps_at_weight: "Best Reps at Weight",
};

const PR_TYPE_UNITS: Record<PRType, string> = {
  one_rep_max: "kg",
  estimated_one_rep_max: "kg",
  best_volume_set: "kg",
  best_reps_at_weight: "reps",
};

export function getPRTypeLabel(prType: PRType): string {
  return i18n.t(PR_TYPE_LABELS[prType] ?? prType);
}

export function getPRTypeUnit(prType: PRType): string {
  return PR_TYPE_UNITS[prType] ?? "";
}

export function formatPRValue(pr: PRDisplayItem): string {
  const val = Number(pr.value);
  const unit = getPRTypeUnit(pr.pr_type);

  switch (pr.pr_type) {
    case "one_rep_max":
      return `${val.toFixed(1)} ${unit}`;
    case "estimated_one_rep_max":
      return `${val.toFixed(1)} ${unit}`;
    case "best_volume_set":
      return `${val.toFixed(0)} ${unit}`;
    case "best_reps_at_weight":
      return `${val} ${unit}`;
    default:
      return `${val}`;
  }
}
