import { View, Text, ScrollView } from "react-native";
import { Button } from "../../../shared/ui/Button";
import { Badge } from "../../../shared/ui/Badge";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface WorkoutBlock {
  id: string;
  name: string;
  type: "straight_set" | "amrap" | "emom" | "circuit";
  exercises: WorkoutBlockExercise[];
}

export interface WorkoutBlockExercise {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  prescription?: string; // e.g. "70% 1RM", "RPE 8", "Bodyweight"
  notes?: string;
}

export interface WorkoutPreviewData {
  id: string;
  name: string;
  description?: string;
  blocks: WorkoutBlock[];
}

interface WorkoutPreviewProps {
  workout: WorkoutPreviewData;
  onStartWorkout?: () => void;
  className?: string;
}

// ─── Block Type Labels ──────────────────────────────────────────────────────

const blockTypeLabels: Record<WorkoutBlock["type"], string> = {
  straight_set: "Straight Set",
  amrap: "AMRAP",
  emom: "EMOM",
  circuit: "Circuit",
};

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Read-only preview of a workout template.
 * Shows blocks, exercises with sets/reps/prescription, and a "Start Workout" button.
 */
export function WorkoutPreview({
  workout,
  onStartWorkout,
  className,
}: WorkoutPreviewProps) {
  return (
    <ScrollView className={`flex-1 ${className ?? ""}`}>
      {/* Workout description */}
      {workout.description ? (
        <Text className="text-surface-400 text-sm mb-6 leading-5">
          {workout.description}
        </Text>
      ) : null}

      {/* Blocks */}
      {workout.blocks.map((block, blockIdx) => (
        <View key={block.id} className="mb-6">
          {/* Block header */}
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-1 h-6 rounded-full bg-titanium" />
            <View className="flex-1">
              <Text className="text-surface-50 text-base font-bold">
                {block.name}
              </Text>
              <Badge
                label={blockTypeLabels[block.type]}
                variant="default"
              />
            </View>
          </View>

          {/* Exercises */}
          {block.exercises.map((exercise, exIdx) => (
            <View
              key={exercise.id}
              className="bg-cardSoft rounded-xl p-4 mb-2 border border-border"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 rounded-full bg-graphite items-center justify-center">
                    <Text className="text-surface-400 text-xs font-bold">
                      {blockIdx * 100 + exIdx + 1}
                    </Text>
                  </View>
                  <Text className="text-surface-100 text-sm font-semibold">
                    {exercise.name}
                  </Text>
                </View>
              </View>

              {/* Prescription row */}
              <View className="flex-row items-center gap-3 ml-8">
                <View className="flex-row items-center gap-1">
                  <Text className="text-surface-400 text-xs font-medium">
                    Sets
                  </Text>
                  <Text className="text-surface-50 text-sm font-bold">
                    {exercise.targetSets}
                  </Text>
                </View>
                <View className="w-px h-3 bg-border" />
                <View className="flex-row items-center gap-1">
                  <Text className="text-surface-400 text-xs font-medium">
                    Reps
                  </Text>
                  <Text className="text-surface-50 text-sm font-bold">
                    {exercise.targetReps}
                  </Text>
                </View>
                {exercise.restSeconds > 0 && (
                  <>
                    <View className="w-px h-3 bg-border" />
                    <View className="flex-row items-center gap-1">
                      <Text className="text-surface-400 text-xs font-medium">
                        Rest
                      </Text>
                      <Text className="text-surface-50 text-sm font-bold">
                        {formatRest(exercise.restSeconds)}
                      </Text>
                    </View>
                  </>
                )}
                {exercise.prescription && (
                  <>
                    <View className="w-px h-3 bg-border" />
                    <Text className="text-titanium text-xs font-bold">
                      {exercise.prescription}
                    </Text>
                  </>
                )}
              </View>

              {/* Notes */}
              {exercise.notes ? (
                <Text className="text-surface-500 text-xs mt-2 ml-8 italic">
                  {exercise.notes}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ))}

      {/* Start Workout Button */}
      {onStartWorkout && (
        <View className="px-0 pt-2 pb-8">
          <Button
            title="Start Workout"
            variant="primary"
            icon="play-outline"
            onPress={onStartWorkout}
          />
        </View>
      )}
    </ScrollView>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format rest seconds to a human-readable string (e.g., "90s" or "2:00").
 */
function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min}:${sec.toString().padStart(2, "0")}` : `${min}m`;
}
