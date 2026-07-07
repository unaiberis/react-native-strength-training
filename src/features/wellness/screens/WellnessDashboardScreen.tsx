import { useMemo } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { useWellnessTrends } from "../hooks/useWellnessTrends";
import { LineChart, type LineChartDataPoint } from "@/features/analytics/components/LineChart";

// ─── Metric Config ─────────────────────────────────────────────────────────

interface MetricConfig {
  key: "sessionRpe" | "sleep" | "fatigue" | "soreness" | "mood";
  label: string;
  color: string;
  yLabel: string;
  minValue: number;
  maxValue: number;
}

const METRICS: MetricConfig[] = [
  { key: "sessionRpe", label: "Session RPE", color: "#D65F5F", yLabel: "RPE (1-10)", minValue: 1, maxValue: 10 },
  { key: "sleep", label: "Sleep Quality", color: "#5FA8D6", yLabel: "Sleep (1-5)", minValue: 1, maxValue: 5 },
  { key: "fatigue", label: "Fatigue", color: "#D6A65F", yLabel: "Fatigue (1-5)", minValue: 1, maxValue: 5 },
  { key: "soreness", label: "Soreness", color: "#A65FD6", yLabel: "Soreness (1-5)", minValue: 1, maxValue: 5 },
  { key: "mood", label: "Mood", color: "#5FD6A6", yLabel: "Mood (1-5)", minValue: 1, maxValue: 5 },
];

// ─── Sub-components ────────────────────────────────────────────────────────

function PeriodCard({
  label,
  period,
}: {
  label: string;
  period: {
    avgSessionRpe: number | null;
    avgSleep: number | null;
    avgFatigue: number | null;
    avgSoreness: number | null;
    avgMood: number | null;
    entryCount: number;
  };
}) {
  const metrics = [
    { label: "RPE", value: period.avgSessionRpe },
    { label: "Sleep", value: period.avgSleep },
    { label: "Fatigue", value: period.avgFatigue },
    { label: "Soreness", value: period.avgSoreness },
    { label: "Mood", value: period.avgMood },
  ];

  return (
    <View className="bg-card rounded-2xl p-4 border border-border mb-3">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-surface-50 text-base font-bold">{label}</Text>
        <Text className="text-surface-500 text-xs">{period.entryCount} entries</Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {metrics.map((m) => (
          <View key={m.label} className="bg-surface-800 rounded-xl px-3 py-2 min-w-[60px] flex-1">
            <Text className="text-surface-500 text-[10px] uppercase tracking-wider">{m.label}</Text>
            <Text className="text-surface-50 text-lg font-bold">
              {m.value !== null ? m.value.toFixed(1) : "—"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View className="bg-card rounded-2xl p-6 border border-border items-center mb-4">
      <Text className="text-surface-100 text-lg font-semibold mb-2">
        No wellness data yet
      </Text>
      <Text className="text-surface-400 text-sm text-center">
        Start logging your daily wellness after workouts to see trends here.
        Track your RPE, sleep, fatigue, soreness, and mood over time.
      </Text>
    </View>
  );
}

// ─── Metric Trend Chart ────────────────────────────────────────────────────

function MetricTrendChart({
  metric,
  data,
}: {
  metric: MetricConfig;
  data: LineChartDataPoint[];
}) {
  return (
    <View className="bg-card rounded-2xl p-4 border border-border mb-3">
      <Text className="text-surface-50 text-base font-bold mb-1">{metric.label}</Text>
      <Text className="text-surface-500 text-xs mb-3">Daily values over time</Text>
      <LineChart
        data={data}
        lineColor={metric.color}
        trendColor={metric.color}
        showTrend
        trendWindow={3}
        minValue={metric.minValue}
        maxValue={metric.maxValue}
        yLabel={metric.yLabel}
        height={160}
      />
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────

/**
 * WellnessDashboardScreen — Shows wellness trends and time series charts.
 *
 * Displays rolling averages for 7, 30, and 90 day periods for RPE,
 * sleep quality, fatigue, soreness, and mood. Includes line charts
 * showing trends over time for each metric.
 */
export function WellnessDashboardScreen() {
  const {
    periods,
    timeSeries,
    isLoading,
    error,
    refetch,
  } = useWellnessTrends();

  // Build chart data for each metric
  const chartDataByMetric = useMemo(() => {
    const map = new Map<string, LineChartDataPoint[]>();
    for (const metric of METRICS) {
      const data = timeSeries
        .map((t) => ({
          date: t.date,
          value: t[metric.key] ?? 0,
        }))
        .filter((p) => p.value > 0);
      map.set(metric.key, data);
    }
    return map;
  }, [timeSeries]);

  if (isLoading) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#B9B9B6" />
          <Text className="text-surface-400 text-lg mt-3">Loading wellness trends...</Text>
        </View>
      </GradientBackground>
    );
  }

  if (error) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-danger text-lg mb-2">Failed to load wellness data</Text>
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

  const hasData = timeSeries.length > 0;

  return (
    <GradientBackground>
      <ScrollView
        className="flex-1 px-4 pt-16"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text className="text-surface-50 text-2xl font-bold mb-1">
          Wellness
        </Text>
        <Text className="text-surface-400 text-sm mb-6">
          Track your recovery and wellbeing trends
        </Text>

        {/* Period Averages */}
        {hasData && (
          <>
            <Text className="text-surface-50 text-lg font-bold mb-3">
              Rolling Averages
            </Text>
            {periods.map((period) => {
              const labels: Record<string, string> = {
                "7d": "Last 7 Days",
                "30d": "Last 30 Days",
                "90d": "Last 90 Days",
              };
              return (
                <PeriodCard
                  key={period.period}
                  label={labels[period.period] ?? period.period}
                  period={period}
                />
              );
            })}
          </>
        )}

        {/* Trend Charts */}
        {hasData && (
          <>
            <Text className="text-surface-50 text-lg font-bold mb-3 mt-2">
              Trends
            </Text>
            {METRICS.map((metric) => {
              const chartData = chartDataByMetric.get(metric.key) ?? [];
              if (chartData.length < 2) return null;
              return (
                <MetricTrendChart
                  key={metric.key}
                  metric={metric}
                  data={chartData}
                />
              );
            })}
          </>
        )}

        {/* Empty state */}
        {!hasData && <EmptyState />}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </GradientBackground>
  );
}
