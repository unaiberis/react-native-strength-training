import { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────

export interface BarChartDataPoint {
  period: string;
  [key: string]: string | number;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  /** Accessor for the bar value */
  valueKey: string;
  /** Optional max value for fixed scale (auto-computed if not set) */
  maxValue?: number;
  /** Color for the bars */
  barColor?: string;
  /** Whether to show value labels on bars */
  showValues?: boolean;
  /** Height of the chart container */
  height?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatPeriodLabel(period: string): string {
  if (period.includes("-W")) {
    const weekNum = period.split("-W")[1];
    return weekNum ? `W${weekNum}` : period;
  }
  const months: Record<string, string> = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
    "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
    "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
  };
  const monthNum = period.split("-")[1];
  return months[monthNum] ?? period;
}

function formatValue(value: number, key: string): string {
  if (key === "volume") {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k kg`;
    return `${Math.round(value)} kg`;
  }
  if (key === "count") return `${value} sessions`;
  return String(Math.round(value));
}

// ─── Bar Chart ────────────────────────────────────────────────────────────

/**
 * A simple View-based bar chart for analytics data.
 * Renders horizontal bars with labels using NativeWind-styled Views.
 * No external charting library needed.
 */
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
    return Math.max(...data.map((d) => (d[valueKey] as number) || 0), 1);
  }, [data, valueKey, externalMax]);

  if (data.length === 0) {
    return (
      <View className="items-center justify-center py-8" style={{ height }}>
        <Text className="text-surface-500 text-sm">No data yet</Text>
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
        const value = (point[valueKey] as number) || 0;
        const barWidth = Math.max(4, (value / maxValue) * 100);
        const label = formatPeriodLabel(point.period);

        return (
          <View key={point.period + index} className="flex-row items-center mb-1.5">
            {/* Period label */}
            <Text className="text-surface-500 text-xs w-10 text-right mr-2 font-semibold">
              {label}
            </Text>
            {/* Bar track */}
            <View className="flex-1 h-5 bg-surface-800 rounded-md overflow-hidden">
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
              <Text className="text-surface-50 text-xs ml-2 w-16 font-medium">
                {formatValue(value, valueKey)}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
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
 * Renders vertical bars for each data point, sorted chronologically.
 */
export function PRTimelineChart({
  data,
  barColor = "#B9B9B6",
  height = 140,
  exerciseName,
}: TimelineChartProps) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const maxE1RM = useMemo(() => {
    if (sortedData.length === 0) return 1;
    return Math.max(...sortedData.map((d) => d.e1rm), 1);
  }, [sortedData]);

  if (sortedData.length === 0) {
    return (
      <View className="items-center justify-center py-6" style={{ height }}>
        <Text className="text-surface-500 text-sm">No data for {exerciseName}</Text>
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
        {sortedData.map((point, index) => {
          const barHeightPct = (point.e1rm / maxE1RM) * 100;
          const barH = Math.max(8, (barHeightPct / 100) * (height - 40));
          const dateLabel = point.date.substring(5); // "MM-DD"

          return (
            <View key={index} className="items-center" style={{ width: 44 }}>
              <Text className="text-surface-50 text-[10px] font-medium mb-1">
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
              <Text className="text-surface-500 text-[9px] mt-1">{dateLabel}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
