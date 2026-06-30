import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/auth-store";
import * as PRsService from "../../../lib/supabase/services/prs";
import type { PRWithExercise, PRType } from "../../../lib/supabase/services/prs";

const PRS_QUERY_KEY = "personal-records";

/**
 * Query hook for all personal records, grouped by exercise.
 */
export function usePersonalRecords() {
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery({
    queryKey: [PRS_QUERY_KEY],
    queryFn: () => PRsService.listPRs(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  const prs = query.data ?? [];

  // Group PRs by exercise
  const groupedByExercise = useMemo(() => {
    const map = new Map<
      string,
      {
        exerciseId: string;
        exerciseName: string;
        records: PRWithExercise[];
      }
    >();

    for (const pr of prs) {
      const existing = map.get(pr.exercise_id);
      if (existing) {
        existing.records.push(pr);
      } else {
        map.set(pr.exercise_id, {
          exerciseId: pr.exercise_id,
          exerciseName: pr.exerciseName,
          records: [pr],
        });
      }
    }

    // Sort groups by latest PR date (descending)
    return [...map.entries()]
      .map(([_, group]) => group)
      .sort((a, b) => {
        const aLatest = Math.max(
          ...a.records.map((r) => new Date(r.achieved_at).getTime()),
        );
        const bLatest = Math.max(
          ...b.records.map((r) => new Date(r.achieved_at).getTime()),
        );
        return bLatest - aLatest;
      });
  }, [prs]);

  return {
    ...query,
    prs,
    groupedByExercise,
    totalPRs: prs.length,
  };
}

/**
 * Query hook for PRs for a specific exercise.
 */
export function useExercisePRs(exerciseId: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: [PRS_QUERY_KEY, exerciseId],
    queryFn: () => PRsService.getExercisePRs(userId!, exerciseId!),
    enabled: !!userId && !!exerciseId,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Display helpers ──────────────────────────────────────────────────────

const PR_TYPE_LABELS: Record<PRType, string> = {
  one_rep_max: "1RM",
  estimated_one_rep_max: "Estimated 1RM",
  best_volume_set: "Best Volume Set",
  best_tonnage: "Best Tonnage",
  best_reps_at_weight: "Best Reps at Weight",
};

const PR_TYPE_UNITS: Record<PRType, string> = {
  one_rep_max: "kg",
  estimated_one_rep_max: "kg",
  best_volume_set: "kg",
  best_tonnage: "kg",
  best_reps_at_weight: "reps",
};

export function getPRTypeLabel(prType: PRType): string {
  return PR_TYPE_LABELS[prType] ?? prType;
}

export function getPRTypeUnit(prType: PRType): string {
  return PR_TYPE_UNITS[prType] ?? "";
}

export function formatPRValue(pr: PRWithExercise): string {
  const val = Number(pr.value);
  const unit = getPRTypeUnit(pr.pr_type);

  switch (pr.pr_type) {
    case "one_rep_max":
      return `${val.toFixed(1)} ${unit}`;
    case "estimated_one_rep_max":
      return `${val.toFixed(1)} ${unit}`;
    case "best_volume_set":
      return `${val.toFixed(0)} ${unit}`;
    case "best_tonnage":
      return `${val.toFixed(0)} ${unit}`;
    case "best_reps_at_weight":
      return `${val} ${unit}`;
    default:
      return `${val}`;
  }
}
