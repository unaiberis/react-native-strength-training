import { useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { CalendarDay, CalendarMonth } from "../hooks/useCalendar";

// ─── Constants ──────────────────────────────────────────────────────────

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Props ──────────────────────────────────────────────────────────────

interface CalendarGridProps {
  calendarMonth: CalendarMonth;
  selectedDate: string | null;
  onSelectDay: (day: CalendarDay) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

// ─── Day Cell ───────────────────────────────────────────────────────────

function DayCell({
  day,
  isSelected,
  onPress,
}: {
  day: CalendarDay;
  isSelected: boolean;
  onPress: () => void;
}) {
  const hasWorkouts = day.workoutCount > 0;

  const cellClasses = useMemo(() => {
    const base = "flex-1 items-center justify-center py-1.5 rounded-xl";
    if (!day.isCurrentMonth) return `${base} opacity-30`;
    if (isSelected) return `${base} bg-surface-800`;
    if (day.isToday) return `${base} bg-card-soft`;
    return base;
  }, [day.isCurrentMonth, day.isToday, isSelected]);

  const textClasses = useMemo(() => {
    if (day.isToday) return "text-surface-50 text-sm font-bold";
    return "text-surface-50 text-sm";
  }, [day.isToday]);

  return (
    <TouchableOpacity
      onPress={onPress}
      className={cellClasses}
      activeOpacity={0.6}
    >
      <Text className={textClasses}>{day.day}</Text>
      {hasWorkouts && (
        <View className="flex-row gap-0.5 mt-0.5">
          {Array.from({ length: Math.min(day.workoutCount, 3) }).map((_, i) => (
            <View
              key={i}
              className="w-1 h-1 rounded-full bg-surface-300"
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Month Header ───────────────────────────────────────────────────────

function MonthHeader({
  year,
  month,
  onPrev,
  onNext,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <View className="flex-row items-center justify-between mb-4">
      <TouchableOpacity
        onPress={onPrev}
        className="w-10 h-10 items-center justify-center rounded-lg active:opacity-60"
      >
        <Text className="text-surface-400 text-lg">‹</Text>
      </TouchableOpacity>

      <Text className="text-surface-50 text-base font-bold">
        {monthNames[month]} {year}
      </Text>

      <TouchableOpacity
        onPress={onNext}
        className="w-10 h-10 items-center justify-center rounded-lg active:opacity-60"
      >
        <Text className="text-surface-400 text-lg">›</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

/**
 * Calendar month grid component.
 *
 * Renders a 7-column grid (Sun–Sat) with day numbers and dots for workout days.
 * Supports month navigation via prev/next arrows.
 */
export function CalendarGrid({
  calendarMonth,
  selectedDate,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: CalendarGridProps) {
  const weeks = useMemo(() => {
    const result: CalendarDay[][] = [];
    for (let i = 0; i < calendarMonth.days.length; i += 7) {
      result.push(calendarMonth.days.slice(i, i + 7));
    }
    return result;
  }, [calendarMonth.days]);

  const handleSelectDay = useCallback(
    (day: CalendarDay) => {
      if (day.isCurrentMonth) {
        onSelectDay(day);
      }
    },
    [onSelectDay],
  );

  return (
    <View>
      {/* Month navigation */}
      <MonthHeader
        year={calendarMonth.year}
        month={calendarMonth.month}
        onPrev={onPrevMonth}
        onNext={onNextMonth}
      />

      {/* Day headers */}
      <View className="flex-row mb-2">
        {DAY_HEADERS.map((header) => (
          <View key={header} className="flex-1 items-center">
            <Text className="text-surface-500 text-xs font-semibold">
              {header}
            </Text>
          </View>
        ))}
      </View>

      {/* Week rows */}
      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row mb-1">
          {week.map((day) => (
            <DayCell
              key={day.date}
              day={day}
              isSelected={selectedDate === day.date}
              onPress={() => handleSelectDay(day)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
