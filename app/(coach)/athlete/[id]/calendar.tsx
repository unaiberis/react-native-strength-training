import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/shared/ui/Card";
import { CalendarGrid } from "@/features/calendar/components/CalendarGrid";
import { useAthleteCalendar } from "@/features/coach/hooks/useAthleteCalendar";
import type { CalendarDay } from "@/features/calendar/hooks/useCalendar";
import { useAthleteDetail } from "@/features/coach/hooks/useAthleteDetail";

export default function CoachAthleteCalendarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { athlete } = useAthleteDetail(id);

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const { calendarMonth, isLoading, assignments } = useAthleteCalendar(
    id,
    currentYear,
    currentMonth,
  );

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
    (day: CalendarDay) => {
      // Check if this date has an existing assignment
      const existing = assignments.find(
        (a) => a.started_at.slice(0, 10) === day.date,
      );

      if (existing) {
        // Navigate to existing assignment detail
        router.push(`/(coach)/assignment/${existing.id}`);
      } else {
        // Navigate to assign flow with athleteId + date pre-filled
        const athleteName = athlete?.displayName ?? "";
        router.push(
          `/(coach)/assign?athleteId=${id}&athleteName=${encodeURIComponent(athleteName)}&date=${day.date}`,
        );
      }
    },
    [router, id, assignments, athlete],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: athlete?.displayName
            ? `${athlete.displayName}'s Calendar`
            : "Athlete Calendar",
          headerStyle: { backgroundColor: "#050505" },
          headerTintColor: "#F4F4F2",
        }}
      />
      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, backgroundColor: "#050505" }}>
        {isLoading ? (
          <View className="items-center justify-center pt-16">
            <ActivityIndicator size="large" color="#B9B9B6" />
          </View>
        ) : calendarMonth ? (
          <Card className="mb-4">
            <CalendarGrid
              calendarMonth={calendarMonth}
              selectedDate={null}
              onSelectDay={handleSelectDay}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />
          </Card>
        ) : (
          <View className="items-center justify-center pt-16">
            <Text className="text-surface-400">Could not load calendar</Text>
          </View>
        )}

        {/* Legend */}
        <View className="flex-row items-center gap-4 mb-8 px-2">
          <View className="flex-row items-center gap-1">
            <View className="w-3 h-3 rounded-full bg-titanium" />
            <Text className="text-surface-400 text-xs">Assigned</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <TouchableOpacity
              onPress={() => {
                const athleteName = athlete?.displayName ?? "";
                router.push(
                  `/(coach)/assign?athleteId=${id}&athleteName=${encodeURIComponent(athleteName)}`,
                );
              }}
              className="min-w-[44px] min-h-[44px] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Assign new program"
            >
              <Text className="text-titanium text-xs">Assign New</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </>
  );
}
