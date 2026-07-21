/**
 * DayDetail — shows workout summary or empty state for a selected date.
 *
 * If the day has a workout in progress: shows the workout card with name,
 * block count, and estimated time.
 * If completed: shows summary card.
 * If empty: shows an EmptyState encouraging rest.
 */

import { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/EmptyState";
import type { ProgramSummary } from "@/features/athlete-assignments/hooks/program-types";

// ─── Types ──────────────────────────────────────────────────────────────

export interface WorkoutSummary {
  id: string;
  name: string | null;
  blockCount: number;
  estimatedMinutes: number | null;
  completed: boolean;
}

interface DayDetailProps {
  date: string;
  workout: WorkoutSummary | null;
  onStartWorkout: () => void;
  onViewDetail: () => void;
  pastPrograms?: ProgramSummary[];
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── Workout Card ───────────────────────────────────────────────────────

const WorkoutCard = memo(function WorkoutCard({
  workout,
  onStartWorkout,
  onViewDetail,
}: {
  workout: WorkoutSummary;
  onStartWorkout: () => void;
  onViewDetail: () => void;
}) {
  return (
    <Card className="mt-4">
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-3">
        <View className="w-10 h-10 rounded-full bg-graphite items-center justify-center">
          <Ionicons
            name={workout.completed ? "checkmark-circle" : "barbell"}
            size={20}
            color={workout.completed ? "#D7D7D2" : "#B9B9B6"}
          />
        </View>
        <View className="flex-1">
          <Text className="text-surface-50 text-base font-bold">
            {workout.name ?? t`Free Workout`}
          </Text>
          <Text className="text-surface-500 text-xs mt-0.5">
            {workout.completed ? t`Completed` : t`In Progress`}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View className="flex-row gap-4 mb-4">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="layers-outline" size={14} color="#A4A4A8" />
          <Text className="text-surface-400 text-xs">
            {workout.blockCount === 1
              ? t`${workout.blockCount} block`
              : t`${workout.blockCount} blocks`}
          </Text>
        </View>
        {workout.estimatedMinutes != null && (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="time-outline" size={14} color="#A4A4A8" />
            <Text className="text-surface-400 text-xs">
              ~{workout.estimatedMinutes} min
            </Text>
          </View>
        )}
      </View>

      {/* Action button */}
      <TouchableOpacity
        onPress={workout.completed ? onViewDetail : onStartWorkout}
        className="bg-graphite rounded-xl py-3 items-center active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={
          workout.completed ? "View workout details" : "Continue workout"
        }
      >
        <Text className="text-surface-50 text-sm font-bold">
          {workout.completed ? t`View Details` : t`Start Workout`}
        </Text>
      </TouchableOpacity>
    </Card>
  );
});

// ─── Summary Card (completed) ───────────────────────────────────────────

const CompletedSummary = memo(function CompletedSummary({
  volume,
  prCount,
}: {
  volume?: number;
  prCount?: number;
}) {
  return (
    <View className="flex-row gap-3 mt-2">
      {volume != null && (
        <View className="flex-1 bg-cardSoft border border-border rounded-xl p-3 items-center">
          <Text className="text-surface-400 text-xs font-semibold uppercase tracking-wide">
            {t`Volume`}
          </Text>
          <Text className="text-surface-50 text-lg font-bold mt-1">
            {volume.toLocaleString()} kg
          </Text>
        </View>
      )}
      {prCount != null && prCount > 0 && (
        <View className="flex-1 bg-cardSoft border border-border rounded-xl p-3 items-center">
          <Text className="text-surface-400 text-xs font-semibold uppercase tracking-wide">
            {t`PRs`}
          </Text>
          <Text className="text-sacred text-lg font-bold mt-1">
            +{prCount}
          </Text>
        </View>
      )}
    </View>
  );
});

// ─── Main Component ─────────────────────────────────────────────────────

/**
 * Day detail panel for the selected calendar date.
 *
 * Displays the workout summary card if a workout exists, or an
 * empty state encouraging rest if the day is free.
 * Also shows past program assignments (completed/cancelled) for the selected date.
 */
function DayDetail({ date, workout, onStartWorkout, onViewDetail, pastPrograms }: DayDetailProps) {
  const pastProgramsForDate = (pastPrograms ?? []).filter(
    (p) => p.startDate === date,
  );

  return (
    <View className="mt-2">
      <Text className="text-surface-400 text-xs font-semibold mb-1 ml-1">
        {formatDisplayDate(date)}
      </Text>

      {workout ? (
        <WorkoutCard
          workout={workout}
          onStartWorkout={onStartWorkout}
          onViewDetail={onViewDetail}
        />
      ) : (
        <EmptyState
          icon="calendar-outline"
          title={t`No Workout Scheduled`}
          subtitle={t`Rest days are part of the plan. Stay ready.`}
          action={{
            label: t`Start a Workout`,
            onPress: onStartWorkout,
            variant: "secondary",
          }}
          className="mt-4"
        />
      )}

      {/* Past assignments */}
      {pastProgramsForDate.length > 0 && (
        <View className="mt-4">
          <Text className="text-surface-500 text-xs font-semibold uppercase tracking-wide mb-2">
            <Trans>Past Assignments</Trans>
          </Text>
          {pastProgramsForDate.map((p) => (
            <View
              key={p.id}
              className="bg-card border border-border rounded-2xl p-3 mb-2"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-surface-50 text-sm font-semibold flex-1">
                  {p.name}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded-full ml-2 ${
                    p.status === "completed"
                      ? "bg-blue-900/40"
                      : "bg-red-900/40"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-medium ${
                      p.status === "completed"
                        ? "text-blue-400"
                        : "text-red-400"
                    }`}
                  >
                    {p.status}
                  </Text>
                </View>
              </View>
              <Text className="text-surface-500 text-xs mt-1">
                {p.startDate} — {p.endDate}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export { DayDetail, WorkoutCard, CompletedSummary };
export default DayDetail;
