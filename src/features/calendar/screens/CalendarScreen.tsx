import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { Card } from "@/shared/ui/Card";
import { CalendarGrid } from "../components/CalendarGrid";
import {
  useCalendar,
  fetchSessionsForDate,
  buildCalendarMonth,
  type CalendarDay,
  type CalendarWorkoutSummary,
} from "../hooks/useCalendar";
import { useAuthStore } from "@/stores/auth-store";

// ─── Helpers ────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDisplayDate(year: number, month: number, day: number): string {
  const date = new Date(year, month, day);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── Day Detail Panel ───────────────────────────────────────────────────

function DayDetailPanel({
  dateStr,
  summaries,
  isLoading,
  onViewWorkout,
}: {
  dateStr: string;
  summaries: CalendarWorkoutSummary[];
  isLoading: boolean;
  onViewWorkout: (sessionId: string) => void;
}) {
  if (isLoading) {
    return (
      <Card className="mt-4">
        <View className="items-center py-4">
          <ActivityIndicator size="small" color="#A4A4A8" />
          <Text className="text-[#A4A4A8] text-sm mt-2">Loading workouts...</Text>
        </View>
      </Card>
    );
  }

  if (summaries.length === 0) {
    return (
      <Card className="mt-4">
        <View className="items-center py-4">
          <Text className="text-[#707074] text-base">No workouts</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <Text className="text-[#F4F4F2] text-base font-bold mb-3">
        Workouts
      </Text>
      {summaries.map((summary) => (
        <TouchableOpacity
          key={summary.id}
          onPress={() => onViewWorkout(summary.id)}
          className="flex-row items-center justify-between py-2.5 border-b border-[#343437] last:border-b-0 active:opacity-60"
        >
          <View className="flex-1 mr-3">
            <Text className="text-[#F4F4F2] text-sm font-semibold">
              {summary.templateName ?? "Free Workout"}
            </Text>
            <Text className="text-[#A4A4A8] text-xs mt-0.5">
              {formatTime(summary.startedAt)}
              {summary.exerciseCount > 0 && (
                <> · {summary.exerciseCount} exercise{summary.exerciseCount !== 1 ? "s" : ""}</>
              )}
            </Text>
          </View>
          <Text className="text-[#707074] text-xs">›</Text>
        </TouchableOpacity>
      ))}
    </Card>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────

/**
 * Calendar screen — shows a month grid with workout-day dots and
 * a detail panel for the selected day.
 *
 * Tab icon navigation (no Lingui imports to keep consistent with simple screens).
 */
export function CalendarScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySummaries, setDaySummaries] = useState<CalendarWorkoutSummary[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const hasScrolledRef = useRef(false);

  const { calendarMonth, isLoading, error, refetch } = useCalendar(
    currentYear,
    currentMonth,
  );

  // Auto-scroll to today on first load
  useEffect(() => {
    if (calendarMonth && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      setSelectedDate(todayStr);
    }
  }, [calendarMonth, today]);

  // Fetch day detail when selected date changes
  useEffect(() => {
    if (!selectedDate || !userId) return;

    setIsLoadingDetail(true);
    fetchSessionsForDate(userId, selectedDate)
      .then(setDaySummaries)
      .catch(() => setDaySummaries([]))
      .finally(() => setIsLoadingDetail(false));
  }, [selectedDate, userId]);

  const handlePrevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
    setDaySummaries([]);
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
    setDaySummaries([]);
  }, [currentMonth]);

  const handleSelectDay = useCallback((day: CalendarDay) => {
    setSelectedDate(day.date);
  }, []);

  const handleViewWorkout = useCallback(
    (sessionId: string) => {
      router.push(`/history/${sessionId}`);
    },
    [router],
  );

  return (
    <GradientBackground>
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 pt-16"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text className="text-[#F4F4F2] text-2xl font-bold mb-6">
          Calendar
        </Text>

        {/* Calendar grid */}
        {isLoading && (
          <View className="items-center py-8">
            <ActivityIndicator size="small" color="#B9B9B6" />
          </View>
        )}

        {error && (
          <View className="items-center py-8">
            <Text className="text-[#D65F5F] text-sm mb-3">
              Could not load calendar
            </Text>
            <TouchableOpacity onPress={() => refetch()} className="active:opacity-60">
              <Text className="text-[#A4A4A8] text-sm underline">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {calendarMonth && !error && (
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

        {/* Selected day detail */}
        {selectedDate && (
          <DayDetailPanel
            dateStr={selectedDate}
            summaries={daySummaries}
            isLoading={isLoadingDetail}
            onViewWorkout={handleViewWorkout}
          />
        )}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </GradientBackground>
  );
}
