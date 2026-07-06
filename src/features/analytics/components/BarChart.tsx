/**
 * BarChart — A simple View-based bar chart component for analytics.
 *
 * Renders horizontal bars with labels using NativeWind-styled Views.
 * No external charting library needed — avoids react-native-svg dependency.
 */

import { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import type { VolumeDataPoint, ConsistencyDataPoint } from "../hooks/analytics-calc";

interface BarChartProps {
  data: VolumeDataPoint[] | ConsistencyDataPoint[];
  /** Accessor for the bar value (volume or count) */
  valueKey: "volume" | "count";
  /** Optional max value for fixed scale (auto-computed if not set) */
  maxValue?: number;
  /** Label prefix for each bar */
  labelPrefix?: string;
  /** Color for the bars */
  barColor?: string;
  /** Whether to show value labels on bars */
  showValues?: boolean;
  /** Height of the chart container */
  height?: number;
}

/**
 * Format a period label for display.
 * "2026-W27" -> "W27", "2026-07" -> "Jul"
 */
function formatPeriodLabel(period: string): string {
  if (period.includes("-W")) {
    // Weekly: "2026-W27" -> "W27"
    return period.split("-W")[1] ? `W${period.split("-W")[1]}` : period;
  }
  // Monthly: "2026-07" -> "Jul"
  const months = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const monthNum = parseInt(period.split("-")[1], 10);
  return months[monthNum] ?? period;
}

export function BarChart({
  data,
  valueKey,
  maxValue: externalMax,
  barColor = "#B9B9B6",
  showValues = true,
  height = 160,
}: BarChartProps) {
  const maxValue = useMemo(() => {
    if (externalMax !== undefined) return externalMax;
    if (data.length === 0) return 1;
    return Math.max(...data.map((d) => (d as any)[valueKey] as number), 1);
  }, [data, valueKey, externalMax]);

  const barHeight = Math.max(24, Math.min(height / data.length - 8, 36));

  if (data.length === 0) {
    return (
      <View className="items-center justify-center py-8" style={{ height }}>
        <Text className="text-textSubtle text-sm">No data yet</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingVertical: 4 }}
      showsVerticalScrollIndicator={false}
    >
      {data.map((point, index) => {
        const value = (point as any)[valueKey] as number;
        const barWidth = Math.max(4, (value / maxValue) * 100);
        const label = formatPeriodLabel(point.period);

        return (
          <View key={point.period + index} className="flex-row items-center mb-1.5">
            {/* Period label */}
            <Text className="text-textSubtle text-xs w-10 text-right mr-2 font-semibold">
              {label}
            </Text>
            {/* Bar track */}
            <View className="flex-1 h-5 bg-graphite rounded-md overflow-hidden">
              <View
                className="h-full rounded-md"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: barColor,
                  opacity: Math.max(0.3, value / maxValue),
                }}
              />
            </View>
            {/* Value label */}
            {showValues && (
              <Text className="text-text text-xs ml-2 w-16 font-medium">
                {formatValue(value, valueKey)}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function formatValue(value: number, key: "volume" | "count"): string {
  if (key === "volume") {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k kg`;
    }
    return `${Math.round(value)} kg`;
  }
  return `${value} sessions`;
}

// ─── PR Timeline Chart ────────────────────────────────────────────────────

interface TimelineChartProps {
  data: { date: string; e1rm: number }[];
  barColor?: string;
  height?: number;
  exerciseName: string;
}

/**
 * A simple timeline chart for showing PR/e1RM progression over time.
 * Renders a connected-view of best values per date.
 */
export function PRTimelineChart({
  data,
  barColor = "#B9B9B6",
  height = 140,
  exerciseName,
}: TimelineChartProps) {
  const maxE1RM = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map((d) => d.e1rm), 1);
  }, [data]);

  if (data.length === 0) {
    return (
      <View className="items-center justify-center py-6" style={{ height }}>
        <Text className="text-textSubtle text-sm">No data for {exerciseName}</Text>
      </View>
    );
  }

  return (
    <View style={{ height }} className="justify-end">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 8,
          gap: 6,
        }}
      >
        {data.map((point, index) => {
          const barHeightPct = (point.e1rm / maxE1RM) * 100;
          const barH = Math.max(8, (barHeightPct / 100) * (height - 40));
          const dateLabel = point.date.substring(5); // "MM-DD"

          return (
            <View key={index} className="items-center" style={{ width: 44 }}>
              <Text className="text-text text-[10px] font-medium mb-1">
                {Math.round(point.e1rm)}
              </Text>
              <View
                className="w-8 rounded-t-md"
                style={{
                  height: barH,
                  backgroundColor: barColor,
                  opacity: Math.max(0.4, barHeightPct / 100),
                }}
              />
              <Text className="text-textSubtle text-[9px] mt-1">{dateLabel}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
