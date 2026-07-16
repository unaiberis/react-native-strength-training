import { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────

export interface LineChartDataPoint {
  /** ISO date string (YYYY-MM-DD) or label */
  date: string;
  /** Numeric value for the Y axis */
  value: number;
}

interface LineChartProps {
  data: LineChartDataPoint[];
  /** Optional fixed max Y value (auto-computed if not set) */
  maxValue?: number;
  /** Optional fixed min Y value (auto-computed if not set) */
  minValue?: number;
  /** Color for the line and dots */
  lineColor?: string;
  /** Color for the trend line (if shown) */
  trendColor?: string;
  /** Whether to show trend line (simple moving average) */
  showTrend?: boolean;
  /** Window size for the moving average trend line */
  trendWindow?: number;
  /** Height of the chart container */
  height?: number;
  /** Label for the Y axis */
  yLabel?: string;
  /** Number of Y axis tick marks */
  yTicks?: number;
}

// ─── Simple Moving Average ─────────────────────────────────────────────────

function computeSMA(data: number[], window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null;
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      sum += data[j];
    }
    return sum / window;
  });
}

// ─── Line Chart ────────────────────────────────────────────────────────────

/**
 * A View-based line chart for time-series data.
 *
 * Renders dots at each data point connected by thin rotated View segments.
 * Supports an optional trend line (simple moving average).
 * No external charting library or SVG needed.
 */
export function LineChart({
  data,
  maxValue: externalMax,
  minValue: externalMin,
  lineColor = "#B9B9B6",
  trendColor = "#D7D7D2",
  showTrend = false,
  trendWindow = 3,
  height = 180,
  yLabel,
  yTicks = 4,
}: LineChartProps) {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => a.date.localeCompare(b.date)),
    [data],
  );

  const { minVal, maxVal, range } = useMemo(() => {
    if (sortedData.length === 0) return { minVal: 0, maxVal: 1, range: 1 };
    const vals = sortedData.map((d) => d.value);
    const mn = externalMin ?? Math.min(...vals);
    const mx = externalMax ?? Math.max(...vals);
    const r = mx - mn || 1;
    return { minVal: mn, maxVal: mx, range: r };
  }, [sortedData, externalMin, externalMax]);

  const trendLine = useMemo(() => {
    if (!showTrend || sortedData.length < trendWindow) return [];
    const values = sortedData.map((d) => d.value);
    const sma = computeSMA(values, trendWindow);
    return sortedData.map((d, i) => ({
      date: d.date,
      value: sma[i],
    }));
  }, [sortedData, showTrend, trendWindow]);

  const yLabels = useMemo(() => {
    const labels: number[] = [];
    for (let i = 0; i <= yTicks; i++) {
      labels.push(minVal + (range * i) / yTicks);
    }
    return labels;
  }, [minVal, maxVal, range, yTicks]);

  const chartAreaHeight = height - 40; // leave room for X axis labels

  function getY(value: number): number {
    return chartAreaHeight - ((value - minVal) / range) * chartAreaHeight;
  }

  if (sortedData.length === 0) {
    return (
      <View
        className="items-center justify-center"
        style={{ height }}
        accessibilityRole="image"
        accessibilityLabel="Line chart with no data"
      >
        <Text className="text-surface-500 text-sm">No data yet</Text>
      </View>
    );
  }

  const dotDiameter = 8;
  const segmentHeight = 2;

  return (
    <View
      style={{ height }}
      accessibilityRole="image"
      accessibilityLabel={`Line chart with ${sortedData.length} data points. ${yLabel ?? ""}`}
    >
      {yLabel && (
        <Text className="text-surface-500 text-[10px] mb-1">{yLabel}</Text>
      )}
      <View className="flex-row flex-1">
        {/* Y axis labels */}
        <View className="w-10 justify-between pr-1" style={{ height: chartAreaHeight }}>
          {yLabels.map((val, i) => (
            <Text
              key={i}
              className="text-surface-500 text-[9px] text-right leading-none"
              style={{ lineHeight: 10 }}
            >
              {Math.round(val)}
            </Text>
          ))}
        </View>

        {/* Chart area */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1"
        >
          <View style={{ height: chartAreaHeight + 16, minWidth: 100 }}>
            {/* Grid lines */}
            {yLabels.map((val, i) => (
              <View
                key={i}
                className="absolute left-0 right-0 border-t border-surface-800"
                style={{ top: getY(val) }}
              />
            ))}

            {/* Line segments */}
            {sortedData.length > 1 && (
              <View className="absolute inset-0">
                {sortedData.slice(0, -1).map((point, i) => {
                  const next = sortedData[i + 1];
                  const x1 = i * 60 + 30;
                  const x2 = (i + 1) * 60 + 30;
                  const y1 = getY(point.value) + dotDiameter / 2;
                  const y2 = getY(next.value) + dotDiameter / 2;

                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                  if (length < 1) return null;

                  return (
                    <View
                      key={`line-${i}`}
                      className="absolute"
                      style={{
                        left: x1,
                        top: y1,
                        width: length,
                        height: segmentHeight,
                        backgroundColor: lineColor,
                        borderRadius: 1,
                        opacity: 0.7,
                        transform: [{ rotate: `${angle}deg` }],
                        transformOrigin: "left center",
                      }}
                    />
                  );
                })}
              </View>
            )}

            {/* Trend line segments */}
            {trendLine.length > 1 && (
              <View className="absolute inset-0">
                {trendLine.slice(0, -1).map((point, i) => {
                  const next = trendLine[i + 1];
                  if (point.value === null || next.value === null) return null;

                  const x1 = i * 60 + 30;
                  const x2 = (i + 1) * 60 + 30;
                  const y1 = getY(point.value) + dotDiameter / 2;
                  const y2 = getY(next.value) + dotDiameter / 2;

                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                  if (length < 1) return null;

                  return (
                    <View
                      key={`trend-${i}`}
                      className="absolute"
                      style={{
                        left: x1,
                        top: y1,
                        width: length,
                        height: segmentHeight,
                        backgroundColor: trendColor,
                        borderRadius: 1,
                        opacity: 0.5,
                        borderStyle: "dashed",
                        transform: [{ rotate: `${angle}deg` }],
                        transformOrigin: "left center",
                      }}
                    />
                  );
                })}
              </View>
            )}

            {/* Dots + X axis labels */}
            <View className="absolute inset-0 flex-row" style={{ paddingTop: dotDiameter / 2 }}>
              {sortedData.map((point, i) => {
                const x = i * 60 + 30 - dotDiameter / 2;
                const y = getY(point.value);

                // Extract YYYY-MM-DD first (handles both "2026-06-09" and
                // "2026-06-09 00:00:00.000Z" from PocketBase), then show MM-DD
                const datePart = point.date.substring(0, 10);
                const dateLabel = datePart.length === 10
                  ? datePart.substring(5) // "MM-DD"
                  : point.date;

                return (
                  <View
                    key={`point-${i}`}
                    className="absolute items-center"
                    style={{
                      left: i * 60,
                      width: 60,
                      top: 0,
                      height: chartAreaHeight + 16,
                    }}
                  >
                    {/* Dot */}
                    <View
                      className="rounded-full"
                      style={{
                        width: dotDiameter,
                        height: dotDiameter,
                        backgroundColor: lineColor,
                        position: "absolute",
                        top: y,
                        left: 26,
                      }}
                      accessibilityRole="image"
                      accessibilityLabel={`${dateLabel}: ${Math.round(point.value)}`}
                    />
                    {/* X axis label */}
                    <Text
                      className="text-surface-500 text-[8px] absolute text-center"
                      style={{ top: chartAreaHeight + 4, left: 0, right: 0 }}
                      numberOfLines={1}
                    >
                      {dateLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
