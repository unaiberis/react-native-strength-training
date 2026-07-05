import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "../../src/shared/ui/Card";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { GradientBackground } from "../../src/shared/ui/GradientBackground";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const displayName =
    user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "Athlete";

  return (
    <GradientBackground>
    <ScrollView className="flex-1 px-4 pt-16">
      <Text className="text-surface-50 text-2xl font-bold mb-2">
        Welcome back, {displayName}
      </Text>
      <Text className="text-surface-400 text-base mb-6">
        Ready to train?
      </Text>

      {/* Quick actions */}
      <View className="flex-row mb-6 gap-3">
        <TouchableOpacity
          onPress={() => router.push("/exercises")}
          className="flex-1 bg-surface-900 rounded-2xl p-4 border border-surface-800 active:opacity-80"
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
          className="flex-1 bg-surface-900 rounded-2xl p-4 border border-surface-800 active:opacity-80"
        >
          <Text className="text-2xl mb-1">📋</Text>
          <Text className="text-surface-100 text-sm font-semibold">
            Routines
          </Text>
          <Text className="text-surface-500 text-xs mt-0.5">
            Create & manage
          </Text>
        </TouchableOpacity>
      </View>

      {/* Second row */}
      <View className="flex-row mb-6 gap-3">
        <TouchableOpacity
          onPress={() => router.push("/history")}
          className="flex-1 bg-surface-900 rounded-2xl p-4 border border-surface-800 active:opacity-80"
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

      <Card title="Quick Stats" className="mb-4">
        <Text className="text-surface-400">
          Complete a workout to see your stats here.
        </Text>
      </Card>

      <Card title="Recent Activity" className="mb-4">
        <Text className="text-surface-400">
          Your recent workouts will appear here.
        </Text>
      </Card>
    </ScrollView>
    </GradientBackground>
  );
}
