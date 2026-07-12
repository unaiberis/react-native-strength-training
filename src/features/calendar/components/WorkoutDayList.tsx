/**
 * WorkoutDayList — list of workout summaries for a selected date.
 *
 * Renders a FlatList of WorkoutDayItem when sessions exist,
 * or an EmptyState with a "Start a Workout" CTA when empty.
 */

import { View, Text } from "react-native";
import { EmptyState } from "@/shared/ui/EmptyState";
import { WorkoutDayItem } from "./WorkoutDayItem";
import type { WorkoutSummary } from "../hooks/useSessionsForDate";

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Format a YYYY-MM-DD date string as "Wednesday, July 8".
 */
function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── Props ──────────────────────────────────────────────────────────────

interface WorkoutDayListProps {
  sessions: WorkoutSummary[];
  date: string;
  onStartWorkout: () => void;
  onViewDetail: (id: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────

/**
 * List of workout summaries for a selected date.
 *
 * When sessions exist, renders a formatted date header above a list of
 * workout cards. When empty, shows an empty state with a CTA to start
 * an unscheduled workout.
 */
function WorkoutDayList({
  sessions,
  date,
  onStartWorkout,
  onViewDetail,
}: WorkoutDayListProps) {
  // Empty state
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="Rest day — No workout scheduled"
        subtitle="Rest days are part of the plan. Stay ready."
        action={{
          label: "Start a Workout",
          onPress: onStartWorkout,
          variant: "secondary",
        }}
      />
    );
  }

  return (
    <View>
      <Text className="text-surface-400 text-xs font-semibold mb-3 ml-1">
        {formatDisplayDate(date)}
      </Text>
      {sessions.map((session) => (
        <View key={session.id} className="mb-3">
          <WorkoutDayItem
            workout={session}
            onPress={() => onViewDetail(session.id)}
          />
        </View>
      ))}
    </View>
  );
}

export { WorkoutDayList };
export default WorkoutDayList;
