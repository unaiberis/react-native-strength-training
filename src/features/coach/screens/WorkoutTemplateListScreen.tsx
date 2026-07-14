/**
 * WorkoutTemplateListScreen — List of saved workout templates
 *
 * Features:
 *   - Search/filter by name
 *   - Each template shows: name, block count (from notes JSON), exercise count
 *   - Duplicate, edit, delete actions
 *   - "Create New" FAB button
 *   - EmptyState when no templates
 *   - Pull-to-refresh
 */

import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { KickerLabel } from "@/shared/ui/KickerLabel";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { PageSkeleton } from "@/shared/ui/SkeletonLoader";
import {
  useTemplates,
  useDeleteTemplate,
  useCreateTemplate,
} from "@/features/routines/hooks/useTemplates";
import type { TemplateWithExercises } from "@/lib/pocketbase/services/templates";
import type { WorkoutTemplateInput } from "@/shared/schemas/template";

// ─── Block count from notes JSON ────────────────────────────────────────

function extractBlockInfo(
  exercises: TemplateWithExercises["exercises"],
): { blockCount: number; label: string } {
  const blockNames = new Set<string>();
  for (const ex of exercises) {
    try {
      if (ex.notes) {
        const meta = JSON.parse(ex.notes);
        if (meta.blockName) blockNames.add(meta.blockName);
        else if (meta.blockType) blockNames.add(meta.blockType);
      }
    } catch {
      // Plain text notes — ignore
    }
  }
  return {
    blockCount: blockNames.size || 1,
    label: blockNames.size > 0 ? `${blockNames.size} block${blockNames.size !== 1 ? "s" : ""}` : "",
  };
}

// ─── Template Item ───────────────────────────────────────────────────────

function TemplateItem({
  template,
  onPress,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: TemplateWithExercises;
  onPress: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const exerciseCount = template.exercises.length;
  const totalSets = template.exercises.reduce(
    (sum, ex) => sum + ex.target_sets,
    0,
  );
  const { label: blockLabel } = extractBlockInfo(template.exercises);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-card border border-border rounded-2xl p-4 mb-3 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`Workout template: ${template.name}`}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-3">
          <Text className="text-surface-50 text-base font-semibold mb-1">
            {template.name}
          </Text>
          {template.description && (
            <Text className="text-surface-400 text-sm mb-2" numberOfLines={2}>
              {template.description}
            </Text>
          )}
          <View className="flex-row flex-wrap gap-2">
            <View className="bg-graphite px-2 py-0.5 rounded-md">
              <Text className="text-surface-400 text-xs">
                {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
              </Text>
            </View>
            <View className="bg-graphite px-2 py-0.5 rounded-md">
              <Text className="text-surface-400 text-xs">
                {totalSets} set{totalSets !== 1 ? "s" : ""}
              </Text>
            </View>
            {blockLabel ? (
              <View className="bg-graphite px-2 py-0.5 rounded-md">
                <Text className="text-surface-400 text-xs">{blockLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={onEdit}
            className="bg-graphite rounded-xl p-2 min-w-[40px] min-h-[40px] items-center justify-center"
            accessibilityLabel={`Edit ${template.name}`}
          >
            <Ionicons name="pencil-outline" size={16} color="#B9B9B6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDuplicate}
            className="bg-graphite rounded-xl p-2 min-w-[40px] min-h-[40px] items-center justify-center"
            accessibilityLabel={`Duplicate ${template.name}`}
          >
            <Ionicons name="copy-outline" size={16} color="#B9B9B6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            className="bg-danger/10 rounded-xl p-2 min-w-[40px] min-h-[40px] items-center justify-center"
            accessibilityLabel={`Delete ${template.name}`}
          >
            <Ionicons name="trash-outline" size={16} color="#D65F5F" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────

export function WorkoutTemplateListScreen() {
  const router = useRouter();
  const { data: templates, isLoading, isRefetching, refetch } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const createTemplate = useCreateTemplate();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    );
  }, [templates, searchQuery]);

  const handleNew = useCallback(() => {
    router.push("/(coach)/workout-builder");
  }, [router]);

  const handleEdit = useCallback(
    (template: TemplateWithExercises) => {
      router.push(`/(coach)/workout-builder/${template.id}`);
    },
    [router],
  );

  const handleDuplicate = useCallback(
    (template: TemplateWithExercises) => {
      const input: WorkoutTemplateInput = {
        name: `${template.name} (copy)`,
        description: template.description,
        programBlockId: null,
        isPublic: false,
        exercises: template.exercises
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((ex) => ({
            exerciseId: ex.exercise_id,
            sortOrder: ex.sort_order,
            targetSets: ex.target_sets,
            targetReps: ex.target_reps,
            targetRpeLow: ex.target_rpe_low,
            targetRpeHigh: ex.target_rpe_high,
            restSeconds: ex.rest_seconds,
            notes: ex.notes,
          })),
      };

      createTemplate.mutate(input, {
        onSuccess: () => {
          Alert.alert("Duplicated", `"${template.name}" has been duplicated.`);
        },
        onError: (err) => {
          Alert.alert("Error", err.message ?? "Failed to duplicate template");
        },
      });
    },
    [createTemplate],
  );

  const handleDelete = useCallback(
    (template: TemplateWithExercises) => {
      Alert.alert(
        "Delete Template",
        `Are you sure you want to delete "${template.name}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () =>
              deleteTemplate.mutate(template.id, {
                onError: (err) => {
                  Alert.alert(
                    "Error",
                    err.message ?? "Failed to delete template",
                  );
                },
              }),
          },
        ],
      );
    },
    [deleteTemplate],
  );

  const handlePress = useCallback(
    (template: TemplateWithExercises) => {
      router.push(`/(coach)/workout-builder/${template.id}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: TemplateWithExercises }) => (
      <TemplateItem
        template={item}
        onPress={() => handlePress(item)}
        onEdit={() => handleEdit(item)}
        onDuplicate={() => handleDuplicate(item)}
        onDelete={() => handleDelete(item)}
      />
    ),
    [handlePress, handleEdit, handleDuplicate, handleDelete],
  );

  const keyExtractor = useCallback(
    (item: TemplateWithExercises) => item.id,
    [],
  );

  // ── Loading ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ErrorBoundary>
        <View className="flex-1">
          <PageSkeleton />
        </View>
      </ErrorBoundary>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, backgroundColor: "#050505" }}>
        {/* Header with Back + Home */}
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mr-4"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color="#B9B9B6" />
            <Text className="text-titanium text-base ml-1">Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            accessibilityRole="button"
            accessibilityLabel="Go to home"
          >
            <Ionicons name="home-outline" size={22} color="#B9B9B6" />
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View className="mb-4">
          <KickerLabel>COACH TOOLS</KickerLabel>
          <ScreenTitle title="Workout Templates" subtitle="Create and manage workout programs" />
        </View>

        {/* Search */}
        {templates && templates.length > 0 && (
          <View className="flex-row items-center bg-card border border-border rounded-xl px-4 mb-4">
            <Ionicons name="search-outline" size={18} color="#707074" />
            <TextInput
              placeholder="Search templates..."
              placeholderTextColor="#707074"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 px-3 py-3.5 text-surface-50 text-base"
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                className="p-1"
              >
                <Ionicons name="close-circle" size={18} color="#707074" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Template list */}
        {filteredTemplates.length === 0 && !isLoading ? (
          <EmptyState
            icon="document-text-outline"
            title={
              searchQuery.trim()
                ? "No Matching Templates"
                : "No Workout Templates Yet"
            }
            subtitle={
              searchQuery.trim()
                ? "Try a different search term."
                : "Create your first workout template for athletes."
            }
            action={
              searchQuery.trim()
                ? undefined
                : {
                    label: "Create Template",
                    onPress: handleNew,
                  }
            }
          />
        ) : (
          <FlatList
            data={filteredTemplates}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#B9B9B6"
              />
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          onPress={handleNew}
          className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-titanium items-center justify-center shadow-lg"
          accessibilityRole="button"
          accessibilityLabel="Create new workout template"
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#050505" />
        </TouchableOpacity>
      </View>
    </ErrorBoundary>
  );
}
