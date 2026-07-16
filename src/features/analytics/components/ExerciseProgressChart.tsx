import { useMemo } from "react";
import { View, Text, Dimensions } from "react-native";
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryTheme,
  VictoryScatter,
} from "victory-native";

// ─── Types ────────────────────────────────────────────────────────────────

interface ProgressDataPoint {
  date: string;
  value: number;
}

interface ExerciseProgressChartProps {
  data: ProgressDataPoint[];
  /** Height of the chart (default: 220) */
  height?: number;
  /** Label for the Y axis */
  yLabel?: string;
  /** Color for the line */
  lineColor?: string;
}

// ─── Component ────────────────────────────────────────────────────────────

/**
 * ExerciseProgressChart — A line chart showing weight/e1RM progression
 * over time for a specific exercise, using victory-native.
 *
 * Dark theme styling with animated line entry.
 *
 * ```tsx
 * <ExerciseProgressChart
 *   data={[{ date: "2026-07-01", value: 100 }, ...]}
 *   yLabel="Weight (kg)"
 * />
 * ```
 */
export function ExerciseProgressChart({
  data,
  height = 220,
  yLabel,
  lineColor = "#B9B9B6",
}: ExerciseProgressChartProps) {
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 64;

  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    return [...data]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: formatDateLabel(d.date),
        value: d.value,
      }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <View
        className="items-center justify-center"
        style={{ height }}
        accessibilityRole="image"
        accessibilityLabel="Progress chart with no data"
      >
        <Text className="text-surface-500 text-sm">No data yet</Text>
      </View>
    );
  }

  const maxVal = Math.max(...chartData.map((d) => d.value), 1);
  const minVal = Math.min(...chartData.map((d) => d.value), 0);

  return (
    <View
      style={{ height, width: "100%" }}
      accessibilityRole="image"
      accessibilityLabel={`Progress chart with ${chartData.length} data points. ${yLabel ?? ""}`}
    >
      <VictoryChart
        theme={VictoryTheme.material as any}
        domainPadding={{ x: 20, y: [minVal * 0.9, maxVal * 1.1] }}
        height={height}
        width={chartWidth}
        padding={{ top: 10, bottom: 30, left: 8, right: 8 }}
      >
        <VictoryAxis
          style={{
            axis: { stroke: "#343437", strokeWidth: 1 },
            ticks: { stroke: "#343437", size: 4 },
            tickLabels: {
              fill: "#707074",
              fontSize: 9,
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
          tickFormat={(t: number) => String(Math.round(t))}
          tickCount={4}
        />
        <VictoryLine
          data={chartData}
          x="date"
          y="value"
          style={{
            data: {
              stroke: lineColor,
              strokeWidth: 2,
            },
          }}
          animate={{
            onLoad: { duration: 800 },
          }}
        />
        <VictoryScatter
          data={chartData}
          x="date"
          y="value"
          size={4}
          style={{
            data: {
              fill: lineColor,
            },
          }}
        />
      </VictoryChart>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDateLabel(date: string): string {
  // "2026-07-01" → "Jul 01"
  if (date.length >= 10) {
    return date.substring(5); // "07-01"
  }
  return date;
}
