import { useCallback, useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useLingui } from "@lingui/react/macro";
import { Trans } from "@lingui/react/macro";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { useSessionStore } from "../../../stores/session-store";
import { useClearSession } from "../hooks/useWorkoutSession";
import { computeWorkoutSummary } from "../../../shared/utils/workout-summary";

// ─── Best Set Badge ──────────────────────────────────────────────────────

function BestSetBadge({ weightKg, reps, e1rm }: { weightKg: number; reps: number; e1rm: number }) {
  return (
    <View className="bg-surface-800 rounded-lg px-2 py-1 mt-1">
      <Text className="text-surface-300 text-[11px] font-mono">
        <Trans>Best: {weightKg} kg × {reps} reps (e1RM: {e1rm})</Trans>
      </Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────

/**
 * Workout Complete / Post-Workout Summary Screen
 *
 * Shown after a session is successfully completed. Reads exercise/set data
 * from the Zustand store (still populated from the active workout) and clears
 * the store when navigating away.
 *
 * Shows: total volume, duration, exercise breakdown, best set per exercise.
 * Offers: "Done" (calendar), "Self-Assessment" (wellness survey).
 *
 * Falls back gracefully if the store has been cleared (e.g. after app restart).
 */
export function WorkoutCompleteScreen() {
  const { t } = useLingui();
  const router = useRouter();
  const clearSession = useClearSession();
  const exercises = useSessionStore((s) => s.exercises);
  const startedAt = useSessionStore((s) => s.startedAt);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);

  // Compute summary from store data
  const summary = useMemo(
    () => computeWorkoutSummary(exercises, startedAt),
    [exercises, startedAt],
  );

  const handleGoHome = useCallback(() => {
    clearSession();
    router.replace("/(tabs)");
  }, [clearSession, router]);

  const handleGoTrain = useCallback(() => {
    clearSession();
    router.replace("/(tabs)/train");
  }, [clearSession, router]);

  const handleSelfAssessment = useCallback(() => {
    router.push(`/(workout)/self-assessment?sessionId=${activeSessionId ?? ""}`);
  }, [router, activeSessionId]);

  return (
    <GradientBackground>
    <View className="flex-1">
      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="items-center pt-20 pb-8"
      >
        {/* Celebration */}
        <Text className="text-6xl mb-4">💪</Text>
        <Text className="text-surface-50 text-2xl font-bold mb-1">
          <Trans>Workout Complete!</Trans>
        </Text>
        <Text className="text-surface-400 text-sm mb-8 text-center">
          <Trans>Great effort — here's how it went.</Trans>
        </Text>

        {/* Stats grid */}
        <View className="w-full flex-row flex-wrap gap-3 mb-6">
          {/* Total volume */}
          <Card className="flex-1 min-w-[45%]">
            <Text className="text-surface-400 text-xs"><Trans>Total Volume</Trans></Text>
            <Text className="text-surface-50 text-xl font-bold mt-1">
              {summary.totalVolume.toLocaleString()}
            </Text>
            <Text className="text-surface-500 text-[10px]"><Trans>kg</Trans></Text>
          </Card>

          {/* Duration */}
          {summary.durationMinutes > 0 && (
            <Card className="flex-1 min-w-[45%]">
              <Text className="text-surface-400 text-xs"><Trans>Duration</Trans></Text>
              <Text className="text-surface-50 text-xl font-bold mt-1">
                {summary.durationMinutes}
              </Text>
              <Text className="text-surface-500 text-[10px]"><Trans>min</Trans></Text>
            </Card>
          )}

          {/* Sets */}
          <Card className="flex-1 min-w-[45%]">
            <Text className="text-surface-400 text-xs"><Trans>Sets Logged</Trans></Text>
            <Text className="text-surface-50 text-xl font-bold mt-1">
              {summary.totalSets}
            </Text>
            <Text className="text-surface-500 text-[10px]"><Trans>total</Trans></Text>
          </Card>

          {/* Exercises completed */}
          <Card className="flex-1 min-w-[45%]">
            <Text className="text-surface-400 text-xs"><Trans>Exercises</Trans></Text>
            <Text className="text-surface-50 text-xl font-bold mt-1">
              {summary.completedExercises}/{summary.totalExercises}
            </Text>
            <Text className="text-surface-500 text-[10px]"><Trans>completed</Trans></Text>
          </Card>
        </View>

        {/* Exercise breakdown with best set */}
        {summary.exerciseSummaries.length > 0 && (
          <Card className="w-full mb-6">
            <Text className="text-surface-50 text-sm font-bold mb-3">
              <Trans>Exercise Breakdown</Trans>
            </Text>
            {summary.exerciseSummaries.map((ex, idx) => (
              <View
                key={ex.exerciseId}
                className={`py-3 ${idx < summary.exerciseSummaries.length - 1 ? "border-b border-surface-800" : ""}`}
              >
                <View className="flex-row justify-between items-start">
                  <Text
                    className="text-surface-100 text-sm flex-1 mr-2 font-medium"
                    numberOfLines={1}
                  >
                    {ex.exerciseName}
                  </Text>
                  <Text className="text-surface-400 text-xs font-mono">
                    {ex.loggedSets} / {ex.targetSets} sets
                  </Text>
                </View>
                {ex.bestSet && (
                  <BestSetBadge
                    weightKg={ex.bestSet.weightKg}
                    reps={ex.bestSet.reps}
                    e1rm={ex.bestSet.e1rm}
                  />
                )}
                {ex.tonnage > 0 && (
                  <Text className="text-surface-500 text-[10px] mt-1 ml-1">
                    <Trans>Volume: {ex.tonnage} kg</Trans>
                  </Text>
                )}
              </View>
            ))}
          </Card>
        )}

        {/* Empty state for blank workouts */}
        {exercises.length === 0 && (
          <Card className="w-full mb-6">
            <Text className="text-surface-400 text-center py-4">
              <Trans>Free workout completed with no logged sets.</Trans>
            </Text>
          </Card>
        )}

        {/* Actions */}
        <View className="w-full gap-3">
          <Button
            title={t`Self-Assessment`}
            variant="primary"
            icon="analytics"
            onPress={handleSelfAssessment}
          />
          <Button
            title={t`Done`}
            variant="secondary"
            onPress={handleGoHome}
          />
        </View>
      </ScrollView>
    </View>
    </GradientBackground>
  );
}
