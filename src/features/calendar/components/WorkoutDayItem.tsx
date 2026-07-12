/**
 * WorkoutDayItem — a single workout card for the day detail list.
 *
 * Shows icon, template name, status badge, duration, and exercise count.
 * Wrapped in React.memo for performance.
 */

import { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { WorkoutSummary } from "../hooks/useSessionsForDate";

// ─── Props ──────────────────────────────────────────────────────────────

interface WorkoutDayItemProps {
  workout: WorkoutSummary;
  onPress: () => void;
}

// ─── Status config ──────────────────────────────────────────────────────

const STATUS_CONFIG = {
  assigned: {
    label: "Assigned",
    icon: "calendar-outline" as const,
    badgeClass: "border border-titanium",
    badgeTextClass: "text-titanium",
  },
  active: {
    label: "In Progress",
    icon: "barbell-outline" as const,
    badgeClass: "bg-titanium",
    badgeTextClass: "text-black",
  },
  completed: {
    label: "Completed",
    icon: "checkmark-circle" as const,
    badgeClass: "bg-sacred",
    badgeTextClass: "text-black",
  },
} as const;

// ─── Component ──────────────────────────────────────────────────────────

function WorkoutDayItemInner({ workout, onPress }: WorkoutDayItemProps) {
  const statusCfg = STATUS_CONFIG[workout.status];

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-card border border-border rounded-xl p-4 active:opacity-80 flex-row items-center gap-3"
      accessibilityRole="button"
      accessibilityLabel={`${workout.templateName ?? "Free Workout"}, ${statusCfg.label}`}
    >
      {/* Icon */}
      <View className="w-10 h-10 rounded-full bg-graphite items-center justify-center">
        <Ionicons name={statusCfg.icon} size={20} color="#B9B9B6" />
      </View>

      {/* Name + Status */}
      <View className="flex-1">
        <Text className="text-surface-50 text-base font-bold" numberOfLines={1}>
          {workout.templateName ?? "Free Workout"}
        </Text>
        <View
          className={`self-start mt-1.5 px-2 py-0.5 rounded-full ${statusCfg.badgeClass}`}
        >
          <Text className={`text-xs font-semibold ${statusCfg.badgeTextClass}`}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Duration + Exercise count */}
      <View className="items-end gap-1">
        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={12} color="#A4A4A8" />
          <Text className="text-surface-400 text-xs">
            {workout.durationMinutes != null
              ? `${workout.durationMinutes} min`
              : "—"}
          </Text>
        </View>
        <Text className="text-surface-500 text-xs">
          {workout.exerciseCount} exercise
          {workout.exerciseCount !== 1 ? "s" : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Workout day item — memoized card for a single workout summary.
 */
const WorkoutDayItem = memo(WorkoutDayItemInner);

export { WorkoutDayItem };
export default WorkoutDayItem;
