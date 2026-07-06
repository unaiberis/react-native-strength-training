import { useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useLingui } from "@lingui/react/macro";
import { Trans } from "@lingui/react/macro";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { useSessionStore } from "../../../stores/session-store";
import { useClearSession } from "../hooks/useWorkoutSession";

/**
 * Workout Complete Screen
 *
 * Shown after a session is successfully completed. Reads exercise/set data
 * from the Zustand store (still populated from the active workout) and clears
 * the store when navigating away.
 *
 * Falls back gracefully if the store has been cleared (e.g. after app restart).
 */
export function WorkoutCompleteScreen() {
  const { t } = useLingui();
  const router = useRouter();
  const clearSession = useClearSession();
  const exercises = useSessionStore((s) => s.exercises);
  const startedAt = useSessionStore((s) => s.startedAt);

  // Compute summary
  const totalLoggedSets = exercises.reduce(
    (sum, ex) => sum + ex.loggedSets.length,
    0,
  );
  const totalExercises = exercises.length;
  const completedExercises = exercises.filter(
    (ex) => ex.loggedSets.length > 0,
  ).length;

  // Compute duration from startedAt
  const durationMinutes = startedAt
    ? Math.round(
        (Date.now() - new Date(startedAt).getTime()) / 60000,
      )
    : 0;

  const handleGoHome = useCallback(() => {
    clearSession();
    router.replace("/(tabs)");
  }, [clearSession, router]);

  const handleGoTrain = useCallback(() => {
    clearSession();
    router.replace("/(tabs)/train");
  }, [clearSession, router]);

  return (
    <GradientBackground>
    <View className="flex-1">
      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="items-center pt-24 pb-8"
      >
        {/* Celebration */}
        <Text className="text-6xl mb-4">🎉</Text>
        <Text className="text-surface-50 text-2xl font-bold mb-2">
          <Trans>Workout Complete!</Trans>
        </Text>
        <Text className="text-surface-400 text-base mb-8 text-center">
          <Trans>Great effort — keep up the momentum.</Trans>
        </Text>

        {/* Summary cards */}
        <Card className="w-full mb-3">
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-surface-400"><Trans>Sets logged</Trans></Text>
            <Text className="text-surface-50 text-lg font-bold">
              {totalLoggedSets}
            </Text>
          </View>
        </Card>

        {durationMinutes > 0 && (
          <Card className="w-full mb-3">
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-surface-400"><Trans>Duration</Trans></Text>
              <Text className="text-surface-50 text-lg font-bold">
                {durationMinutes} min
              </Text>
            </View>
          </Card>
        )}

        {totalExercises > 0 && (
          <Card className="w-full mb-3">
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-surface-400"><Trans>Exercises completed</Trans></Text>
              <Text className="text-surface-50 text-lg font-bold">
                {completedExercises} / {totalExercises}
              </Text>
            </View>
          </Card>
        )}

        {/* Exercise breakdown */}
        {exercises.length > 0 && (
          <Card title={t`Exercise Summary`} className="w-full mb-8">
            {exercises.map((ex, idx) => (
              <View
                key={ex.exerciseId}
                className={`flex-row justify-between items-center py-2 ${
                  idx < exercises.length - 1 ? "border-b border-surface-800" : ""
                }`}
              >
                <Text
                  className="text-surface-100 text-sm flex-1 mr-2"
                  numberOfLines={1}
                >
                  {ex.exerciseName}
                </Text>
                <Text className="text-surface-400 text-sm font-mono">
                  {ex.loggedSets.length} / {ex.targetSets} sets
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Empty state for blank workouts */}
        {exercises.length === 0 && (
          <Card className="w-full mb-8">
            <Text className="text-surface-400 text-center py-4">
              <Trans>Free workout completed with no logged sets.</Trans>
            </Text>
          </Card>
        )}

        {/* Actions */}
        <View className="w-full gap-3">
          <Button
            title={t`Back to Training`}
            variant="primary"
            onPress={handleGoTrain}
          />
          <Button
            title={t`Go Home`}
            variant="secondary"
            onPress={handleGoHome}
          />
        </View>
      </ScrollView>
    </View>
    </GradientBackground>
  );
}
