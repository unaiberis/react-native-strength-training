import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import {
  workoutTemplateSchema,
  templateDefaults,
  type WorkoutTemplateInput,
  type TemplateExerciseInput,
} from "../../../shared/schemas/template";
import {
  useCreateTemplate,
  useUpdateTemplate,
  useTemplate,
} from "../hooks/useTemplates";
import { useExerciseSearch } from "../../exercises/hooks/useExercises";
import type { ExerciseRow } from "../../../types/pocketbase";

interface ExerciseFormItem {
  key: string;
  exerciseId: string;
  exerciseName: string;
  sortOrder: number;
  targetSets: number;
  targetReps: number;
  targetRpeLow: number | null;
  targetRpeHigh: number | null;
  restSeconds: number;
  notes: string | null;
}

function ExercisePickerModal({
  visible,
  onSelect,
  onClose,
  selectedIds,
}: {
  visible: boolean;
  onSelect: (exercise: ExerciseRow) => void;
  onClose: () => void;
  selectedIds: Set<string>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: results, isLoading } = useExerciseSearch(searchQuery);

  const filteredResults = useMemo(
    () => (results ?? []).filter((ex) => !selectedIds.has(ex.id)),
    [results, selectedIds],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-surface-950 pt-16 px-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-surface-50 text-xl font-bold">Add Exercise</Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <Text className="text-brand-500 text-base font-medium">Cancel</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          placeholder="Search exercises..."
          placeholderTextColor="#71717a"
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="bg-surface-800 border border-surface-700 rounded-xl px-4 py-3.5 text-surface-100 text-base mb-4"
          autoFocus
        />

        {isLoading && searchQuery.length >= 2 && (
          <View className="py-4">
            <ActivityIndicator size="small" color="#22c55e" />
          </View>
        )}

        {searchQuery.length < 2 && (
          <Text className="text-surface-500 text-center py-8">
            Type at least 2 characters to search
          </Text>
        )}

        {searchQuery.length >= 2 && !isLoading && filteredResults.length === 0 && (
          <Text className="text-surface-500 text-center py-8">
            No exercises found
          </Text>
        )}

        <FlatList
          data={filteredResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onSelect(item)}
              className="bg-surface-900 rounded-xl p-4 mb-2 border border-surface-800 active:opacity-80"
            >
              <Text className="text-surface-100 text-base font-medium">
                {item.name}
              </Text>
              <Text className="text-surface-500 text-xs mt-0.5 capitalize">
                {item.category}
                {item.body_region ? ` · ${item.body_region.replace("_", " ")}` : ""}
              </Text>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

function ExerciseConfigCard({
  index,
  item,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  index: number;
  item: ExerciseFormItem;
  onUpdate: (index: number, updates: Partial<ExerciseFormItem>) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <Card className="mb-3">
      {/* Header with exercise name and controls */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-surface-500 text-sm font-mono">
            #{index + 1}
          </Text>
          <Text
            className="text-surface-100 text-base font-semibold flex-1"
            numberOfLines={1}
          >
            {item.exerciseName}
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={() => onMoveUp(index)}
            disabled={isFirst}
            className={`p-1.5 rounded-lg ${isFirst ? "opacity-30" : "active:bg-surface-800"}`}
          >
            <Text className="text-surface-400 text-lg">▲</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onMoveDown(index)}
            disabled={isLast}
            className={`p-1.5 rounded-lg ${isLast ? "opacity-30" : "active:bg-surface-800"}`}
          >
            <Text className="text-surface-400 text-lg">▼</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onRemove(index)}
            className="p-1.5 rounded-lg ml-1"
          >
            <Text className="text-red-400 text-base">✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Target fields row */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-surface-400 text-xs mb-1">Sets</Text>
          <TextInput
            keyboardType="number-pad"
            value={String(item.targetSets)}
            onChangeText={(text) =>
              onUpdate(index, { targetSets: parseInt(text, 10) || 1 })
            }
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-100 text-sm"
          />
        </View>
        <View className="flex-1">
          <Text className="text-surface-400 text-xs mb-1">Reps</Text>
          <TextInput
            keyboardType="number-pad"
            value={String(item.targetReps)}
            onChangeText={(text) =>
              onUpdate(index, { targetReps: parseInt(text, 10) || 1 })
            }
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-100 text-sm"
          />
        </View>
        <View className="flex-1">
          <Text className="text-surface-400 text-xs mb-1">Rest (s)</Text>
          <TextInput
            keyboardType="number-pad"
            value={String(item.restSeconds)}
            onChangeText={(text) =>
              onUpdate(index, { restSeconds: parseInt(text, 10) || 60 })
            }
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-100 text-sm"
          />
        </View>
      </View>

      {/* RPE row */}
      <View className="flex-row gap-3 mt-2">
        <View className="flex-1">
          <Text className="text-surface-400 text-xs mb-1">RPE Low</Text>
          <TextInput
            keyboardType="decimal-pad"
            value={item.targetRpeLow != null ? String(item.targetRpeLow) : ""}
            onChangeText={(text) =>
              onUpdate(index, {
                targetRpeLow: text ? parseFloat(text) : null,
              })
            }
            placeholder="—"
            placeholderTextColor="#52525b"
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-100 text-sm"
          />
        </View>
        <View className="flex-1">
          <Text className="text-surface-400 text-xs mb-1">RPE High</Text>
          <TextInput
            keyboardType="decimal-pad"
            value={item.targetRpeHigh != null ? String(item.targetRpeHigh) : ""}
            onChangeText={(text) =>
              onUpdate(index, {
                targetRpeHigh: text ? parseFloat(text) : null,
              })
            }
            placeholder="—"
            placeholderTextColor="#52525b"
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-100 text-sm"
          />
        </View>
        <View className="flex-1" />
      </View>

      {/* Notes */}
      <TextInput
        value={item.notes ?? ""}
        onChangeText={(text) =>
          onUpdate(index, { notes: text || null })
        }
        placeholder="Notes (optional)"
        placeholderTextColor="#52525b"
        className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-400 text-sm mt-2"
      />
    </Card>
  );
}

export function RoutineFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const { data: existingTemplate, isLoading: isLoadingTemplate } =
    useTemplate(isEditing ? id : undefined);

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [exercises, setExercises] = useState<ExerciseFormItem[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkoutTemplateInput>({
    resolver: zodResolver(workoutTemplateSchema),
    defaultValues: templateDefaults,
  });

  // Populate form when editing
  const [isInitialized, setIsInitialized] = useState(false);
  if (existingTemplate && !isInitialized) {
    setIsInitialized(true);
    setExercises(
      existingTemplate.exercises.map((ex, idx) => ({
        key: `existing-${ex.id}`,
        exerciseId: ex.exercise_id,
        exerciseName: "",
        sortOrder: idx,
        targetSets: ex.target_sets,
        targetReps: ex.target_reps,
        targetRpeLow: ex.target_rpe_low,
        targetRpeHigh: ex.target_rpe_high,
        restSeconds: ex.rest_seconds,
        notes: ex.notes,
      })),
    );
  }

  const handleSelectExercise = useCallback(
    (exercise: ExerciseRow) => {
      setExercises((prev) => [
        ...prev,
        {
          key: `new-${exercise.id}-${Date.now()}`,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          sortOrder: prev.length,
          targetSets: exercise.default_sets,
          targetReps: exercise.default_reps,
          restSeconds: exercise.default_rest_seconds,
          targetRpeLow: null,
          targetRpeHigh: null,
          notes: null,
        },
      ]);
      setIsPickerVisible(false);
    },
    [],
  );

  const handleUpdateExercise = useCallback(
    (index: number, updates: Partial<ExerciseFormItem>) => {
      setExercises((prev) =>
        prev.map((ex, i) => (i === index ? { ...ex, ...updates } : ex)),
      );
    },
    [],
  );

  const handleRemoveExercise = useCallback((index: number) => {
    setExercises((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((ex, i) => ({ ...ex, sortOrder: i })),
    );
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setExercises((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = { ...next[index], sortOrder: index - 1 };
      next[index] = { ...temp, sortOrder: index };
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setExercises((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = { ...next[index], sortOrder: index + 1 };
      next[index] = { ...temp, sortOrder: index };
      return next;
    });
  }, []);

  const onSubmit = useCallback(
    async (formData: WorkoutTemplateInput) => {
      if (exercises.length === 0) {
        Alert.alert("Validation", "Add at least one exercise to the routine.");
        return;
      }

      const input: WorkoutTemplateInput = {
        ...formData,
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sortOrder: ex.sortOrder,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetRpeLow: ex.targetRpeLow,
          targetRpeHigh: ex.targetRpeHigh,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
        })),
      };

      try {
        if (isEditing && id) {
          await updateTemplate.mutateAsync({ id, input });
        } else {
          await createTemplate.mutateAsync(input);
        }
        router.back();
      } catch (err) {
        Alert.alert("Error", (err as Error).message ?? "Failed to save routine");
      }
    },
    [exercises, isEditing, id, createTemplate, updateTemplate, router],
  );

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  if (isEditing && isLoadingTemplate) {
    return (
      <View className="flex-1 bg-surface-950 items-center justify-center">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-950">
      <ScrollView
        className="flex-1 px-4 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {/* Name field */}
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Routine Name"
              placeholder="e.g., Push Day"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.name?.message}
            />
          )}
        />

        {/* Description field */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Description (optional)"
              placeholder="Describe this routine..."
              value={value ?? ""}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />

        {/* Exercises section */}
        <Text className="text-surface-100 text-lg font-semibold mb-3 mt-2">
          Exercises
        </Text>

        {exercises.length === 0 && (
          <Card className="mb-4">
            <Text className="text-surface-400 text-center py-4">
              No exercises yet. Tap "Add Exercise" to get started.
            </Text>
          </Card>
        )}

        {exercises.map((item, index) => (
          <ExerciseConfigCard
            key={item.key}
            index={index}
            item={item}
            onUpdate={handleUpdateExercise}
            onRemove={handleRemoveExercise}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            isFirst={index === 0}
            isLast={index === exercises.length - 1}
          />
        ))}

        {/* Add exercise button */}
        <TouchableOpacity
          onPress={() => setIsPickerVisible(true)}
          className="border-2 border-dashed border-surface-700 rounded-2xl py-4 items-center mb-6 active:opacity-70"
        >
          <Text className="text-brand-500 text-base font-medium">
            + Add Exercise
          </Text>
        </TouchableOpacity>

        {/* Save button */}
        <Button
          title={isEditing ? "Update Routine" : "Create Routine"}
          variant="primary"
          loading={isSaving}
          onPress={handleSubmit(onSubmit)}
          className="mb-8"
        />
      </ScrollView>

      {/* Exercise picker modal */}
      <ExercisePickerModal
        visible={isPickerVisible}
        onSelect={handleSelectExercise}
        onClose={() => setIsPickerVisible(false)}
        selectedIds={new Set(exercises.map((e) => e.exerciseId))}
      />
    </View>
  );
}
