/**
 * Calendar screen — week-first view with optional month grid.
 *
 * Default layout shows a WeekStrip (Mon–Sun) and a DayDetail panel
 * for the selected date. Users can toggle to a traditional month grid.
 * Pull-to-refresh reloads both week and month data.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { SkeletonCard } from "@/shared/ui/SkeletonLoader";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { KickerLabel } from "@/shared/ui/KickerLabel";
import { WeekStrip } from "../components/WeekStrip";
import { DayDetail, type WorkoutSummary } from "../components/DayDetail";
import { CalendarGrid } from "../components/CalendarGrid";
import {
  useWeekCalendar,
  type WeekDay,
} from "../hooks/useWeekCalendar";
import {
  useCalendar,
  fetchSessionsForDate,
  type CalendarWorkoutSummary,
} from "../hooks/useCalendar";
import { useAuthStore } from "@/stores/auth-store";
import {
  useAthleteAssignments,
  findAssignedOnDate,
  todayStr,
} from "@/features/athlete-assignments/hooks/useAthleteAssignments";

// ─── Types ──────────────────────────────────────────────────────────────

type ViewMode = "week" | "month";

// ─── Helpers ────────────────────────────────────────────────────────────

function mapToWorkoutSummary(
  raw: CalendarWorkoutSummary,
): WorkoutSummary {
  return {
    id: raw.id,
    name: raw.templateName,
    blockCount: raw.exerciseCount,
    estimatedMinutes: raw.durationMinutes,
    completed: true, // Calendar only shows completed sessions
  };
}

// ─── Main Screen ────────────────────────────────────────────────────────

/**
 * Calendar screen — shows a week strip (default) or month grid with
 * workout indicators and a detail panel for the selected day.
 */
export function CalendarScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const scrollRef = useRef<ScrollView>(null);

  // View mode toggle — month by default (CoachAthletic-style)
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  // Week calendar hook
  const {
    weekDays,
    selectedDate,
    weekLabel,
    selectDate,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    isLoading: isWeekLoading,
  } = useWeekCalendar();

  // Month calendar hook (existing)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const { calendarMonth, isLoading: isMonthLoading, error, refetch: refetchMonth } = useCalendar(
    currentYear,
    currentMonth,
  );

  // Day detail data
  const [dayWorkout, setDayWorkout] = useState<CalendarWorkoutSummary | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch day detail when selected date changes
  useEffect(() => {
    if (!selectedDate || !userId) return;

    setIsLoadingDetail(true);
    fetchSessionsForDate(userId, selectedDate)
      .then((summaries) => {
        if (summaries.length > 0) {
          // Use the first session
          setDayWorkout(summaries[0]);
        } else {
          setDayWorkout(null);
        }
      })
      .catch(() => setDayWorkout(null))
      .finally(() => setIsLoadingDetail(false));
  }, [selectedDate, userId]);

  // Month navigation
  const handlePrevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const handleSelectDay = useCallback(
    (day: { date: string }) => {
      selectDate(day.date);
    },
    [selectDate],
  );

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Re-fetch both week and month data
      if (userId && selectedDate) {
        const summaries = await fetchSessionsForDate(userId, selectedDate);
        setDayWorkout(summaries[0] ?? null);
      }
    } catch {
      // Silently fail — user can pull again
    } finally {
      setRefreshing(false);
    }
  }, [userId, selectedDate]);

  // Navigation handlers
  const handleStartWorkout = useCallback(() => {
    router.push("/(tabs)/train");
  }, [router]);

  const handleViewDetail = useCallback(() => {
    if (dayWorkout) {
      router.push(`/history/${dayWorkout.id}`);
    }
  }, [router, dayWorkout]);

  // Assigned-today indicator (R5): surface a chip when an assignment start_date
  // matches today or the selected calendar day, deep-linking to its detail.
  const { currentProgram, upcomingPrograms, pastPrograms } = useAthleteAssignments();
  const todayStrVal = todayStr();
  const matchDate = selectedDate ?? todayStrVal;
  const assignedChip =
    findAssignedOnDate([currentProgram, ...upcomingPrograms], matchDate) ??
    findAssignedOnDate([currentProgram, ...upcomingPrograms], todayStrVal);

  // Determine loading state
  const isLoading = viewMode === "week" ? isWeekLoading : isMonthLoading;

  return (
    <ErrorBoundary>
      <GradientBackground>
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 pt-16"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#A4A4A8"
            />
          }
        >
          {/* Header */}
          <ScreenTitle title="Calendar" className="mb-6" />

          {/* View mode toggle */}
          <View className="flex-row bg-card border border-border rounded-xl p-1 mb-4 self-start">
            <TouchableOpacity
              onPress={() => setViewMode("week")}
              className={`px-4 py-2 rounded-lg ${
                viewMode === "week" ? "bg-titanium" : ""
              }`}
              accessibilityRole="button"
              accessibilityLabel="Week view"
            >
              <Text
                className={`text-xs font-bold ${
                  viewMode === "week" ? "text-black" : "text-surface-400"
                }`}
              >
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode("month")}
              className={`px-4 py-2 rounded-lg ${
                viewMode === "month" ? "bg-titanium" : ""
              }`}
              accessibilityRole="button"
              accessibilityLabel="Month view"
            >
              <Text
                className={`text-xs font-bold ${
                  viewMode === "month" ? "text-black" : "text-surface-400"
                }`}
              >
                Month
              </Text>
            </TouchableOpacity>
          </View>

          {/* Assigned-today chip (R5) */}
          {assignedChip && (
            <TouchableOpacity
              onPress={() =>
                router.push("/(tabs)/train")
              }
              className="flex-row items-center gap-2 bg-cardSoft rounded-full px-4 py-2 mb-4 border border-border self-start"
              accessibilityRole="button"
              accessibilityLabel="Entrenamiento asignado hoy"
            >
              <Ionicons name="calendar-outline" size={16} color="#B9B9B6" />
              <Text className="text-surface-100 text-sm font-semibold">
                Entrenamiento asignado hoy
              </Text>
            </TouchableOpacity>
          )}

          {/* Loading state */}
          {isLoading && (
            <View>
              <SkeletonCard lines={2} className="mb-4" />
              <SkeletonCard lines={4} />
            </View>
          )}

          {!isLoading && (
            <>
              {/* Week view */}
              {viewMode === "week" && (
                <View>
                  <KickerLabel className="mb-2">YOUR WEEK</KickerLabel>
                  <WeekStrip
                    weekDays={weekDays}
                    selectedDate={selectedDate}
                    onSelectDate={selectDate}
                    weekLabel={weekLabel}
                    onPrevWeek={goToPrevWeek}
                    onNextWeek={goToNextWeek}
                  />
                </View>
              )}

              {/* Month view */}
              {viewMode === "month" && calendarMonth && !error && (
                <Card className="mb-2">
                  <CalendarGrid
                    calendarMonth={calendarMonth}
                    selectedDate={selectedDate}
                    onSelectDay={handleSelectDay}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                  />
                </Card>
              )}

              {/* Month error */}
              {viewMode === "month" && error && (
                <View className="items-center py-8">
                  <Text className="text-danger text-sm mb-3">
                    Could not load calendar
                  </Text>
                  <TouchableOpacity
                    onPress={() => refetchMonth()}
                    className="active:opacity-60"
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading calendar"
                  >
                    <Text className="text-surface-400 text-sm underline">
                      Retry
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Day detail */}
              {isLoadingDetail ? (
                <View className="mt-4">
                  <SkeletonCard lines={3} />
                </View>
              ) : (
                <DayDetail
                  date={selectedDate}
                  workout={dayWorkout ? mapToWorkoutSummary(dayWorkout) : null}
                  onStartWorkout={handleStartWorkout}
                  onViewDetail={handleViewDetail}
                  pastPrograms={pastPrograms}
                />
              )}
            </>
          )}

          {/* Bottom spacing */}
          <View className="h-8" />
        </ScrollView>
      </GradientBackground>
    </ErrorBoundary>
  );
}
