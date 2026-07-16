import { useMemo } from "react";
import { View, Text, Dimensions } from "react-native";
import {
  VictoryChart,
  VictoryBar,
  VictoryAxis,
  VictoryTheme,
} from "victory-native";

// ─── Types ────────────────────────────────────────────────────────────────

interface VolumeChartDataPoint {
  period: string;
  volume: number;
}

interface VolumeChartProps {
  data: VolumeChartDataPoint[];
  /** Height of the chart (default: 200) */
  height?: number;
}

// ─── Component ────────────────────────────────────────────────────────────

/**
 * VolumeChart — A bar chart for weekly/monthly volume tracking using victory-native.
 *
 * Dark theme styling with titanium accents, animated entry.
 *
 * ```tsx
 * <VolumeChart data={[{ period: "2026-W01", volume: 4500 }, ...]} />
 * ```
 */
export function VolumeChart({ data, height = 200 }: VolumeChartProps) {
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 64; // 32px padding each side (px-4 * 2 + card padding)

  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    // Show last 12 data points max for readability
    return data.slice(-12).map((d) => ({
      period: formatPeriodLabel(d.period),
      volume: d.volume,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <View
        className="items-center justify-center py-8"
        style={{ height }}
        accessibilityRole="image"
        accessibilityLabel="Volume chart with no data"
      >
        <Text className="text-surface-500 text-sm">No data yet</Text>
      </View>
    );
  }

  const maxVolume = Math.max(...chartData.map((d) => d.volume), 1);

  return (
    <View
      style={{ height, width: "100%" }}
      accessibilityRole="image"
      accessibilityLabel={`Volume chart with ${chartData.length} data points`}
    >
      <VictoryChart
        theme={VictoryTheme.material as any}
        domainPadding={{ x: 20, y: [0, maxVolume * 1.15] }}
        height={height}
        width={chartWidth}
        padding={{ top: 10, bottom: 30, left: 4, right: 4 }}
      >
        <VictoryAxis
          style={{
            axis: { stroke: "#343437", strokeWidth: 1 },
            ticks: { stroke: "#343437", size: 4 },
            tickLabels: {
              fill: "#707074",
              fontSize: 10,
              fontFamily: "System",
              padding: 4,
            },
            grid: { stroke: "transparent" },
          }}
          tickFormat={(t: string) => t}
          fixLabelOverlap
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: "transparent" },
            ticks: { stroke: "transparent" },
            tickLabels: {
              fill: "#707074",
              fontSize: 9,
              fontFamily: "System",
              padding: 2,
            },
            grid: { stroke: "#222225", strokeWidth: 1 },
          }}
          tickFormat={(t: number) => formatVolumeValue(t)}
          tickCount={4}
        />
        <VictoryBar
          data={chartData}
          x="period"
          y="volume"
          barWidth={chartData.length > 8 ? 20 : 28}
          cornerRadius={{ top: 4, bottom: 0 }}
          style={{
            data: {
              fill: "#B9B9B6",
              opacity: ({ datum }: any) =>
                Math.max(0.4, datum.volume / maxVolume),
            },
          }}
          animate={{
            onLoad: { duration: 600 },
          }}
          labels={({ datum }: any) => formatVolumeValue(datum.volume)}
        />
      </VictoryChart>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatPeriodLabel(period: string): string {
  if (period.includes("-W")) {
    const weekNum = period.split("-W")[1];
    return weekNum ? `W${weekNum}` : period;
  }
  const months: Record<string, string> = {
    "01": "Jan",
    "02": "Feb",
    "03": "Mar",
    "04": "Apr",
    "05": "May",
    "06": "Jun",
    "07": "Jul",
    "08": "Aug",
    "09": "Sep",
    "10": "Oct",
    "11": "Nov",
    "12": "Dec",
  };
  const monthNum = period.split("-")[1];
  return months[monthNum] ?? period;
}

function formatVolumeValue(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}
