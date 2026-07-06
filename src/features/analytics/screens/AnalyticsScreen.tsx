/**
 * AnalyticsScreen — Main analytics dashboard.
 *
 * Shows workout volume trends, consistency data, and exercise PR timelines.
 * Supports weekly/monthly toggle for all charts.
 * Each exercise shows a mini PR timeline and can be tapped for a full detail view.
 */

import { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useLingui } from "@lingui/react/macro";

import { useAnalytics, type AnalyticsPeriod } from "../hooks/useAnalytics";
import { BarChart, PRTimelineChart } from "../components/BarChart";

export function AnalyticsScreen() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("weekly");
  const router = useRouter();
  const { t } = useLingui();

  const {
    volumeByPeriod,
    consistencyData,
    exercises,
    isLoading,
    error,
    getPersonalRecordTimeline,
    refetch,
  } = useAnalytics(period);

  // Compute total stats from raw data
  const totalStats = useMemo(() => {
    const totalVolume = volumeByPeriod.reduce((sum, d) => sum + d.volume, 0);
    const totalSessions = consistencyData.reduce((sum, d) => sum + d.count, 0);
    return { totalVolume, totalSessions };
  }, [volumeByPeriod, consistencyData]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-textMuted text-lg">{t`Loading analytics...`}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-danger text-lg mb-2">{t`Failed to load analytics`}</Text>
        <TouchableOpacity onPress={refetch} className="bg-card px-6 py-2 rounded-xl">
          <Text className="text-text font-medium">{t`Retry`}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* Header */}
      <Text className="text-text text-2xl font-bold mb-1">{t`Analytics`}</Text>
      <Text className="text-textMuted text-sm mb-6">{t`Your training trends and progress`}</Text>

      {/* Period toggle */}
      <View className="flex-row bg-card rounded-2xl p-1 mb-6 self-start">
        <PeriodToggleButton
          label={t`Weekly`}
          active={period === "weekly"}
          onPress={() => setPeriod("weekly")}
        />
        <PeriodToggleButton
          label={t`Monthly`}
          active={period === "monthly"}
          onPress={() => setPeriod("monthly")}
        />
      </View>

      {/* Summary stats */}
      <View className="flex-row gap-3 mb-6">
        <StatCard
          label={t`Total Volume`}
          value={formatVolume(totalStats.totalVolume)}
        />
        <StatCard
          label={t`Workouts`}
          value={String(totalStats.totalSessions)}
        />
        <StatCard
          label={t`Exercises`}
          value={String(exercises.length)}
        />
      </View>

      {/* Volume Trend Chart */}
      <View className="bg-card rounded-2xl p-4 mb-4">
        <Text className="text-text text-base font-bold mb-3">
          {period === "weekly" ? t`Weekly Volume` : t`Monthly Volume`}
        </Text>
        <BarChart
          data={volumeByPeriod}
          valueKey="volume"
          barColor="#B9B9B6"
          height={Math.max(120, volumeByPeriod.length * 32)}
        />
      </View>

      {/* Consistency Chart */}
      <View className="bg-card rounded-2xl p-4 mb-6">
        <Text className="text-text text-base font-bold mb-3">
          {period === "weekly" ? t`Workouts per Week` : t`Workouts per Month`}
        </Text>
        <BarChart
          data={consistencyData}
          valueKey="count"
          barColor="#D7D7D2"
          height={Math.max(100, consistencyData.length * 32)}
        />
      </View>

      {/* Exercise PR Timelines */}
      <Text className="text-text text-lg font-bold mb-3">{t`Exercise Progress`}</Text>
      {exercises.map((ex) => {
        const timeline = getPersonalRecordTimeline(ex.id);
        return (
          <TouchableOpacity
            key={ex.id}
            className="bg-card rounded-2xl p-4 mb-3"
            onPress={() => router.push(`/(tabs)/analytics/exercise/${ex.id}`)}
            activeOpacity={0.7}
          >
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-text font-bold text-base">{ex.name}</Text>
              {timeline.length > 0 && (
                <Text className="text-textMuted text-xs">
                  {t`Best`}: {Math.round(timeline[timeline.length - 1].e1rm)} kg e1RM
                </Text>
              )}
            </View>
            <PRTimelineChart
              data={timeline}
              exerciseName={ex.name}
              barColor="#B9B9B6"
              height={100}
            />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function PeriodToggleButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-4 py-2 rounded-xl ${active ? "bg-backgroundSoft" : ""}`}
    >
      <Text className={`text-sm font-semibold ${active ? "text-text" : "text-textMuted"}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-card rounded-2xl p-3 items-center">
      <Text className="text-text text-xl font-bold">{value}</Text>
      <Text className="text-textMuted text-xs mt-1">{label}</Text>
    </View>
  );
}

function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}k`;
  }
  return String(Math.round(kg));
}
