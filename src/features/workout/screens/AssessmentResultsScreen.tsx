import { useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { t } from "@lingui/core/macro";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import {
  useAssessmentComparison,
  type Trend,
  type MetricValue,
} from "@/features/wellness/hooks/useAssessmentComparison";

// ─── Constants ─────────────────────────────────────────────────────────────

interface MetricConfig {
  key: keyof MetricValue;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  maxValue: number; // 10 for RPE, 5 for others
  color: string;
}

const METRICS: MetricConfig[] = [
  { key: "sessionRpe", label: t`Session RPE`, icon: "flame-outline", maxValue: 10, color: "#FF6B35" },
  { key: "sleep", label: t`Sleep Quality`, icon: "moon-outline", maxValue: 5, color: "#6366F1" },
  { key: "fatigue", label: t`Fatigue`, icon: "battery-half-outline", maxValue: 5, color: "#F59E0B" },
  { key: "soreness", label: t`Soreness`, icon: "bandage-outline", maxValue: 5, color: "#10B981" },
  { key: "mood", label: t`Mood`, icon: "happy-outline", maxValue: 5, color: "#8B5CF6" },
];

// ─── Gauge Dots ────────────────────────────────────────────────────────────

function GaugeDots({
  value,
  maxValue,
}: {
  value: number | null;
  maxValue: number;
}) {
  const filled = value != null ? Math.round(value) : 0;

  return (
    <View className="flex-row gap-1.5">
      {Array.from({ length: maxValue }, (_, i) => (
        <View
          key={i}
          className={`w-3 h-3 rounded-full ${
            i < filled ? "bg-titanium" : "bg-graphite"
          }`}
        />
      ))}
    </View>
  );
}

// ─── Trend Icon ────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "same") {
    return <Text className="text-surface-500 text-sm font-bold">—</Text>;
  }

  const isUp = trend === "up";
  return (
    <Ionicons
      name={isUp ? "arrow-up" : "arrow-down"}
      size={16}
      color={isUp ? "#D7D7D2" : "#D65F5F"}
    />
  );
}

// ─── Format Helper ─────────────────────────────────────────────────────────

function formatAvg(value: number | null): string {
  if (value == null) return "—";
  return value.toFixed(1);
}

// ─── Metric Card ───────────────────────────────────────────────────────────

function MetricCard({
  config,
  current,
  weekAverage,
  trend,
}: {
  config: MetricConfig;
  current: MetricValue;
  weekAverage: MetricValue;
  trend: Trend;
}) {
  const currVal = current[config.key];
  const avgVal = weekAverage[config.key];

  return (
    <Card className="mb-3">
      {/* Header row */}
      <View className="flex-row items-center gap-3 mb-3">
        <View
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Ionicons name={config.icon} size={18} color={config.color} />
        </View>
        <Text className="text-surface-50 text-sm font-semibold flex-1">
          {config.label}
        </Text>
      </View>

      {/* Gauge + value */}
      <View className="flex-row items-center justify-between mb-3">
        <GaugeDots value={currVal} maxValue={config.maxValue} />
        <Text className="text-surface-50 text-lg font-bold ml-3">
          {currVal != null ? `${currVal}/${config.maxValue}` : "—"}
        </Text>
      </View>

      {/* Divider */}
      <View className="h-px bg-border mb-3" />

      {/* Average + trend */}
      <View className="flex-row items-center gap-2">
        <Text className="text-surface-400 text-xs">{t`Avg: ${formatAvg(avgVal)}`}</Text>
        <TrendIcon trend={trend} />
      </View>
    </Card>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────

/**
 * Assessment Results Screen
 *
 * Shows a summary of the user's post-workout self-assessment with:
 * - Current values for each metric (RPE, sleep, fatigue, soreness, mood)
 * - Visual gauge dots
 * - 7-day rolling average comparison
 * - Trend arrows (up/down/same)
 *
 * Two actions: "View Full Wellness Dashboard" and "Done".
 */
export function AssessmentResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const wellnessEntryId = params.id ?? null;

  const { comparison, isLoading } = useAssessmentComparison(wellnessEntryId);

  const handleGoWellness = useCallback(() => {
    router.replace("/(tabs)/wellness");
  }, [router]);

  const handleDone = useCallback(() => {
    router.replace("/(tabs)");
  }, [router]);

  // ── Loading state ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#B9B9B6" />
          <Text className="text-surface-400 text-sm mt-4">
            {t`Loading assessment...`}
          </Text>
        </View>
      </GradientBackground>
    );
  }

  // ── Empty / no data state ──────────────────────────────────────────────

  if (!comparison) {
    return (
      <GradientBackground>
        <View className="flex-1 px-4">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingTop: 80, paddingBottom: 32 }}
          >
            <ScreenTitle
              title={t`Assessment`}
              subtitle={t`Your self-assessment summary`}
            />
            <Card className="mt-6">
              <Text className="text-surface-400 text-center py-8">
                {t`No assessment data found.`}{'\n'}
                {t`Complete a workout and self-assessment to see results here.`}
              </Text>
            </Card>
            <View className="w-full gap-3 mt-6">
              <Button
                title={t`Go Home`}
                variant="primary"
                onPress={handleDone}
              />
            </View>
          </ScrollView>
        </View>
      </GradientBackground>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────

  return (
    <GradientBackground>
      <View className="flex-1 px-4">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 80, paddingBottom: 32 }}
        >
          {/* Header */}
          <ScreenTitle
            title={t`Assessment`}
            subtitle={t`Today's self-assessment vs your 7-day average`}
          />

          {/* Metrics */}
          <View className="mt-6">
            {METRICS.map((metric) => (
              <MetricCard
                key={metric.key}
                config={metric}
                current={comparison.current}
                weekAverage={comparison.weekAverage}
                trend={comparison.trends[metric.key]}
              />
            ))}
          </View>

          {/* Legend */}
          <View className="flex-row items-center gap-4 mb-6">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-titanium" />
              <Text className="text-surface-500 text-xs">{t`Current`}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="arrow-up" size={12} color="#D7D7D2" />
              <Text className="text-surface-500 text-xs">{t`Above avg`}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="arrow-down" size={12} color="#D65F5F" />
              <Text className="text-surface-500 text-xs">{t`Below avg`}</Text>
            </View>
          </View>

          {/* Actions */}
          <View className="w-full gap-3">
            <Button
              title={t`View Full Wellness Dashboard`}
              variant="secondary"
              icon="analytics-outline"
              onPress={handleGoWellness}
            />
            <Button
              title={t`Done`}
              variant="primary"
              icon="checkmark-outline"
              onPress={handleDone}
            />
          </View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}
