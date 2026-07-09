/**
 * WorkoutBuilderScreen — Full workout template builder
 *
 * Features:
 *   - Workout name input
 *   - Blocks: normal, warmup, cooldown, superset
 *   - Exercises per block (using ExercisePrescriptionForm)
 *   - Reorder blocks (move up/down)
 *   - Reorder exercises within blocks
 *   - Save as template via PocketBase
 *
 * Uses ScreenTitle: "Build Workout" and KickerLabel: "COACH TOOLS"
 */

import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { KickerLabel } from "@/shared/ui/KickerLabel";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import {
  useCreateTemplate,
  useUpdateTemplate,
  useTemplate,
} from "@/features/routines/hooks/useTemplates";
import type {
  WorkoutTemplateInput,
  TemplateExerciseInput,
} from "@/shared/schemas/template";
import {
  ExercisePrescriptionForm,
  createDefaultPrescription,
  type ExercisePrescription,
} from "../components/ExercisePrescriptionForm";

// ─── Types ───────────────────────────────────────────────────────────────

type BlockType = "normal" | "warmup" | "cooldown" | "superset";

interface WorkoutBlock {
  id: string;
  type: BlockType;
  name: string;
  exercises: ExercisePrescription[];
}

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  normal: "Normal",
  warmup: "Warmup",
  cooldown: "Cooldown",
  superset: "Superset",
};

const BLOCK_TYPE_ICONS: Record<BlockType, keyof typeof Ionicons.glyphMap> = {
  normal: "fitness-outline",
  warmup: "flame-outline",
  cooldown: "snow-outline",
  superset: "git-merge-outline",
};

const BLOCK_TYPE_COLORS: Record<BlockType, string> = {
  normal: "#B9B9B6",
  warmup: "#f59e0b",
  cooldown: "#60a5fa",
  superset: "#a78bfa",
};

// ─── Helpers ─────────────────────────────────────────────────────────────

let _blockIdCounter = 0;

function createBlock(type: BlockType = "normal"): WorkoutBlock {
  _blockIdCounter += 1;
  return {
    id: `block-${_blockIdCounter}-${Date.now()}`,
    type,
    name: type === "normal" ? "" : BLOCK_TYPE_LABELS[type],
    exercises: [],
  };
}

// ─── Block Card Component ────────────────────────────────────────────────

function BlockCard({
  block,
  blockIndex,
  totalBlocks,
  onUpdateBlock,
  onRemoveBlock,
  onMoveBlockUp,
  onMoveBlockDown,
  onAddExercise,
  onUpdateExercise,
  onRemoveExercise,
}: {
  block: WorkoutBlock;
  blockIndex: number;
  totalBlocks: number;
  onUpdateBlock: (index: number, updates: Partial<WorkoutBlock>) => void;
  onRemoveBlock: (index: number) => void;
  onMoveBlockUp: (index: number) => void;
  onMoveBlockDown: (index: number) => void;
  onAddExercise: (blockIndex: number) => void;
  onUpdateExercise: (
    blockIndex: number,
    exerciseIndex: number,
    value: ExercisePrescription,
  ) => void;
  onRemoveExercise: (blockIndex: number, exerciseIndex: number) => void;
}) {
  const color = BLOCK_TYPE_COLORS[block.type];

  return (
    <Card variant="elevated" className="mb-4">
      {/* Block header */}
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-2 mb-1">
            <Ionicons
              name={BLOCK_TYPE_ICONS[block.type]}
              size={14}
              color={color}
            />
            <Text style={{ color }} className="text-xs font-bold uppercase tracking-wide">
              {BLOCK_TYPE_LABELS[block.type]}
            </Text>
          </View>
          <TextInput
            placeholder="Block name (optional)"
            placeholderTextColor="#52525b"
            value={block.name}
            onChangeText={(text) => onUpdateBlock(blockIndex, { name: text })}
            className="text-surface-50 text-base font-semibold -ml-0.5 px-0 py-0.5"
          />
        </View>

        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={() => onMoveBlockUp(blockIndex)}
            disabled={blockIndex === 0}
            className={`p-1.5 rounded-lg ${
              blockIndex === 0 ? "opacity-30" : "active:bg-graphite"
            }`}
            accessibilityLabel="Move block up"
          >
            <Ionicons name="chevron-up" size={18} color="#B9B9B6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onMoveBlockDown(blockIndex)}
            disabled={blockIndex === totalBlocks - 1}
            className={`p-1.5 rounded-lg ${
              blockIndex === totalBlocks - 1 ? "opacity-30" : "active:bg-graphite"
            }`}
            accessibilityLabel="Move block down"
          >
            <Ionicons name="chevron-down" size={18} color="#B9B9B6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onRemoveBlock(blockIndex)}
            className="p-1.5 rounded-lg ml-1"
            accessibilityLabel="Remove block"
          >
            <Ionicons name="trash-outline" size={18} color="#D65F5F" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Exercises within block */}
      {block.exercises.length === 0 && (
        <View className="bg-graphite rounded-xl p-4 mb-3">
          <Text className="text-surface-500 text-sm text-center">
            No exercises in this block. Add one below.
          </Text>
        </View>
      )}

      {block.exercises.map((exercise, exIndex) => (
        <View key={exercise.exerciseId || `empty-${exIndex}`} className="mb-3">
          {exercise.exerciseId && (
            <View className="flex-row items-center gap-2 mb-2">
              <View className="w-6 h-6 rounded-full bg-graphite items-center justify-center">
                <Text className="text-surface-400 text-[10px] font-bold">
                  {exIndex + 1}
                </Text>
              </View>
              <Text className="text-surface-400 text-xs font-medium flex-1">
                Exercise {exIndex + 1}
              </Text>
              <TouchableOpacity
                onPress={() => onRemoveExercise(blockIndex, exIndex)}
                className="p-1"
                accessibilityLabel={`Remove exercise ${exIndex + 1}`}
              >
                <Ionicons name="close-outline" size={18} color="#D65F5F" />
              </TouchableOpacity>
            </View>
          )}
          <ExercisePrescriptionForm
            value={exercise}
            onChange={(val) => onUpdateExercise(blockIndex, exIndex, val)}
            onRemove={() => onRemoveExercise(blockIndex, exIndex)}
            hideRemove={!exercise.exerciseId}
          />
        </View>
      ))}

      {/* Add exercise button */}
      <TouchableOpacity
        onPress={() => onAddExercise(blockIndex)}
        className="border-2 border-dashed border-border rounded-xl py-3 items-center flex-row justify-center gap-2 active:opacity-70"
        accessibilityLabel={`Add exercise to ${BLOCK_TYPE_LABELS[block.type]} block`}
      >
        <Ionicons name="add-circle-outline" size={18} color="#B9B9B6" />
        <Text className="text-titanium text-sm font-medium">Add Exercise</Text>
      </TouchableOpacity>
    </Card>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────

export function WorkoutBuilderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const { data: existingTemplate, isLoading: isLoadingTemplate } =
    useTemplate(isEditing ? id : undefined);

  // ── State ──────────────────────────────────────────────────────────────

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([createBlock("normal")]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showBlockTypePicker, setShowBlockTypePicker] = useState(false);

  // Populate from existing template when editing
  if (existingTemplate && !isInitialized) {
    setIsInitialized(true);
    setName(existingTemplate.name);
    setDescription(existingTemplate.description ?? "");

    // Group exercises into blocks based on notes JSON or create a single block
    const exGroups = groupExercisesIntoBlocks(existingTemplate.exercises);
    setBlocks(
      exGroups.length > 0
        ? exGroups
        : [createBlock("normal")],
    );
  }

  // ── Block management ───────────────────────────────────────────────────

  const handleUpdateBlock = useCallback(
    (index: number, updates: Partial<WorkoutBlock>) => {
      setBlocks((prev) =>
        prev.map((b, i) => (i === index ? { ...b, ...updates } : b)),
      );
    },
    [],
  );

  const handleRemoveBlock = useCallback(
    (index: number) => {
      Alert.alert("Remove Block", "Remove this block and all its exercises?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            setBlocks((prev) => prev.filter((_, i) => i !== index)),
        },
      ]);
    },
    [],
  );

  const handleMoveBlockUp = useCallback((index: number) => {
    if (index === 0) return;
    setBlocks((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  }, []);

  const handleMoveBlockDown = useCallback((index: number) => {
    setBlocks((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  }, []);

  const handleAddBlock = useCallback((type: BlockType) => {
    setBlocks((prev) => [...prev, createBlock(type)]);
    setShowBlockTypePicker(false);
  }, []);

  // ── Exercise management within blocks ──────────────────────────────────

  const handleAddExercise = useCallback((blockIndex: number) => {
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === blockIndex
          ? { ...b, exercises: [...b.exercises, createDefaultPrescription()] }
          : b,
      ),
    );
  }, []);

  const handleUpdateExercise = useCallback(
    (blockIndex: number, exerciseIndex: number, value: ExercisePrescription) => {
      setBlocks((prev) =>
        prev.map((b, bi) =>
          bi === blockIndex
            ? {
                ...b,
                exercises: b.exercises.map((ex, ei) =>
                  ei === exerciseIndex ? value : ex,
                ),
              }
            : b,
        ),
      );
    },
    [],
  );

  const handleRemoveExercise = useCallback(
    (blockIndex: number, exerciseIndex: number) => {
      setBlocks((prev) =>
        prev.map((b, bi) =>
          bi === blockIndex
            ? {
                ...b,
                exercises: b.exercises.filter((_, ei) => ei !== exerciseIndex),
              }
            : b,
        ),
      );
    },
    [],
  );

  // ── Save ───────────────────────────────────────────────────────────────

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Workout name is required");
      return;
    }

    const allExercises: TemplateExerciseInput[] = [];
    let globalSortOrder = 0;

    for (const block of blocks) {
      for (const ex of block.exercises) {
        if (!ex.exerciseId) continue;

        const blockMeta = {
          blockName: block.name || BLOCK_TYPE_LABELS[block.type],
          blockType: block.type,
          altExercises: ex.alternativeExerciseIds,
          sets: ex.sets.map((s) => ({
            reps: s.reps,
            rpe: s.rpe,
            weightType: s.weightType,
            isWarmup: s.isWarmup,
            isAmrap: s.isAmrap,
          })),
        };

        allExercises.push({
          exerciseId: ex.exerciseId,
          sortOrder: globalSortOrder++,
          targetSets: ex.sets.length,
          targetReps: ex.sets[0]?.reps ?? 10,
          targetRpeLow: ex.sets[0]?.rpe ?? null,
          targetRpeHigh:
            ex.sets.length > 1
              ? ex.sets[ex.sets.length - 1]?.rpe ?? null
              : null,
          restSeconds: ex.restSeconds,
          notes: JSON.stringify(blockMeta),
        });
      }
    }

    if (allExercises.length === 0) {
      Alert.alert(
        "Validation",
        "Add at least one exercise to the workout.",
      );
      return;
    }

    const input: WorkoutTemplateInput = {
      name: name.trim(),
      description: description.trim() || null,
      programBlockId: null,
      isPublic: false,
      exercises: allExercises,
    };

    try {
      if (isEditing && id) {
        await updateTemplate.mutateAsync({ id, input });
      } else {
        await createTemplate.mutateAsync(input);
      }
      router.back();
    } catch (err) {
      Alert.alert(
        "Error",
        (err as Error).message ?? "Failed to save workout template",
      );
    }
  }, [
    name,
    description,
    blocks,
    isEditing,
    id,
    createTemplate,
    updateTemplate,
    router,
  ]);

  const handleDiscard = useCallback(() => {
    Alert.alert("Discard Changes", "Are you sure? Unsaved changes will be lost.", [
      { text: "Keep Editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  }, [router]);

  // ── Derived counts ────────────────────────────────────────────────────

  const { totalExerciseCount, totalBlockCount } = useMemo(() => {
    let exCount = 0;
    for (const block of blocks) {
      exCount += block.exercises.filter((e) => !!e.exerciseId).length;
    }
    return {
      totalExerciseCount: exCount,
      totalBlockCount: blocks.length,
    };
  }, [blocks]);

  // ── Loading state ─────────────────────────────────────────────────────

  if (isEditing && isLoadingTemplate) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#B9B9B6" />
        </View>
      </GradientBackground>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <GradientBackground>
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
          <View className="flex-1">
            <KickerLabel>COACH TOOLS</KickerLabel>
            <ScreenTitle
              title={isEditing ? "Edit Workout" : "Build Workout"}
            />
          </View>
          <TouchableOpacity
            onPress={handleDiscard}
            className="p-2 min-w-[44px] items-center"
            accessibilityLabel="Discard changes"
          >
            <Text className="text-surface-400 text-base font-medium">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats bar */}
        <View className="flex-row gap-3 px-4 mb-4">
          <View className="flex-1 bg-graphite rounded-xl px-3 py-2 items-center">
            <Text className="text-surface-50 text-lg font-bold">
              {totalBlockCount}
            </Text>
            <Text className="text-surface-500 text-[10px] uppercase tracking-wide">
              Block{totalBlockCount !== 1 ? "s" : ""}
            </Text>
          </View>
          <View className="flex-1 bg-graphite rounded-xl px-3 py-2 items-center">
            <Text className="text-surface-50 text-lg font-bold">
              {totalExerciseCount}
            </Text>
            <Text className="text-surface-500 text-[10px] uppercase tracking-wide">
              Exercise{totalExerciseCount !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Main form */}
        <ScrollView
          className="flex-1 px-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Workout name */}
          <View className="mb-4">
            <Text className="text-surface-400 text-[13px] font-semibold mb-1.5">
              Workout Name *
            </Text>
            <TextInput
              placeholder="e.g. Upper Body Push Day"
              placeholderTextColor="#52525b"
              value={name}
              onChangeText={setName}
              className="bg-card border border-border rounded-xl px-4 py-3.5 text-surface-50 text-[15px] font-medium"
            />
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-surface-400 text-[13px] font-semibold mb-1.5">
              Description (optional)
            </Text>
            <TextInput
              placeholder="Describe this workout..."
              placeholderTextColor="#52525b"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              className="bg-card border border-border rounded-xl px-4 py-3.5 text-surface-50 text-[15px] font-medium min-h-[60px]"
            />
          </View>

          {/* Blocks */}
          <Text className="text-surface-50 text-lg font-extrabold mb-3">
            Blocks
          </Text>

          {blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              blockIndex={index}
              totalBlocks={blocks.length}
              onUpdateBlock={handleUpdateBlock}
              onRemoveBlock={handleRemoveBlock}
              onMoveBlockUp={handleMoveBlockUp}
              onMoveBlockDown={handleMoveBlockDown}
              onAddExercise={handleAddExercise}
              onUpdateExercise={handleUpdateExercise}
              onRemoveExercise={handleRemoveExercise}
            />
          ))}

          {/* Add Block types */}
          <View className="flex-row flex-wrap gap-2 mb-6">
            {(
              ["normal", "warmup", "cooldown", "superset"] as BlockType[]
            ).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => handleAddBlock(type)}
                className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center gap-2 active:opacity-70 flex-1 min-w-[45%]"
                accessibilityLabel={`Add ${BLOCK_TYPE_LABELS[type]} block`}
              >
                <Ionicons
                  name={BLOCK_TYPE_ICONS[type]}
                  size={16}
                  color={BLOCK_TYPE_COLORS[type]}
                />
                <Text className="text-surface-50 text-sm font-medium">
                  + {BLOCK_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action buttons */}
          <View className="gap-3 mb-8">
            <Button
              title={isEditing ? "Update Workout" : "Save Template"}
              variant="primary"
              loading={isSaving}
              onPress={handleSave}
              icon="save-outline"
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={handleDiscard}
            />
          </View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

// ─── Helper: Group template exercises into blocks ───────────────────────

function groupExercisesIntoBlocks(
  exercises: Array<{
    id: string;
    exercise_id: string;
    sort_order: number;
    target_sets: number;
    target_reps: number;
    target_rpe_low: number | null;
    target_rpe_high: number | null;
    rest_seconds: number;
    notes: string | null;
  }>,
): WorkoutBlock[] {
  if (exercises.length === 0) return [];

  // Try to parse notes as block metadata
  const blocks: WorkoutBlock[] = [];
  let currentBlock = createBlock("normal");
  let currentBlockId = `existing-block-${Date.now()}`;

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    let blockMeta: {
      blockName?: string;
      blockType?: BlockType;
      altExercises?: string[];
      sets?: Array<{
        reps: number;
        rpe: number | null;
        weightType: string;
        isWarmup: boolean;
        isAmrap: boolean;
      }>;
    } = {};

    try {
      if (ex.notes) {
        blockMeta = JSON.parse(ex.notes);
      }
    } catch {
      // notes is plain text, not JSON
    }

    // If block type changed, start a new block
    if (blockMeta.blockType && blockMeta.blockType !== currentBlock.type) {
      if (currentBlock.exercises.length > 0) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        id: `existing-${ex.id}-${i}`,
        type: blockMeta.blockType,
        name: blockMeta.blockName ?? "",
        exercises: [],
      };
    }

    const sets =
      blockMeta.sets?.map((s) => ({
        key: `restored-set-${ex.id}-${Math.random()}`,
        reps: s.reps ?? ex.target_reps,
        repsMin: null,
        repsMax: null,
        rpe: s.rpe ?? null,
        weightType: (s.weightType as "absolute" | "percent_1rm" | "rpe_based") ?? "absolute",
        weightValue: null,
        isWarmup: s.isWarmup ?? false,
        isAmrap: s.isAmrap ?? false,
      })) ?? [
        {
          key: `default-set-${ex.id}`,
          reps: ex.target_reps,
          repsMin: null,
          repsMax: null,
          rpe: ex.target_rpe_low ?? null,
          weightType: "absolute" as const,
          weightValue: null,
          isWarmup: false,
          isAmrap: false,
        },
      ];

    // Fill remaining sets if needed
    while (sets.length < ex.target_sets) {
      sets.push({
        key: `fill-set-${ex.id}-${sets.length}`,
        reps: ex.target_reps,
        repsMin: null,
        repsMax: null,
        rpe: null,
        weightType: "absolute" as const,
        weightValue: null,
        isWarmup: false,
        isAmrap: false,
      });
    }

    currentBlock.exercises.push({
      exerciseId: ex.exercise_id,
      exerciseName: "",
      sets,
      restSeconds: ex.rest_seconds,
      notes: "",
      alternativeExerciseIds: blockMeta.altExercises ?? [],
    });
  }

  if (currentBlock.exercises.length > 0) {
    blocks.push(currentBlock);
  }

  return blocks.length > 0 ? blocks : [];
}
