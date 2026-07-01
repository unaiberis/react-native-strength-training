import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Card } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import { useTemplates, useDeleteTemplate } from "../hooks/useTemplates";
import type { TemplateWithExercises } from "../../../lib/pocketbase/services/templates";

function RoutineItem({
  template,
  onPress,
  onDelete,
}: {
  template: TemplateWithExercises;
  onPress: () => void;
  onDelete: () => void;
}) {
  const exerciseCount = template.exercises.length;
  const totalSets = template.exercises.reduce(
    (sum, ex) => sum + ex.target_sets,
    0,
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-surface-900 rounded-xl p-4 mb-3 border border-surface-800 active:opacity-80"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-3">
          <Text className="text-surface-100 text-base font-semibold mb-1">
            {template.name}
          </Text>
          {template.description && (
            <Text className="text-surface-400 text-sm mb-2" numberOfLines={2}>
              {template.description}
            </Text>
          )}
          <View className="flex-row gap-3">
            <Text className="text-surface-500 text-xs">
              {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
            </Text>
            <Text className="text-surface-500 text-xs">
              {totalSets} total set{totalSets !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onDelete}
          className="p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text className="text-red-400 text-sm">Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export function RoutineListScreen() {
  const router = useRouter();
  const { data: templates, isLoading, isRefetching, refetch } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    (template: TemplateWithExercises) => {
      Alert.alert(
        "Delete Routine",
        `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setDeletingId(template.id);
              try {
                await deleteTemplate.mutateAsync(template.id);
              } catch (err) {
                Alert.alert(
                  "Error",
                  (err as Error).message ?? "Failed to delete routine",
                );
              } finally {
                setDeletingId(null);
              }
            },
          },
        ],
      );
    },
    [deleteTemplate],
  );

  const handlePress = useCallback(
    (template: TemplateWithExercises) => {
      router.push(`/routines/${template.id}/edit`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: TemplateWithExercises }) => (
      <RoutineItem
        template={item}
        onPress={() => handlePress(item)}
        onDelete={() => handleDelete(item)}
      />
    ),
    [handlePress, handleDelete],
  );

  const keyExtractor = useCallback(
    (item: TemplateWithExercises) => item.id,
    [],
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View className="items-center py-16 px-4">
        <Text className="text-4xl mb-4">📋</Text>
        <Text className="text-surface-100 text-lg font-semibold mb-2">
          No Routines Yet
        </Text>
        <Text className="text-surface-400 text-center mb-6">
          Create your first workout routine to get started.
        </Text>
        <Button
          title="Create Routine"
          variant="primary"
          onPress={() => router.push("/routines/new")}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface-950 items-center justify-center">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-950">
      {/* Header */}
      <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
        <Text className="text-surface-400 text-sm">
          {templates?.length ?? 0} routine{(templates?.length ?? 0) !== 1 ? "s" : ""}
        </Text>
        <Button
          title="+ New"
          variant="primary"
          onPress={() => router.push("/routines/new")}
        />
      </View>

      <FlatList
        data={templates ?? []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#22c55e"
          />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
