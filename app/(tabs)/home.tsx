import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "@/shared/ui/Card";
import { StatCard } from "@/shared/ui/StatCard";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useHomeStats, relativeDate } from "@/features/home/hooks/useHomeStats";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const displayName =
    user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "Athlete";

  const {
    totalWorkouts,
    totalSets,
    thisWeekWorkouts,
    bestE1RM,
    recentSessions,
    isLoading,
  } = useHomeStats();

  return (
    <GradientBackground>
      <ScrollView className="flex-1 px-4 pt-16">
        {/* Greeting */}
        <Text className="text-surface-50 text-2xl font-bold mb-1">
          Welcome back, {displayName}
        </Text>
        <Text className="text-surface-400 text-base mb-6">
          Ready to train?
        </Text>

        {/* ── Quick Stats ─────────────────────────────────────────────── */}
        <Text className="text-surface-50 text-lg font-bold mb-3">
          Quick Stats
        </Text>

        <View className="flex-row flex-wrap gap-3 mb-6">
          <View className="w-[48%]">
            <StatCard
              icon="🏋️"
              value={isLoading ? "—" : totalWorkouts}
              label="Total Workouts"
            />
          </View>
          <View className="w-[48%]">
            <StatCard
              icon="💪"
              value={isLoading ? "—" : totalSets}
              label="Total Sets"
            />
          </View>
          <View className="w-[48%]">
            <StatCard
              icon="📅"
              value={isLoading ? "—" : thisWeekWorkouts}
              label="This Week"
            />
          </View>
          <View className="w-[48%]">
            <StatCard
              icon="🏆"
              value={isLoading ? "—" : bestE1RM !== null ? `${bestE1RM.toFixed(1)} kg` : "—"}
              label="Best e1RM"
            />
          </View>
        </View>

        {/* ── Quick Actions ───────────────────────────────────────────── */}
        <View className="flex-row mb-6 gap-3">
          <TouchableOpacity
            onPress={() => router.push("/exercises")}
            className="flex-1 bg-card rounded-2xl p-4 border border-border active:opacity-80"
          >
            <Text className="text-2xl mb-1">🏋️</Text>
            <Text className="text-surface-100 text-sm font-semibold">
              Exercises
            </Text>
            <Text className="text-surface-500 text-xs mt-0.5">
              Browse library
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/routines")}
            className="flex-1 bg-card rounded-2xl p-4 border border-border active:opacity-80"
          >
            <Text className="text-2xl mb-1">📋</Text>
            <Text className="text-surface-100 text-sm font-semibold">
              Routines
            </Text>
            <Text className="text-surface-500 text-xs mt-0.5">
              Create &amp; manage
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row mb-6 gap-3">
          <TouchableOpacity
            onPress={() => router.push("/history")}
            className="flex-1 bg-card rounded-2xl p-4 border border-border active:opacity-80"
          >
            <Text className="text-2xl mb-1">📊</Text>
            <Text className="text-surface-100 text-sm font-semibold">
              History
            </Text>
            <Text className="text-surface-500 text-xs mt-0.5">
              Past workouts
            </Text>
          </TouchableOpacity>

          <View className="flex-1" />
        </View>

        {/* ── Recent Activity ─────────────────────────────────────────── */}
        <Card title="Recent Activity" className="mb-8">
          {isLoading ? (
            <Text className="text-surface-400">Loading...</Text>
          ) : recentSessions.length === 0 ? (
            <Text className="text-surface-400">
              Complete a workout to see your recent activity.
            </Text>
          ) : (
            <View className="gap-3">
              {recentSessions.map((session) => (
                <View
                  key={session.id}
                  className="flex-row items-center justify-between py-2 border-b border-surface-800 last:border-b-0"
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
                    <Text className="text-surface-300 text-sm">
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
      </ScrollView>
    </GradientBackground>
  );
}
