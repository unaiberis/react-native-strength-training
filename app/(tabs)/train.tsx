import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card } from "../../src/shared/ui/Card";
import { Button } from "../../src/shared/ui/Button";
import { ErrorBoundary } from "../../src/shared/ui/ErrorBoundary";
import { SkeletonCard } from "../../src/shared/ui/SkeletonLoader";
import { useTemplates } from "../../src/features/routines/hooks/useTemplates";
import { GradientBackground } from "../../src/shared/ui/GradientBackground";

export default function TrainScreen() {
  const router = useRouter();
  const { data: templates, isLoading } = useTemplates();

  const handleBlankWorkout = useCallback(() => {
    router.push("/(workout)/active?mode=blank");
  }, [router]);

  const handleStartRoutine = useCallback(
    (templateId: string) => {
      router.push({
        pathname: "/(workout)/active",
        params: { mode: "routine", templateId },
      });
    },
    [router],
  );

  return (
    <ErrorBoundary>
      <GradientBackground>
        <ScrollView className="flex-1 px-4 pt-16">
          <Text className="text-surface-50 text-[34px] font-black tracking-[-0.8] mb-6">Train</Text>

          {/* Start workout */}
          <Card className="mb-4">
            <Text className="text-surface-100 text-lg font-semibold mb-2">
              Start Workout
            </Text>
            <Text className="text-surface-400 mb-4">
              Choose a routine or start a blank workout.
            </Text>
            <View className="flex-row gap-3">
              <Button
                title="Blank Workout"
                variant="secondary"
                className="flex-1"
                onPress={handleBlankWorkout}
              />
              <Button
                title="Browse Exercises"
                variant="primary"
                className="flex-1"
                onPress={() => router.push("/exercises")}
              />
            </View>
          </Card>

          {/* Quick links */}
          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              onPress={() => router.push("/routines")}
              className="flex-1 bg-surface-900 rounded-2xl p-4 border border-surface-800 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="View and manage routines"
            >
              <View className="mb-1">
                <Ionicons name="clipboard-outline" size={24} color="#B9B9B6" />
              </View>
              <Text className="text-surface-100 text-sm font-semibold">
                My Routines
              </Text>
              <Text className="text-surface-500 text-xs mt-0.5">
                View and manage
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/routines/new")}
              className="flex-1 bg-surface-900 rounded-2xl p-4 border border-surface-800 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Create a new routine template"
            >
              <View className="mb-1">
                <Ionicons name="add-outline" size={24} color="#B9B9B6" />
              </View>
              <Text className="text-surface-100 text-sm font-semibold">
                New Routine
              </Text>
              <Text className="text-surface-500 text-xs mt-0.5">
                Create template
              </Text>
            </TouchableOpacity>
          </View>

          {/* Routines list */}
          <Text className="text-surface-50 text-xl font-extrabold tracking-[-0.5] mb-3">
            Start from Routine
          </Text>

          {isLoading && (
            <View>
              <SkeletonCard lines={2} className="mb-3" />
              <SkeletonCard lines={2} className="mb-3" />
              <SkeletonCard lines={1} lastLineWidth="40%" />
            </View>
          )}

          {!isLoading && (!templates || templates.length === 0) && (
            <Card className="mb-4">
              <Text className="text-surface-400 text-center py-4">
                Create a routine first to start a guided workout.
              </Text>
            </Card>
          )}

          {templates?.map((template) => (
            <TouchableOpacity
              key={template.id}
              onPress={() => handleStartRoutine(template.id)}
              className="bg-surface-900 rounded-xl p-4 mb-3 border border-surface-800 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel={`Start routine: ${template.name}`}
            >
              <Text className="text-surface-100 text-base font-semibold mb-1">
                {template.name}
              </Text>
              {template.description && (
                <Text className="text-surface-400 text-sm mb-1" numberOfLines={1}>
                  {template.description}
                </Text>
              )}
              <Text className="text-surface-500 text-xs">
                {template.exercises.length} exercise
                {template.exercises.length !== 1 ? "s" : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </GradientBackground>
    </ErrorBoundary>
  );
}
