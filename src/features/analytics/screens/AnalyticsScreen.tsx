import { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { useAnalytics, type AnalyticsPeriod } from "../hooks/useAnalytics";
import { BarChart } from "../components/BarChart";

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
      className={`px-4 py-2 rounded-xl ${active ? "bg-surface-800" : ""}`}
    >
      <Text className={`text-sm font-semibold ${active ? "text-surface-50" : "text-surface-400"}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-card rounded-2xl p-3 items-center">
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
    error,
    refetch,
  } = useAnalytics(period);

  // Compute total stats from raw data
  const totalStats = useMemo(() => {
    const totalVolume = volumeByPeriod.reduce((sum, d) => sum + d.volume, 0);
    const totalSessions = volumeByPeriod.reduce((sum, d) => sum + d.sessionCount, 0);
    return { totalVolume, totalSessions };
  }, [volumeByPeriod]);

  if (isLoading) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#B9B9B6" />
          <Text className="text-surface-400 text-lg mt-3">Loading analytics...</Text>
        </View>
      </GradientBackground>
    );
  }

  if (error) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-danger text-lg mb-2">Failed to load analytics</Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-card px-6 py-2 rounded-xl border border-border"
          >
            <Text className="text-surface-50 font-medium">Retry</Text>
          </TouchableOpacity>
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
        {/* Header */}
        <Text className="text-surface-50 text-2xl font-bold mb-1">
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

        {/* Summary stats */}
        <View className="flex-row gap-3 mb-6">
          <StatCard label="Total Volume" value={formatVolume(totalStats.totalVolume)} />
          <StatCard label="Workouts" value={String(totalStats.totalSessions)} />
          <StatCard label="Exercises" value={String(exercises.length)} />
        </View>

        {/* Volume Trend Chart */}
        <View className="bg-card rounded-2xl p-4 mb-4 border border-border">
          <Text className="text-surface-50 text-base font-bold mb-3">
            {period === "weekly" ? "Weekly Volume" : "Monthly Volume"}
          </Text>
          <BarChart
            data={volumeByPeriod.map((d) => ({ period: d.period, volume: d.volume }))}
            valueKey="volume"
            barColor="#B9B9B6"
            height={Math.max(120, volumeByPeriod.length * 32)}
          />
        </View>

        {/* Exercise PR Timelines */}
        <Text className="text-surface-50 text-lg font-bold mb-3">Exercise Progress</Text>
        {exercises.length === 0 && (
          <View className="bg-card rounded-2xl p-6 mb-4 border border-border items-center">
            <Text className="text-surface-400 text-sm">
              Complete some workouts to see your exercise progress here.
            </Text>
          </View>
        )}
        {exercises.map((ex) => (
          <TouchableOpacity
            key={ex.id}
            className="bg-card rounded-2xl p-4 mb-3 border border-border"
            onPress={() => router.push(`/(tabs)/analytics/exercise/${ex.id}`)}
            activeOpacity={0.7}
          >
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-surface-50 font-bold text-base">{ex.name}</Text>
              <Text className="text-surface-400 text-xs">Tap for details</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </GradientBackground>
  );
}
