import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import {
  WorkoutPreview,
  type WorkoutPreviewData,
} from "../components/WorkoutPreview";
import { ScreenTitle } from "../../../shared/ui/ScreenTitle";
import { ErrorBoundary } from "../../../shared/ui/ErrorBoundary";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { useTemplate } from "../../../features/routines/hooks/useTemplates";
import { getExercise } from "../../../lib/pocketbase/services/exercises";
import { mapTemplateToWorkoutPreview } from "../lib/workoutPreviewMapper";

// ─── Types ─────────────────────────────────────────────────────────────────

interface WorkoutPreviewScreenProps {
  workoutId: string;
  onStartWorkout?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Read-only preview of a coach template. Fetches the real template via
 * `useTemplate(workoutId)`, resolves exercise names via `getExercise` batch
 * (D5), maps to `WorkoutPreviewData`, and renders `<WorkoutPreview>`.
 *
 * Online-only (R4): a fetch error or missing template shows an explicit
 * "not found" state — never the silent placeholder.
 */
export function WorkoutPreviewScreen({
  workoutId,
  onStartWorkout,
}: WorkoutPreviewScreenProps) {
  const { data: tpl, isLoading, error } = useTemplate(workoutId);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!tpl || tpl.exercises.length === 0) {
      setNameMap({});
      return;
    }
    let cancelled = false;
    Promise.all(
      tpl.exercises.map(async (ex) => {
        const exRow = await getExercise(ex.exercise_id);
        return [ex.exercise_id, exRow?.name ?? ex.exercise_id] as const;
      }),
    )
      .then((entries) => {
        if (!cancelled) setNameMap(Object.fromEntries(entries));
      })
      .catch(() => {
        if (!cancelled) setNameMap({});
      });
    return () => {
      cancelled = true;
    };
  }, [tpl]);

  const workout: WorkoutPreviewData | null = tpl
    ? mapTemplateToWorkoutPreview(tpl, nameMap)
    : null;

  return (
    <ErrorBoundary>
      <GradientBackground>
        <View className="flex-1 px-4 pt-6">
          {isLoading ? (
            <View className="flex-1 items-center justify-center pt-20">
              <ActivityIndicator color="#B9B9B6" />
              <Text className="text-surface-400 mt-3">Loading workout...</Text>
            </View>
          ) : error || !workout ? (
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-surface-400">Workout not found.</Text>
            </View>
          ) : (
            <>
              <ScreenTitle title={workout.name} className="mb-4" />
              <WorkoutPreview workout={workout} onStartWorkout={onStartWorkout} />
            </>
          )}
        </View>
      </GradientBackground>
    </ErrorBoundary>
  );
}
