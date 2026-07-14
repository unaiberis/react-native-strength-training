import { useState, useMemo, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { EmptyState } from "@/shared/ui/EmptyState";

import { useAnalytics, type AnalyticsPeriod } from "../hooks/useAnalytics";
import { BarChart } from "../components/BarChart";
import { PersonalRecordsSection } from "@/features/records/components/PersonalRecordsSection";

// ─── Sub-components ─────────────────────────────────────────────────────

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
      className={`px-4 py-2 rounded-xl min-h-[44px] justify-center ${active ? "bg-surface-800" : ""}`}
      accessibilityRole="button"
      accessibilityLabel={`${label} view${active ? ", selected" : ""}`}
    >
      <Text className={`text-sm font-semibold ${active ? "text-surface-50" : "text-surface-400"}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-card rounded-2xl p-3 items-center shadow-card">
      <Text className="text-surface-50 text-xl font-bold">{value}</Text>
      <Text className="text-surface-400 text-xs mt-1">{label}</Text>
    </View>
  );
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`;
  return String(Math.round(kg));
}

// ─── Screen ─────────────────────────────────────────────────────────────

/**
 * AnalyticsScreen — Main analytics dashboard.
 *
 * Shows workout volume trends and exercise PR timelines.
 * Supports weekly/monthly toggle for charts.
 */
export function AnalyticsScreen() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("weekly");
  const router = useRouter();

  const {
    volumeByPeriod,
    exercises,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useAnalytics(period);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Compute total stats from raw data
  const totalStats = useMemo(() => {
    const totalVolume = volumeByPeriod.reduce((sum, d) => sum + d.volume, 0);
    const totalSessions = volumeByPeriod.reduce((sum, d) => sum + d.sessionCount, 0);
    return { totalVolume, totalSessions };
  }, [volumeByPeriod]);

  const hasData = volumeByPeriod.length > 0 || exercises.length > 0;

  if (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error loading analytics";
    return (
      <ErrorBoundary>
        <GradientBackground>
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-danger text-lg mb-2">Failed to load analytics</Text>
            <Text className="text-surface-400 text-xs mb-4 text-center px-4">{message}</Text>
            <TouchableOpacity
              onPress={() => refetch()}
              className="bg-card px-6 py-2 rounded-xl border border-border min-h-[44px] justify-center"
              accessibilityRole="button"
              accessibilityLabel="Retry loading analytics"
            >
              <Text className="text-surface-50 font-medium">Retry</Text>
            </TouchableOpacity>
          </View>
        </GradientBackground>
      </ErrorBoundary>
    );
  }

  // During loading, use placeholder values so the layout renders immediately
  const displayVolume = isLoading ? 0 : totalStats.totalVolume;
  const displaySessions = isLoading ? 0 : totalStats.totalSessions;
  const displayExercises = isLoading ? [] : exercises;
  const displayChart = isLoading ? [] : volumeByPeriod;
  const showEmpty = !isLoading && !hasData;

  return (
    <ErrorBoundary>
      <GradientBackground>
        <ScrollView
          className="flex-1 px-4 pt-16"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor="#B9B9B6"
            />
          }
        >
          {/* Header */}
          <Text className="text-[34px] font-black tracking-[-0.8] text-surface-50 mb-4">
            Analytics
          </Text>
          <Text className="text-surface-400 text-sm mb-6">
            Your training trends and progress
          </Text>

          {/* Period toggle */}
          <View className="flex-row bg-card rounded-2xl p-1 mb-6 self-start border border-border">
            <PeriodToggleButton
              label="Weekly"
              active={period === "weekly"}
              onPress={() => setPeriod("weekly")}
            />
            <PeriodToggleButton
              label="Monthly"
              active={period === "monthly"}
              onPress={() => setPeriod("monthly")}
            />
          </View>

          {/* Empty state — no data at all (only after loading completes) */}
          {showEmpty ? (
            <EmptyState
              icon="stats-chart-outline"
              title="No Analytics Data"
              subtitle="Complete a workout to see your analytics."
              action={{
                label: "Start Workout",
                onPress: () => router.push("/(tabs)/train"),
              }}
              className="py-8"
            />
          ) : (
            <>
              {/* Summary stats */}
              <View className="flex-row gap-3 mb-6">
                <StatCard label="Total Volume" value={isLoading ? "---" : formatVolume(displayVolume)} />
                <StatCard label="Workouts" value={isLoading ? "---" : String(displaySessions)} />
                <StatCard label="Exercises" value={isLoading ? "---" : String(displayExercises.length)} />
              </View>

              {/* Volume Trend Chart */}
              <View className="bg-card rounded-2xl p-4 mb-4 border border-border shadow-card">
                <Text className="text-surface-50 text-base font-bold mb-3">
                  {period === "weekly" ? "Weekly Volume" : "Monthly Volume"}
                </Text>
                <BarChart
                  data={displayChart.map((d) => ({ period: d.period, volume: d.volume }))}
                  valueKey="volume"
                  barColor="#B9B9B6"
                  height={isLoading ? 120 : Math.max(120, displayChart.length * 32)}
                />
              </View>

              {/* Exercise PR Timelines */}
              <Text className="text-surface-50 text-xl font-extrabold tracking-[-0.5] mb-3">Exercise Progress</Text>
              {!isLoading && displayExercises.length === 0 && (
                <View className="bg-card rounded-2xl p-6 mb-4 border border-border items-center shadow-card">
                  <Text className="text-surface-400 text-sm">
                    Complete some workouts to see your exercise progress here.
                  </Text>
                </View>
              )}
              {displayExercises.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  className="bg-card rounded-2xl p-4 mb-3 border border-border min-h-[60px] justify-center shadow-button"
                  onPress={() => router.push(`/(tabs)/analytics/exercise/${ex.id}`)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`View progress for ${ex.name}`}
                >
                  <View className="flex-row justify-between items-center">
                    <Text className="text-surface-50 font-bold text-base">{ex.name}</Text>
                    <Text className="text-surface-400 text-xs">Tap for details</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Personal Records section — surfaced inside Analytics, regardless of chart data */}
          <PersonalRecordsSection />

          {/* Bottom spacing */}
          <View className="h-8" />
        </ScrollView>
      </GradientBackground>
    </ErrorBoundary>
  );
}
