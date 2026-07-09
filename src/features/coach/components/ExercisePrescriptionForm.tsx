/**
 * ExercisePrescriptionForm — Form to add/configure an exercise in a workout block
 *
 * Fields:
 *   - Exercise selector: search + select from exercise library
 *   - Set scheme: uses SetSchemeEditor
 *   - Rest timer (seconds)
 *   - Notes — text area
 *   - Alternative exercises — multi-select from library
 *
 * Validation: at least 1 set, valid reps, positive rest time
 */

import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { useExerciseSearch } from "@/features/exercises/hooks/useExercises";
import type { ExerciseRow } from "@/types/pocketbase";
import {
  SetSchemeEditor,
  createSetEntry,
  type SetEntry,
} from "./SetSchemeEditor";

// ─── Types ───────────────────────────────────────────────────────────────

export interface ExercisePrescription {
  exerciseId: string;
  exerciseName: string;
  exerciseCategory?: string;
  sets: SetEntry[];
  restSeconds: number;
  notes: string;
  alternativeExerciseIds: string[];
}

export interface ExercisePrescriptionFormProps {
  value: ExercisePrescription;
  onChange: (value: ExercisePrescription) => void;
  onRemove?: () => void;
  /** If true, hide the remove button */
  hideRemove?: boolean;
}

// ─── Default ─────────────────────────────────────────────────────────────

export function createDefaultPrescription(): ExercisePrescription {
  return {
    exerciseId: "",
    exerciseName: "",
    exerciseCategory: undefined,
    sets: [createSetEntry({ reps: 10, isWarmup: false })],
    restSeconds: 90,
    notes: "",
    alternativeExerciseIds: [],
  };
}

// ─── Exercise Picker Modal ───────────────────────────────────────────────

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
      <View className="flex-1 bg-background pt-16 px-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-surface-50 text-xl font-extrabold">
            Select Exercise
          </Text>
          <TouchableOpacity onPress={onClose} className="p-2 min-w-[44px] items-center">
            <Text className="text-titanium text-base font-semibold">Cancel</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          placeholder="Search exercises..."
          placeholderTextColor="#707074"
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="bg-card border border-border rounded-xl px-4 py-3.5 text-surface-50 text-base mb-4"
          autoFocus
          autoCapitalize="none"
        />

        {isLoading && searchQuery.length >= 2 && (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color="#B9B9B6" />
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
              className="bg-card border border-border rounded-xl p-4 mb-2 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.name}`}
            >
              <Text className="text-surface-50 text-base font-semibold">
                {item.name}
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                <View className="bg-graphite px-2 py-0.5 rounded-md">
                  <Text className="text-surface-400 text-xs">{item.category}</Text>
                </View>
                {item.body_region && (
                  <Text className="text-surface-500 text-xs">
                    {item.body_region.replace(/_/g, " ")}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      </View>
    </Modal>
  );
}

// ─── Alternative Exercise Picker (Inline) ────────────────────────────────

let _altSearchTimeout: ReturnType<typeof setTimeout> | null = null;

function AlternativeExercisePicker({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { data: results, isLoading } = useExerciseSearch(debouncedSearch);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (_altSearchTimeout) clearTimeout(_altSearchTimeout);
    _altSearchTimeout = setTimeout(() => {
      setDebouncedSearch(text);
    }, 300);
  }, []);

  return (
    <View>
      <Text className="text-surface-400 text-[13px] font-semibold mb-1.5">
        Alternative Exercises
      </Text>
      <TextInput
        placeholder="Search to add alternatives..."
        placeholderTextColor="#707074"
        value={search}
        onChangeText={handleSearch}
        className="bg-card border border-border rounded-xl px-4 py-3 text-surface-50 text-base mb-2"
        autoCapitalize="none"
      />

      {isLoading && debouncedSearch.length >= 2 && (
        <ActivityIndicator size="small" color="#B9B9B6" className="py-2" />
      )}

      {debouncedSearch.length >= 2 && !isLoading && (results ?? []).length > 0 && (
        <View className="flex-row flex-wrap gap-2 mb-2">
          {(results ?? [])
            .filter((ex) => !selectedIds.includes(ex.id))
            .slice(0, 5)
            .map((ex) => (
              <TouchableOpacity
                key={ex.id}
                onPress={() => onToggle(ex.id)}
                className="bg-graphite rounded-lg px-3 py-1.5 flex-row items-center gap-1"
                accessibilityLabel={`Add ${ex.name} as alternative`}
              >
                <Ionicons name="add" size={14} color="#B9B9B6" />
                <Text className="text-surface-50 text-xs">{ex.name}</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function ExercisePrescriptionForm({
  value,
  onChange,
  onRemove,
  hideRemove = false,
}: ExercisePrescriptionFormProps) {
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const handleSelectExercise = useCallback(
    (exercise: ExerciseRow) => {
      onChange({
        ...value,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        exerciseCategory: exercise.category,
        sets: value.sets.length > 0
          ? value.sets
          : [createSetEntry({ reps: exercise.default_reps })],
        restSeconds: value.restSeconds || exercise.default_rest_seconds,
      });
      setIsPickerVisible(false);
    },
    [value, onChange],
  );

  const handleSetsChange = useCallback(
    (sets: SetEntry[]) => {
      onChange({ ...value, sets });
    },
    [value, onChange],
  );

  const handleToggleAlternative = useCallback(
    (id: string) => {
      const exists = value.alternativeExerciseIds.includes(id);
      onChange({
        ...value,
        alternativeExerciseIds: exists
          ? value.alternativeExerciseIds.filter((eid) => eid !== id)
          : [...value.alternativeExerciseIds, id],
      });
    },
    [value, onChange],
  );

  const isExerciseSelected = !!value.exerciseId;

  return (
    <View>
      {/* Exercise selector */}
      {!isExerciseSelected ? (
        <TouchableOpacity
          onPress={() => setIsPickerVisible(true)}
          className="border-2 border-dashed border-border rounded-xl py-5 items-center mb-4 active:opacity-70"
          accessibilityLabel="Select exercise"
        >
          <Ionicons name="search-outline" size={24} color="#707074" />
          <Text className="text-surface-400 text-sm mt-2 font-medium">
            Tap to select exercise
          </Text>
        </TouchableOpacity>
      ) : (
        <Card variant="soft" className="mb-4">
          {/* Selected exercise header */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-full bg-graphite items-center justify-center">
                <Ionicons name="barbell-outline" size={20} color="#B9B9B6" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-surface-50 text-base font-semibold"
                  numberOfLines={1}
                >
                  {value.exerciseName}
                </Text>
                {value.exerciseCategory && (
                  <Text className="text-surface-500 text-xs capitalize">
                    {value.exerciseCategory}
                  </Text>
                )}
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => setIsPickerVisible(true)}
                className="bg-graphite rounded-lg p-2"
                accessibilityLabel="Change exercise"
              >
                <Ionicons name="swap-horizontal" size={16} color="#B9B9B6" />
              </TouchableOpacity>
              {!hideRemove && onRemove && (
                <TouchableOpacity
                  onPress={onRemove}
                  className="bg-danger/10 rounded-lg p-2"
                  accessibilityLabel="Remove exercise"
                >
                  <Ionicons name="trash-outline" size={16} color="#D65F5F" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Set scheme editor */}
          <SetSchemeEditor sets={value.sets} onChange={handleSetsChange} />

          {/* Rest timer */}
          <View className="mt-3">
            <Text className="text-surface-400 text-[13px] font-semibold mb-1.5">
              Rest (seconds)
            </Text>
            <TextInput
              keyboardType="number-pad"
              value={String(value.restSeconds)}
              onChangeText={(text) =>
                onChange({
                  ...value,
                  restSeconds: Math.max(0, parseInt(text, 10) || 0),
                })
              }
              className="bg-graphite rounded-xl px-4 py-3 text-surface-50 text-base"
            />
          </View>

          {/* Notes */}
          <View className="mt-3">
            <Text className="text-surface-400 text-[13px] font-semibold mb-1.5">
              Coach Notes
            </Text>
            <TextInput
              value={value.notes}
              onChangeText={(text) => onChange({ ...value, notes: text })}
              placeholder="Cues, tempo, execution notes..."
              placeholderTextColor="#52525b"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-graphite rounded-xl px-4 py-3 text-surface-50 text-base min-h-[80px]"
            />
          </View>

          {/* Alternative exercises */}
          <View className="mt-3">
            <AlternativeExercisePicker
              selectedIds={value.alternativeExerciseIds}
              onToggle={handleToggleAlternative}
            />
            {value.alternativeExerciseIds.length > 0 && (
              <Text className="text-surface-500 text-xs mt-1">
                {value.alternativeExerciseIds.length} alternative
                {value.alternativeExerciseIds.length !== 1 ? "s" : ""} selected
              </Text>
            )}
          </View>
        </Card>
      )}

      {/* Exercise picker modal */}
      <ExercisePickerModal
        visible={isPickerVisible}
        onSelect={handleSelectExercise}
        onClose={() => setIsPickerVisible(false)}
        selectedIds={
          value.exerciseId
            ? new Set([value.exerciseId, ...value.alternativeExerciseIds])
            : new Set(value.alternativeExerciseIds)
        }
      />
    </View>
  );
}
