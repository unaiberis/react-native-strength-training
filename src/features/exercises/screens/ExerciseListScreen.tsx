import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Card } from "../../../shared/ui/Card";
import { useExercises, useCategories } from "../hooks/useExercises";
import type { ExerciseRow } from "../../../lib/supabase/services/exercises";

const PAGE_SIZE = 20;

interface CategoryChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function CategoryChip({ label, selected, onPress }: CategoryChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`
        px-4 py-2 rounded-full mr-2 mb-2
        ${selected ? "bg-brand-500" : "bg-surface-800 border border-surface-700"}
      `}
    >
      <Text
        className={`text-sm font-medium ${selected ? "text-surface-950" : "text-surface-300"}`}
      >
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Text>
    </TouchableOpacity>
  );
}

function ExerciseItem({ exercise }: { exercise: ExerciseRow }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/exercises/${exercise.id}`)}
      className="bg-surface-900 rounded-xl p-4 mb-3 border border-surface-800 active:opacity-80"
    >
      <Text className="text-surface-100 text-base font-semibold mb-1">
        {exercise.name}
      </Text>
      <View className="flex-row items-center gap-2">
        <View className="bg-surface-800 rounded-full px-2.5 py-0.5">
          <Text className="text-surface-400 text-xs capitalize">
            {exercise.category}
          </Text>
        </View>
        {exercise.body_region && (
          <View className="bg-surface-800 rounded-full px-2.5 py-0.5">
            <Text className="text-surface-400 text-xs capitalize">
              {exercise.body_region.replace("_", " ")}
            </Text>
          </View>
        )}
      </View>
      {exercise.equipment && exercise.equipment.length > 0 && (
        <Text className="text-surface-500 text-xs mt-1.5">
          {exercise.equipment.join(" · ")}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function ExerciseListScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data, isLoading, isRefetching, refetch } = useExercises(
    selectedCategory,
    page,
    PAGE_SIZE,
  );
  const { data: categories } = useCategories();

  const exercises = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const hasMore = (page + 1) * PAGE_SIZE < totalCount;

  const onRefresh = useCallback(() => {
    setPage(0);
    refetch();
  }, [refetch]);

  const handleCategoryPress = useCallback((category: string | null) => {
    setSelectedCategory(category);
    setPage(0);
  }, []);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, isLoading]);

  const allCategories = ["all", ...(categories ?? [])];

  const renderItem = useCallback(
    ({ item }: { item: ExerciseRow }) => <ExerciseItem exercise={item} />,
    [],
  );

  const keyExtractor = useCallback((item: ExerciseRow) => item.id, []);

  const renderFooter = () => {
    if (!isLoading || exercises.length === 0) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#22c55e" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View className="flex-1 items-center justify-center py-16">
        <Text className="text-surface-500 text-base mb-2">
          {selectedCategory
            ? "No exercises found in this category"
            : "No exercises available"}
        </Text>
        {selectedCategory && (
          <TouchableOpacity onPress={() => handleCategoryPress(null)}>
            <Text className="text-brand-500 text-sm">Clear filter</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-surface-950">
      {/* Category filter chips */}
      <View className="px-4 pt-4 pb-2">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={allCategories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <CategoryChip
              label={item === "all" ? "All" : item}
              selected={
                item === "all" ? selectedCategory === null : selectedCategory === item
              }
              onPress={() =>
                handleCategoryPress(item === "all" ? null : item)
              }
            />
          )}
          contentContainerStyle={{ paddingRight: 16 }}
        />
      </View>

      {/* Exercise list */}
      <FlatList
        data={exercises}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor="#22c55e"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
