import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "../../../shared/ui/Badge";
import type { ProgramPhaseSummary } from "../hooks/usePrograms";

// ─── Types ─────────────────────────────────────────────────────────────────

interface PhaseCardProps {
  phase: ProgramPhaseSummary;
  isActive?: boolean;
  onWorkoutPress?: (workoutId: string) => void;
}

interface PhaseWorkout {
  id: string;
  name: string;
  dayOfWeek: string;
  exerciseCount: number;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Phase card showing phase name, week range, workout count,
 * and an expandable list of workouts.
 */
export function PhaseCard({
  phase,
  isActive = false,
  onWorkoutPress,
}: PhaseCardProps) {
  const [expanded, setExpanded] = useState(isActive);

  // Placeholder workouts — replaced when backend returns real data
  const workouts: PhaseWorkout[] = [];

  return (
    <View
      className={`rounded-xl border mb-3 overflow-hidden ${
        isActive
          ? "bg-card border-titanium/40"
          : "bg-card border-border"
      }`}
    >
      {/* Header — tappable to expand/collapse */}
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        className="p-4 flex-row items-center justify-between"
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${phase.name}, Weeks ${phase.weekStart}-${phase.weekEnd}, ${phase.workoutCount} workouts`}
        accessibilityState={{ expanded }}
      >
        <View className="flex-1 mr-3">
          {/* Phase name + active indicator */}
          <View className="flex-row items-center gap-2 mb-1">
            {isActive && (
              <View className="w-2 h-2 rounded-full bg-titanium" />
            )}
            <Text className="text-surface-50 text-base font-bold">
              {phase.name}
            </Text>
          </View>

          {/* Week range */}
          <Text className="text-surface-400 text-xs">
            Weeks {phase.weekStart}–{phase.weekEnd}
          </Text>
        </View>

        {/* Workout count badge + expand icon */}
        <View className="flex-row items-center gap-2">
          <Badge
            label={`${phase.workoutCount} workout${phase.workoutCount !== 1 ? "s" : ""}`}
            variant="default"
          />
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#707074"
          />
        </View>
      </TouchableOpacity>

      {/* Expanded workout list */}
      {expanded && (
        <View className="px-4 pb-3 border-t border-border pt-2">
          {workouts.length === 0 ? (
            <Text className="text-surface-500 text-sm italic py-2 text-center">
              Workouts will appear here once the program is assigned.
            </Text>
          ) : (
            workouts.map((workout) => (
              <TouchableOpacity
                key={workout.id}
                onPress={() => onWorkoutPress?.(workout.id)}
                className="flex-row items-center py-3 border-b border-border/50 last:border-b-0"
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${workout.name}, ${workout.dayOfWeek}, ${workout.exerciseCount} exercises`}
              >
                <View className="w-8 h-8 rounded-full bg-graphite items-center justify-center mr-3">
                  <Ionicons name="barbell-outline" size={14} color="#B9B9B6" />
                </View>
                <View className="flex-1">
                  <Text className="text-surface-100 text-sm font-semibold">
                    {workout.name}
                  </Text>
                  <Text className="text-surface-400 text-xs">
                    {workout.dayOfWeek} · {workout.exerciseCount} exercises
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#707074" />
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}
