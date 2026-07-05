import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "../../src/shared/ui/Card";
import { Button } from "../../src/shared/ui/Button";
import { GradientBackground } from "../../src/shared/ui/GradientBackground";

export default function ProgramsScreen() {
  const router = useRouter();

  return (
    <GradientBackground>
    <ScrollView className="flex-1 px-4 pt-16">
      <Text className="text-surface-50 text-2xl font-bold mb-6">Programs</Text>

      {/* Routines */}
      <Card className="mb-4">
        <Text className="text-surface-100 text-lg font-semibold mb-2">
          Workout Routines
        </Text>
        <Text className="text-surface-400 mb-4">
          Create and manage your workout templates with exercises, sets, reps,
          and rest intervals.
        </Text>
        <View className="flex-row gap-3">
          <Button
            title="View Routines"
            variant="secondary"
            className="flex-1"
            onPress={() => router.push("/routines")}
          />
          <Button
            title="Create New"
            variant="primary"
            className="flex-1"
            onPress={() => router.push("/routines/new")}
          />
        </View>
      </Card>

      <TouchableOpacity
        onPress={() => router.push("/routines")}
        className="bg-surface-900 rounded-xl p-4 mb-3 border border-surface-800 active:opacity-80"
      >
        <Text className="text-surface-100 text-base font-semibold mb-1">
          Your Routines
        </Text>
        <Text className="text-surface-400 text-sm">
          Browse, edit, or delete your saved workout templates.
        </Text>
      </TouchableOpacity>

      <Card title="Programs (Coming Soon)" className="mb-4">
        <Text className="text-surface-400">
          Structured training programs with weekly blocks and periodization will
          be available in a future update.
        </Text>
      </Card>
    </ScrollView>
    </GradientBackground>
  );
}
