import { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { useAnalytics, type AnalyticsPeriod } from "../hooks/useAnalytics";
import { BarChart, PRTimelineChart } from "../components/BarChart";

/**
 * ExerciseTimelineScreen — Per-exercise progress detail view.
 *
 * Shows full history for a specific exercise: e1RM progression over time,
 * max weight per session, and volume per session.
 */
export function ExerciseTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [period] = useState<AnalyticsPeriod>("weekly");

  const {
    getExerciseProgress,
    getPersonalRecordTimeline,
    exercises,
    isLoading,
  } = useAnalytics(period);

  const exercise = useMemo(
    () => exercises.find((ex) => ex.id === id),
    [exercises, id],
  );

  const progress = useMemo(
    () => (id ? getExerciseProgress(id) : []),
    [id, getExerciseProgress],
  );

  const timeline = useMemo(
    () => (id ? getPersonalRecordTimeline(id) : []),
    [id, getPersonalRecordTimeline],
  );

  const chartTimeline = useMemo(
    () => timeline.map((t) => ({ date: t.date, e1rm: t.estimatedOneRm })),
    [timeline],
  );

  if (isLoading) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#B9B9B6" />
          <Text className="text-surface-400 text-lg mt-3">Loading...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        className="flex-1 px-4 pt-16"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-surface-400 text-sm">\u2190 Back to Analytics</Text>
        </TouchableOpacity>

        <Text className="text-surface-50 text-2xl font-bold mb-1">
          {exercise?.name ?? "Unknown Exercise"}
        </Text>
        <Text className="text-surface-400 text-sm mb-6">
          {progress.length > 0
            ? `${progress.length} sessions logged`
            : "No sessions logged yet"}
        </Text>

        {/* Stats grid */}
        {progress.length > 0 && (
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-card rounded-2xl p-3 items-center border border-border">
              <Text className="text-surface-50 text-xl font-bold">
                {Math.round(Math.max(...progress.map((p) => p.bestE1RM)))}
              </Text>
              <Text className="text-surface-400 text-xs mt-1">Best e1RM</Text>
            </View>
            <View className="flex-1 bg-card rounded-2xl p-3 items-center border border-border">
              <Text className="text-surface-50 text-xl font-bold">
                {Math.round(Math.max(...progress.map((p) => p.maxWeight)))}
              </Text>
              <Text className="text-surface-400 text-xs mt-1">Max Weight</Text>
            </View>
            <View className="flex-1 bg-card rounded-2xl p-3 items-center border border-border">
              <Text className="text-surface-50 text-xl font-bold">
                {progress.reduce((sum, p) => sum + p.totalSets, 0)}
              </Text>
              <Text className="text-surface-400 text-xs mt-1">Total Sets</Text>
            </View>
          </View>
        )}

        {/* e1RM Progression */}
        {chartTimeline.length > 0 && (
          <View className="bg-card rounded-2xl p-4 mb-4 border border-border">
            <Text className="text-surface-50 text-base font-bold mb-3">e1RM Progression</Text>
            <PRTimelineChart
              data={chartTimeline}
              exerciseName={exercise?.name ?? ""}
              barColor="#B9B9B6"
              height={160}
            />
          </View>
        )}

        {/* Volume per session */}
        {progress.length > 0 && (
          <View className="bg-card rounded-2xl p-4 mb-4 border border-border">
            <Text className="text-surface-50 text-base font-bold mb-3">Volume per Session</Text>
            <BarChart
              data={progress.map((p) => ({ period: p.date, volume: p.totalVolume }))}
              valueKey="volume"
              barColor="#D7D7D2"
              height={Math.max(100, progress.length * 32)}
            />
          </View>
        )}

        {/* No data state */}
        {progress.length === 0 && (
          <View className="bg-card rounded-2xl p-6 items-center border border-border">
            <Text className="text-surface-400 text-sm">
              No sessions logged for this exercise yet.
            </Text>
          </View>
        )}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </GradientBackground>
  );
}
