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
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/EmptyState";

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
            {workout.name ?? "Free Workout"}
          </Text>
          <Text className="text-surface-500 text-xs mt-0.5">
            {workout.completed ? "Completed" : "In Progress"}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View className="flex-row gap-4 mb-4">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="layers-outline" size={14} color="#A4A4A8" />
          <Text className="text-surface-400 text-xs">
            {workout.blockCount} block{workout.blockCount !== 1 ? "s" : ""}
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
          {workout.completed ? "View Details" : "Start Workout"}
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
            Volume
          </Text>
          <Text className="text-surface-50 text-lg font-bold mt-1">
            {volume.toLocaleString()} kg
          </Text>
        </View>
      )}
      {prCount != null && prCount > 0 && (
        <View className="flex-1 bg-cardSoft border border-border rounded-xl p-3 items-center">
          <Text className="text-surface-400 text-xs font-semibold uppercase tracking-wide">
            PRs
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
 */
function DayDetail({ date, workout, onStartWorkout, onViewDetail }: DayDetailProps) {
  if (!workout) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="No Workout Scheduled"
        subtitle="Rest days are part of the plan. Stay ready."
        action={{
          label: "Start a Workout",
          onPress: onStartWorkout,
          variant: "secondary",
        }}
        className="mt-4"
      />
    );
  }

  return (
    <View className="mt-2">
      <Text className="text-surface-400 text-xs font-semibold mb-1 ml-1">
        {formatDisplayDate(date)}
      </Text>
      <WorkoutCard
        workout={workout}
        onStartWorkout={onStartWorkout}
        onViewDetail={onViewDetail}
      />
    </View>
  );
}

export { DayDetail, WorkoutCard, CompletedSummary };
export default DayDetail;
