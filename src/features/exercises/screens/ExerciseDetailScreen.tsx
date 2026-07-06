import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useLingui } from "@lingui/react/macro";
import { Trans } from "@lingui/react/macro";
import { Card } from "../../../shared/ui/Card";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { useExercise } from "../hooks/useExercises";

export function ExerciseDetailScreen() {
  const { t } = useLingui();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: exercise, isLoading, error } = useExercise(id);

  if (isLoading) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#A4A4A8" />
        </View>
      </GradientBackground>
    );
  }

  if (error || !exercise) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center px-4">
        <Text className="text-surface-400 text-base">
          {error ? (error as Error).message : <Trans>Exercise not found</Trans>}
        </Text>
      </View>
      </GradientBackground>
    );
  }

  const detailRows = [
    { label: t`Category`, value: exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1) },
    { label: t`Body Region`, value: exercise.body_region ? exercise.body_region.replace(/_/g, " ") : "—" },
    { label: t`Equipment`, value: exercise.equipment?.length ? exercise.equipment.join(", ") : "—" },
    { label: t`Default Sets`, value: String(exercise.default_sets) },
    { label: t`Default Reps`, value: String(exercise.default_reps) },
    { label: t`Rest Interval`, value: `${exercise.default_rest_seconds}s` },
  ];

  return (
    <GradientBackground>
    <ScrollView className="flex-1 px-4 pt-4">
      {/* Exercise name header */}
      <Text className="text-surface-50 text-2xl font-bold mb-2">
        {exercise.name}
      </Text>

      {/* Category badges */}
      <View className="flex-row gap-2 mb-6">
        <View className="bg-brand-500/20 rounded-full px-3 py-1">
          <Text className="text-brand-400 text-sm capitalize">
            {exercise.category}
          </Text>
        </View>
        {exercise.body_region && (
          <View className="bg-surface-800 rounded-full px-3 py-1">
            <Text className="text-surface-300 text-sm capitalize">
              {exercise.body_region.replace("_", " ")}
            </Text>
          </View>
        )}
      </View>

      {/* Description */}
      {exercise.description && (
        <Card className="mb-4">
          <Text className="text-surface-100 text-sm leading-6">
            {exercise.description}
          </Text>
        </Card>
      )}

      {/* Details grid */}
      <Card title={t`Default Settings`} className="mb-6">
        {detailRows.map((row) => (
          <View
            key={row.label}
            className="flex-row justify-between py-2.5 border-b border-surface-800 last:border-b-0"
          >
            <Text className="text-surface-400 text-sm">{row.label}</Text>
            <Text className="text-surface-100 text-sm font-medium capitalize">
              {row.value}
            </Text>
          </View>
        ))}
      </Card>
    </ScrollView>
    </GradientBackground>
  );
}
