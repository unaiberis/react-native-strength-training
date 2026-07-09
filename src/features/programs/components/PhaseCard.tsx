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

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Phase card showing the real phase name, week range, and workout count
 * derived from the assigned template (D2). The nested workout list is empty
 * until SPEC-02 surfaces individual workout records, so the expanded section
 * reflects the assigned `workoutCount` rather than a hardcoded placeholder.
 */
export function PhaseCard({
  phase,
  isActive = false,
  onWorkoutPress,
}: PhaseCardProps) {
  const [expanded, setExpanded] = useState(isActive);

  return (
    <View
      className={`rounded-xl border mb-3 overflow-hidden ${
        isActive ? "bg-card border-titanium/40" : "bg-card border-border"
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
            {isActive && <View className="w-2 h-2 rounded-full bg-titanium" />}
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

      {/* Expanded detail */}
      {expanded && (
        <View className="px-4 pb-3 border-t border-border pt-2">
          <Text className="text-surface-500 text-sm italic py-2 text-center">
            {phase.workoutCount > 0
              ? `${phase.workoutCount} workout${
                  phase.workoutCount !== 1 ? "s" : ""
                } assigned`
              : "No workouts scheduled yet"}
          </Text>
        </View>
      )}
    </View>
  );
}
