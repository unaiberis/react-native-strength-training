/**
 * ExerciseTimelineScreen — Per-exercise progress detail view.
 *
 * Shows full history for a specific exercise: e1RM progression over time,
 * max weight per session, and volume per session.
 */

import { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLingui } from "@lingui/react/macro";

import { useAnalytics, type AnalyticsPeriod } from "../hooks/useAnalytics";
import { BarChart, PRTimelineChart } from "../components/BarChart";

export function ExerciseTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLingui();
  const [period, setPeriod] = useState<AnalyticsPeriod>("weekly");

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

  const stats = useMemo(() => {
    if (progress.length === 0) return null;
    const bestE1RM = Math.max(...progress.map((p) => p.bestE1RM));
    const maxWeight = Math.max(...progress.map((p) => p.maxWeight));
    const totalSessions = progress.length;
    const totalSets = progress.reduce((sum, p) => sum + p.totalSets, 0);
    return { bestE1RM, maxWeight, totalSessions, totalSets };
  }, [progress]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-textMuted text-lg">{t`Loading...`}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} className="mb-4">
        <Text className="text-textMuted text-sm">{t`← Back to Analytics`}</Text>
      </TouchableOpacity>

      <Text className="text-text text-2xl font-bold mb-1">
        {exercise?.name ?? t`Unknown Exercise`}
      </Text>
      <Text className="text-textMuted text-sm mb-6">
        {progress.length > 0
          ? t`${progress.length} sessions logged`
          : t`No sessions logged yet`}
      </Text>

      {/* Stats grid */}
      {stats && (
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-card rounded-2xl p-3 items-center">
            <Text className="text-text text-xl font-bold">{Math.round(stats.bestE1RM)}</Text>
            <Text className="text-textMuted text-xs mt-1">{t`Best e1RM`}</Text>
          </View>
          <View className="flex-1 bg-card rounded-2xl p-3 items-center">
            <Text className="text-text text-xl font-bold">{Math.round(stats.maxWeight)}</Text>
            <Text className="text-textMuted text-xs mt-1">{t`Max Weight`}</Text>
          </View>
          <View className="flex-1 bg-card rounded-2xl p-3 items-center">
            <Text className="text-text text-xl font-bold">{stats.totalSets}</Text>
            <Text className="text-textMuted text-xs mt-1">{t`Total Sets`}</Text>
          </View>
        </View>
      )}

      {/* e1RM Progression */}
      {timeline.length > 0 && (
        <View className="bg-card rounded-2xl p-4 mb-4">
          <Text className="text-text text-base font-bold mb-3">{t`e1RM Progression`}</Text>
          <PRTimelineChart
            data={timeline}
            exerciseName={exercise?.name ?? ""}
            barColor="#B9B9B6"
            height={160}
          />
        </View>
      )}

      {/* Volume per session */}
      {progress.length > 0 && (
        <View className="bg-card rounded-2xl p-4 mb-4">
          <Text className="text-text text-base font-bold mb-3">{t`Volume per Session`}</Text>
          <BarChart
            data={progress.map((p) => ({ period: p.date, volume: p.totalVolume }))}
            valueKey="volume"
            barColor="#D7D7D2"
            height={Math.max(100, progress.length * 32)}
          />
        </View>
      )}

      {/* Session-by-session breakdown */}
      {progress.length > 0 && (
        <View className="bg-card rounded-2xl p-4">
          <Text className="text-text text-base font-bold mb-3">{t`Session Details`}</Text>
          {progress.map((p, index) => (
            <View
              key={p.session_id}
              className="flex-row justify-between py-2 border-b border-border/30"
            >
              <Text className="text-textMuted text-sm w-20">{p.date}</Text>
              <Text className="text-text text-sm w-16 text-right">
                {Math.round(p.bestE1RM)} e1RM
              </Text>
              <Text className="text-text text-sm w-16 text-right">
                {Math.round(p.maxWeight)} kg
              </Text>
              <Text className="text-text text-sm w-16 text-right">
                {Math.round(p.totalVolume)} vol
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
