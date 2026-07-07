import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { PageSkeleton } from "@/shared/ui/SkeletonLoader";
import {
  useCoachExercises,
  useCoachCategories,
  useArchiveExercise,
  useUnarchiveExercise,
} from "@/features/coach/hooks/useCoachExercises";

export default function CoachExerciseLibraryScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const { data, isLoading, refetch, isRefetching } = useCoachExercises(category);
  const { data: categories } = useCoachCategories();
  const archiveMutation = useArchiveExercise();
  const unarchiveMutation = useUnarchiveExercise();

  const exercises = data?.data ?? [];
  const allCategories = categories ?? [];

  const handleArchive = useCallback(
    (id: string, name: string) => {
      Alert.alert("Archive Exercise", `Hide "${name}" from exercise lists?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => archiveMutation.mutate(id),
        },
      ]);
    },
    [archiveMutation],
  );

  const renderExercise = useCallback(
    ({ item }: { item: (typeof exercises)[0] }) => (
      <TouchableOpacity
        className="bg-card border border-border rounded-2xl p-4 mb-3"
        onPress={() => router.push(`/(coach)/library/${item.id}/edit`)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Edit exercise: ${item.name}`}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-surface-50 font-semibold text-base">
              {item.name}
            </Text>
            <View className="flex-row items-center gap-2 mt-1">
              <View className="bg-graphite px-2 py-0.5 rounded-md">
                <Text className="text-surface-400 text-xs">
                  {item.category}
                </Text>
              </View>
              {item.created_by && (
                <View className="bg-graphite px-2 py-0.5 rounded-md">
                  <Text className="text-titanium text-xs">Coach</Text>
                </View>
              )}
              <Text className="text-surface-500 text-xs">
                {item.default_sets}×{item.default_reps}
              </Text>
            </View>
            {item.description && (
              <Text className="text-surface-400 text-xs mt-1 line-clamp-1">
                {item.description}
              </Text>
            )}
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => router.push(`/(coach)/library/${item.id}/edit`)}
              className="bg-graphite rounded-xl p-2 min-w-[44px] min-h-[44px] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}`}
            >
              <Ionicons name="pencil-outline" size={16} color="#B9B9B6" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleArchive(item.id, item.name)}
              className="bg-graphite rounded-xl p-2 min-w-[44px] min-h-[44px] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={`Archive ${item.name}`}
            >
              <Ionicons name="archive-outline" size={16} color="#D65F5F" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [router, handleArchive],
  );

  if (isLoading) {
    return (
      <ErrorBoundary>
        <View className="flex-1">
          <PageSkeleton />
        </View>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <View className="flex-1 px-4 pt-4">
        {/* Header actions */}
        <TouchableOpacity
          className="flex-row items-center bg-card border border-border rounded-xl px-4 py-3 mb-4 min-h-[52px]"
          onPress={() => router.push("/(coach)/library/create")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Create a new exercise"
        >
          <Ionicons name="add-circle-outline" size={20} color="#B9B9B6" />
          <Text className="text-surface-50 font-semibold ml-2">
            Create Exercise
          </Text>
        </TouchableOpacity>

        {/* Category filter chips */}
        <FlatList
          horizontal
          data={["all", ...allCategories]}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              className={`px-4 py-2 rounded-full mr-2 min-h-[36px] justify-center ${
                (cat === "all" && !category) || cat === category
                  ? "bg-surface-50"
                  : "bg-card border border-border"
              }`}
              onPress={() => setCategory(cat === "all" ? null : cat)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${cat}`}
            >
              <Text
                className={`text-sm font-medium ${
                  (cat === "all" && !category) || cat === category
                    ? "text-background"
                    : "text-surface-400"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Exercise list */}
        {exercises.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 rounded-full bg-graphite items-center justify-center mb-4">
              <Ionicons name="barbell-outline" size={28} color="#B9B9B6" />
            </View>
            <Text className="text-surface-50 text-lg font-semibold mb-2">
              No Exercises
            </Text>
            <Text className="text-surface-400 text-center text-sm leading-5">
              Add exercises to build your library. Create your first exercise to get started.
            </Text>
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={renderExercise}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#B9B9B6"
              />
            }
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ErrorBoundary>
  );
}
