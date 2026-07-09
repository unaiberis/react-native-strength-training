/**
 * WeekStrip — horizontal row of 7 days (Mon–Sun) with workout indicators.
 *
 * Each day cell shows the day abbreviation, date number, and a dot below
 * when a workout is scheduled (titanium) or completed (sacred).
 * Supports prev/next week navigation via arrow buttons.
 */

import { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { WeekDay } from "../hooks/useWeekCalendar";

// ─── Props ──────────────────────────────────────────────────────────────

interface WeekStripProps {
  weekDays: WeekDay[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  weekLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

// ─── Day Cell ───────────────────────────────────────────────────────────

const DayCell = memo(function DayCell({
  day,
  isSelected,
  onPress,
}: {
  day: WeekDay;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 items-center py-1 active:opacity-60"
      accessibilityRole="button"
      accessibilityLabel={`${day.dayName} ${day.dayNumber}${day.isToday ? ", today" : ""}`}
    >
      {/* Day abbreviation */}
      <Text
        className={`text-xs font-semibold mb-1 ${
          isSelected ? "text-black" : "text-surface-500"
        }`}
      >
        {day.dayName}
      </Text>

      {/* Day number circle */}
      <View
        className={`w-9 h-9 items-center justify-center rounded-full ${
          isSelected
            ? "bg-titanium"
            : day.isToday
              ? "bg-cardSoft border border-border"
              : ""
        }`}
      >
        <Text
          className={`text-base font-bold ${
            isSelected ? "text-black" : "text-surface-50"
          }`}
        >
          {day.dayNumber}
        </Text>
      </View>

      {/* Workout indicator dot */}
      <View className="h-2 mt-0.5 items-center justify-center">
        {day.hasCompletedWorkout && (
          <View className="w-1.5 h-1.5 rounded-full bg-sacred" />
        )}
        {day.hasWorkout && !day.hasCompletedWorkout && (
          <View className="w-1.5 h-1.5 rounded-full bg-titanium" />
        )}
      </View>
    </TouchableOpacity>
  );
});

// ─── Main Component ─────────────────────────────────────────────────────

/**
 * Week strip component.
 *
 * Renders 7 day cells (Mon–Sun) in a horizontal row with week label
 * above and navigation arrows.
 */
function WeekStrip({
  weekDays,
  selectedDate,
  onSelectDate,
  weekLabel,
  onPrevWeek,
  onNextWeek,
}: WeekStripProps) {
  return (
    <View className="bg-card border border-border rounded-xl px-3 py-4">
      {/* Week label + navigation */}
      <View className="flex-row items-center justify-between mb-3 px-1">
        <TouchableOpacity
          onPress={onPrevWeek}
          className="w-8 h-8 items-center justify-center rounded-lg active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Previous week"
        >
          <Text className="text-surface-400 text-xl leading-none">‹</Text>
        </TouchableOpacity>

        <Text className="text-surface-400 text-xs font-semibold tracking-wide">
          {weekLabel}
        </Text>

        <TouchableOpacity
          onPress={onNextWeek}
          className="w-8 h-8 items-center justify-center rounded-lg active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Next week"
        >
          <Text className="text-surface-400 text-xl leading-none">›</Text>
        </TouchableOpacity>
      </View>

      {/* Days row */}
      <View className="flex-row">
        {weekDays.map((day) => (
          <DayCell
            key={day.date}
            day={day}
            isSelected={day.date === selectedDate}
            onPress={() => onSelectDate(day.date)}
          />
        ))}
      </View>
    </View>
  );
}

export { WeekStrip };
export default WeekStrip;
