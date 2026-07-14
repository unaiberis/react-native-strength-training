import { useState, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ScreenLayout } from "@/shared/ui/ScreenLayout";
import { Card } from "@/shared/ui/Card";

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
      className={`px-4 py-2 rounded-xl min-h-[44px] justify-center ${active ? "bg-cardSoft" : ""}`}
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
    <Card className="flex-1 items-center p-3">
      <Text className="text-surface-50 text-xl font-bold">{value}</Text>
      <Text className="text-surface-400 text-xs mt-1">{label}</Text>
    </Card>
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
      <ScreenLayout
        error={message}
        errorLabel="Retry"
        onRetry={() => refetch()}
      />
    );
  }

  // During loading, use placeholder values so the layout renders immediately
  const displayVolume = isLoading ? 0 : totalStats.totalVolume;
  const displaySessions = isLoading ? 0 : totalStats.totalSessions;
  const displayExercises = isLoading ? [] : exercises;
  const displayChart = isLoading ? [] : volumeByPeriod;
  const showEmpty = !isLoading && !hasData;

  return (
    <ScreenLayout
      title="Analytics"
      subtitle="Your training trends and progress"
    >
      {/* Empty state — inline so PersonalRecordsSection always renders below */}
      {showEmpty ? (
        <>
          <EmptyStateCard
            icon="stats-chart-outline"
            title="No Analytics Data"
            subtitle="Complete a workout to see your analytics."
            action={{
              label: "Start Workout",
              onPress: () => router.push("/(tabs)/train"),
            }}
          />
        </>
      ) : (
        <>
          {/* Period toggle */}
          <Card className="flex-row p-1 mb-6 self-start">
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
          </Card>

          {/* Summary stats */}
          <View className="flex-row gap-3 mb-6">
            <StatCard label="Total Volume" value={isLoading ? "---" : formatVolume(displayVolume)} />
            <StatCard label="Workouts" value={isLoading ? "---" : String(displaySessions)} />
            <StatCard label="Exercises" value={isLoading ? "---" : String(displayExercises.length)} />
          </View>

          {/* Volume Trend Chart */}
          <Card className="mb-4">
            <Text className="text-surface-50 text-base font-bold mb-3">
              {period === "weekly" ? "Weekly Volume" : "Monthly Volume"}
            </Text>
            <BarChart
              data={displayChart.map((d) => ({ period: d.period, volume: d.volume }))}
              valueKey="volume"
              barColor="#B9B9B6"
              height={isLoading ? 120 : Math.max(120, displayChart.length * 32)}
            />
          </Card>

          {/* Exercise PR Timelines */}
          <Text className="text-surface-50 text-xl font-extrabold tracking-[-0.5] mb-3">Exercise Progress</Text>
          {!isLoading && displayExercises.length === 0 && (
            <Card className="items-center p-6 mb-4">
              <Text className="text-surface-400 text-sm">
                Complete some workouts to see your exercise progress here.
              </Text>
            </Card>
          )}
          {displayExercises.map((ex) => (
            <Card
              key={ex.id}
              className="mb-3 min-h-[60px] justify-center"
              onPress={() => router.push(`/(tabs)/analytics/exercise/${ex.id}`)}
            >
              <View className="flex-row justify-between items-center">
                <Text className="text-surface-50 font-bold text-base">{ex.name}</Text>
                <Text className="text-surface-400 text-xs">Tap for details</Text>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Personal Records section — surfaced inside Analytics, regardless of chart data */}
      <PersonalRecordsSection />
    </ScreenLayout>
  );
}

// ─── Inline EmptyStateCard ──────────────────────────────────────────────────

function EmptyStateCard({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: string;
  title: string;
  subtitle: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <Card className="items-center p-6">
      <Text className="text-surface-50 text-base text-center mb-2">{title}</Text>
      <Text className="text-surface-400 text-sm text-center mb-4">{subtitle}</Text>
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          className="bg-titanium px-6 py-3 rounded-xl"
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text className="text-background font-bold">{action.label}</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}
