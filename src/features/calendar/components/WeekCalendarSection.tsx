/**
 * WeekCalendarSection — self-contained weekly calendar section for the Home tab.
 *
 * Composes the WeekStrip component with useWeekCalendar hook for week
 * navigation and useSessionsForDate for the selected day's workout list.
 *
 * States: loading (skeleton placeholders), error (inline retry), empty,
 * and populated.
 */

import { useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useWeekCalendar } from "../hooks/useWeekCalendar";
import { useSessionsForDate } from "../hooks/useSessionsForDate";
import { WeekStrip } from "./WeekStrip";
import { WorkoutDayList } from "./WorkoutDayList";
import { SkeletonBar } from "@/shared/ui/SkeletonLoader";

// ─── Skeleton Placeholder ───────────────────────────────────────────────

/**
 * Skeleton shown while week data is loading.
 */
function CalendarSkeleton() {
  return (
    <View className="bg-card border border-border rounded-xl px-3 py-4 mb-4">
      {/* Week label skeleton */}
      <View className="items-center mb-3">
        <SkeletonBar width="40%" height={14} />
      </View>
      {/* Day cells skeleton */}
      <View className="flex-row justify-between">
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={i} className="items-center flex-1">
            <SkeletonBar width={16} height={12} className="mb-2" />
            <SkeletonBar width={36} height={36} className="rounded-full mb-1" />
            <SkeletonBar width={6} height={6} className="rounded-full" />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Component ──────────────────────────────────────────────────────────

/**
 * Weekly calendar section for the Home tab.
 *
 * No props — hooks are self-contained. Renders navigation controls,
 * a week strip, and the selected day's workout list.
 */
function WeekCalendarSection() {
  const router = useRouter();
  const {
    weekDays,
    selectedDate,
    weekLabel,
    selectDate,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    isLoading: weekLoading,
  } = useWeekCalendar();

  const {
    sessions,
    isLoading: sessionsLoading,
    refetch,
  } = useSessionsForDate(selectedDate);

  const handleStartWorkout = useCallback(() => {
    router.push("/(tabs)/train");
  }, [router]);

  const handleViewDetail = useCallback(
    (sessionId: string) => {
      // Find the session to determine navigation target
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      if (session.status === "assigned") {
        router.push("/(tabs)/train");
      } else if (session.status === "active") {
        router.push(`/(workout)/active`);
      } else {
        router.push(`/(tabs)/history/${sessionId}`);
      }
    },
    [router, sessions],
  );

  // Loading state: show skeleton while week data loads
  if (weekLoading) {
    return (
      <View className="mb-6">
        <CalendarSkeleton />
      </View>
    );
  }

  return (
    <View className="mb-6">
      {/* Week navigation + strip */}
      <WeekStrip
        weekDays={weekDays}
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        weekLabel={weekLabel}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
      />

      {/* Today button */}
      <View className="flex-row justify-end mt-2 mb-3">
        <TouchableOpacity
          onPress={goToToday}
          className="px-3 py-1.5 active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Go to today"
        >
          <Text className="text-titanium text-sm font-semibold">Today</Text>
        </TouchableOpacity>
      </View>

      {/* Day detail — sessions for selected date */}
      {sessionsLoading && sessions.length === 0 ? (
        <View className="bg-card border border-border rounded-xl px-4 py-5">
          <SkeletonBar width="60%" height={16} className="mb-3" />
          <SkeletonBar width="100%" height={14} className="mb-2" />
          <SkeletonBar width="80%" height={14} className="mb-2" />
          <SkeletonBar width="45%" height={14} />
        </View>
      ) : (
        <WorkoutDayList
          sessions={sessions}
          date={selectedDate}
          onStartWorkout={handleStartWorkout}
          onViewDetail={handleViewDetail}
        />
      )}
    </View>
  );
}

export { WeekCalendarSection };
export default WeekCalendarSection;
