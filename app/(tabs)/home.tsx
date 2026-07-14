import { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card } from "@/shared/ui/Card";
import { StatCard } from "@/shared/ui/StatCard";
import { ScreenLayout } from "@/shared/ui/ScreenLayout";
import { SkeletonCard } from "@/shared/ui/SkeletonLoader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useHomeStats, relativeDate } from "@/features/home/hooks/useHomeStats";
import { WeekCalendarSection } from "@/features/calendar/components/WeekCalendarSection";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const displayName =
    user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "Athlete";

  const {
    totalWorkouts,
    totalSets,
    thisWeekWorkouts,
    recentSessions,
    isLoading,
    refetch,
    isRefetching,
  } = useHomeStats();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <ScreenLayout
      title={`Welcome back, ${displayName}`}
      subtitle="Ready to train?"
      onRefresh={onRefresh}
      refreshing={isRefetching}
    >
      {/* ── Week Calendar ───────────────────────────────────────────── */}
      <WeekCalendarSection />

      {/* ── Quick Stats ─────────────────────────────────────────────── */}
      <Text className="text-surface-50 text-xl font-extrabold tracking-[-0.5] mb-3">
        Quick Stats
      </Text>

      {/* Row 1: 3 stat cards */}
      <View className="flex-row mb-3" style={{ gap: 12 }}>
        {isLoading ? (
          <>
            <View className="flex-1">
              <SkeletonCard lines={2} />
            </View>
            <View className="flex-1">
              <SkeletonCard lines={2} />
            </View>
            <View className="flex-1">
              <SkeletonCard lines={2} />
            </View>
          </>
        ) : (
          <>
            <View className="flex-1">
              <StatCard icon="fitness-outline" value={totalWorkouts} label="Workouts" />
            </View>
            <View className="flex-1">
              <StatCard icon="barbell-outline" value={totalSets} label="Sets" />
            </View>
            <View className="flex-1">
              <StatCard icon="calendar-outline" value={thisWeekWorkouts} label="This Week" />
            </View>
          </>
        )}
      </View>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <View className="flex-row mb-6" style={{ gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.push("/history")}
          className="flex-1 bg-card rounded-2xl p-4 border border-border shadow-button active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="View workout history"
        >
          <View className="mb-1">
            <Ionicons name="bar-chart-outline" size={24} color="#B9B9B6" />
          </View>
          <Text className="text-surface-50 text-sm font-semibold">
            History
          </Text>
          <Text className="text-surface-500 text-xs mt-0.5">
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Recent Activity ─────────────────────────────────────────── */}
      <Card title="Recent Activity" className="mb-8">
        {isLoading ? (
          <View>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                className="flex-row items-center justify-between py-3 border-b border-border"
              >
                <View className="flex-1 mr-3">
                  <View className="w-48 h-4 rounded bg-graphite mb-2" />
                  <View className="w-24 h-3 rounded bg-graphite" />
                </View>
                <View className="items-end">
                  <View className="w-12 h-4 rounded bg-graphite mb-1" />
                  <View className="w-16 h-3 rounded bg-graphite" />
                </View>
              </View>
            ))}
          </View>
        ) : recentSessions.length === 0 ? (
          <Text className="text-surface-400">
            Complete a workout to see your recent activity.
          </Text>
        ) : (
          <View className="gap-3">
            {recentSessions.map((session) => (
              <View
                key={session.id}
                className="flex-row items-center justify-between py-2 border-b border-border last:border-b-0"
              >
                <View className="flex-1 mr-3">
                  <Text className="text-surface-50 text-sm font-semibold">
                    {session.templateName}
                  </Text>
                  <Text className="text-surface-400 text-xs mt-0.5">
                    {relativeDate(session.startedAt)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-surface-100 text-sm">
                    {session.durationMinutes != null
                      ? `${session.durationMinutes} min`
                      : "—"}
                  </Text>
                  <Text className="text-surface-500 text-xs">
                    {session.exerciseCount} exercise
                    {session.exerciseCount !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScreenLayout>
  );
}
