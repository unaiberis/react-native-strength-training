import { useMemo } from "react";
import { View, Text } from "react-native";
import Svg, { Rect } from "react-native-svg";

// ─── Types ─────────────────────────────────────────────────────────────────

interface HeatmapDataPoint {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Number of workouts on that day */
  count: number;
}

interface ConsistencyHeatmapProps {
  /** Array of { date, count } data points */
  data: HeatmapDataPoint[];
  /** Number of weeks to display (default: 12) */
  weeks?: number;
  /** Gap between cells in pixels (default: 3) */
  gap?: number;
  /** Cell size in pixels (default: 12) */
  cellSize?: number;
}

// ─── Colors ────────────────────────────────────────────────────────────────

const EMPTY_COLOR = "#222225";
const COLOR_STEPS = ["#343437", "#525258", "#707074", "#A4A4A8", "#B9B9B6"];

function getColor(count: number, maxCount: number): string {
  if (count === 0) return EMPTY_COLOR;
  if (maxCount === 0) return COLOR_STEPS[0];
  const ratio = count / maxCount;
  const index = Math.min(
    Math.floor(ratio * COLOR_STEPS.length),
    COLOR_STEPS.length - 1,
  );
  return COLOR_STEPS[index];
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * ConsistencyHeatmap — A GitHub-style contribution graph showing workout
 * consistency over time. Uses react-native-svg for rendering.
 *
 * Shows a grid of 7 rows (days, Sun–Sat) × N columns (weeks).
 * Color intensity represents workout count per day.
 *
 * ```tsx
 * <ConsistencyHeatmap
 *   data={[
 *     { date: "2026-07-01", count: 1 },
 *     { date: "2026-07-02", count: 2 },
 *   ]}
 *   weeks={12}
 * />
 * ```
 */
export function ConsistencyHeatmap({
  data,
  weeks = 12,
  gap = 3,
  cellSize = 12,
}: ConsistencyHeatmapProps) {
  // Build a map from date string to count
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    let maxCount = 0;
    for (const point of data) {
      const count = Math.max(0, point.count);
      map.set(point.date, count);
      if (count > maxCount) maxCount = count;
    }
    return { map, maxCount };
  }, [data]);

  // Generate grid cells: 7 rows (Sun=0..Sat=6) × weeks columns
  const grid = useMemo(() => {
    const cells: Array<{
      x: number;
      y: number;
      fill: string;
      date: string;
      count: number;
    }> = [];

    const today = new Date();
    // Start from the most recent Sunday
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - today.getDay()); // last Sunday

    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(endDate);
        date.setDate(endDate.getDate() - (weeks - 1 - w) * 7 + d);
        const dateStr = date.toISOString().split("T")[0];
        const count = countMap.map.get(dateStr) ?? 0;
        cells.push({
          x: w * (cellSize + gap),
          y: d * (cellSize + gap),
          fill: getColor(count, countMap.maxCount),
          date: dateStr,
          count,
        });
      }
    }

    return cells;
  }, [weeks, cellSize, gap, countMap]);

  const svgWidth = weeks * (cellSize + gap) - gap;
  const svgHeight = 7 * (cellSize + gap) - gap;

  return (
    <View
      className="bg-card rounded-2xl p-4 border border-border"
      accessibilityRole="image"
      accessibilityLabel={`Consistency heatmap showing ${data.length} days of workout data over ${weeks} weeks`}
    >
      {/* Month labels */}
      <View className="flex-row mb-2" style={{ paddingLeft: 0 }}>
        {generateMonthLabels(weeks).map((label, i) => (
          <Text
            key={i}
            className="text-surface-500 text-[10px] font-medium"
            style={{
              position: "absolute",
              left: label.weekIndex * (cellSize + gap),
            }}
          >
            {label.month}
          </Text>
        ))}
      </View>

      {/* Day labels + grid */}
      <View className="flex-row">
        {/* Day of week labels */}
        <View className="mr-1 justify-between" style={{ height: svgHeight }}>
          {["M", "W", "F"].map((day, i) => {
            // Mon=0, Wed=2, Fri=4 (row indices)
            const rowIndex = [0, 2, 4][i];
            return (
              <Text
                key={day}
                className="text-surface-500 text-[10px] font-medium"
                style={{
                  position: "absolute",
                  top: rowIndex * (cellSize + gap) + cellSize / 2 - 5,
                  left: 0,
                }}
              >
                {day}
              </Text>
            );
          })}
        </View>

        {/* SVG grid */}
        <Svg width={svgWidth} height={svgHeight}>
          {grid.map((cell) => (
            <Rect
              key={cell.date}
              x={cell.x}
              y={cell.y}
              width={cellSize}
              height={cellSize}
              rx={2}
              ry={2}
              fill={cell.fill}
            />
          ))}
        </Svg>
      </View>

      {/* Legend */}
      <View className="flex-row items-center gap-1 mt-2 justify-end">
        <Text className="text-surface-500 text-[10px] mr-1">Less</Text>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            className="rounded-sm"
            style={{
              width: cellSize - 2,
              height: cellSize - 2,
              backgroundColor: COLOR_STEPS[Math.min(i, COLOR_STEPS.length - 1)],
            }}
          />
        ))}
        <Text className="text-surface-500 text-[10px] ml-1">More</Text>
      </View>
    </View>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface MonthLabel {
  month: string;
  weekIndex: number;
}

function generateMonthLabels(weeks: number): MonthLabel[] {
  const labels: MonthLabel[] = [];
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() - today.getDay());

  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - (weeks - 1 - w) * 7);
    const month = date.getMonth();
    if (month !== lastMonth) {
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      labels.push({ month: months[month], weekIndex: w });
      lastMonth = month;
    }
  }
  return labels;
}
