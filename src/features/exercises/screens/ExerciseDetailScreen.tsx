import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Card } from "@/shared/ui/Card";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { VideoPlayer } from "@/shared/ui/VideoPlayer";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { SkeletonCard } from "@/shared/ui/SkeletonLoader";
import { useExercise } from "../hooks/useExercises";

export function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: exercise, isLoading, error } = useExercise(id);

  if (isLoading) {
    return (
      <GradientBackground>
        <View className="flex-1 px-4 pt-16">
          <SkeletonCard lines={4} />
        </View>
      </GradientBackground>
    );
  }

  if (error || !exercise) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center px-4">
        <Text className="text-surface-400 text-base">
          {error ? (error as Error).message : "Exercise not found"}
        </Text>
      </View>
      </GradientBackground>
    );
  }

  const detailRows = [
    { label: "Category", value: exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1) },
    { label: "Body Region", value: exercise.body_region ? exercise.body_region.replace(/_/g, " ") : "—" },
    { label: "Equipment", value: exercise.equipment?.length ? exercise.equipment.join(", ") : "—" },
    { label: "Default Sets", value: String(exercise.default_sets) },
    { label: "Default Reps", value: String(exercise.default_reps) },
    { label: "Rest Interval", value: `${exercise.default_rest_seconds}s` },
  ];

  return (
    <GradientBackground>
    <ScrollView className="flex-1 px-4 pt-16">
      {/* Screen title */}
      <ScreenTitle
        title={exercise.name}
        subtitle={exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1)}
        className="mb-6"
      />

      {/* Description */}
      {exercise.description && (
        <Card className="mb-4">
          <Text className="text-surface-50 text-sm leading-6">
            {exercise.description}
          </Text>
        </Card>
      )}

      {/* Video tutorial player */}
      <VideoPlayer videoUrl={exercise.video_url} />

      {/* Details grid */}
      <Card title="Default Settings" className="mb-6">
        {detailRows.map((row) => (
          <View
            key={row.label}
            className="flex-row justify-between py-2.5 border-b border-border last:border-b-0"
          >
            <Text className="text-surface-400 text-sm">{row.label}</Text>
            <Text className="text-surface-50 text-sm font-medium capitalize">
              {row.value}
            </Text>
          </View>
        ))}
      </Card>
      {/* Bottom spacer */}
      <View className="h-8" />
    </ScrollView>
    </GradientBackground>
  );
}
