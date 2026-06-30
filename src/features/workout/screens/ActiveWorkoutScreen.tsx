import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Card } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import { RestTimer } from "../../../shared/ui/RestTimer";
import {
  useSessionStore,
  type LoggedSet,
} from "../../../stores/session-store";
import {
  useCreateSession,
  useLogSet,
  useCompleteSession,
  useCancelSession,
  useCurrentExercise,
  useIsCurrentExerciseComplete,
} from "../hooks/useWorkoutSession";

// ─── Set Row ─────────────────────────────────────────────────────────────

function SetRow({
  set,
  isActive,
}: {
  set: LoggedSet;
  isActive: boolean;
}) {
  return (
    <View
      className={`flex-row items-center py-2.5 px-3 rounded-lg mb-1 ${
        isActive ? "bg-surface-800" : "bg-surface-900"
      }`}
    >
      <Text className="text-surface-400 text-sm font-mono w-8">
        #{set.setNumber}
      </Text>
      <Text className="text-surface-100 text-sm flex-1 text-center">
        {set.weightKg} kg
      </Text>
      <Text className="text-surface-100 text-sm flex-1 text-center">
        × {set.reps}
      </Text>
      <Text className="text-surface-400 text-sm flex-1 text-center">
        {set.rpe != null ? `RPE ${set.rpe}` : "—"}
      </Text>
      <Text className="text-surface-500 text-xs flex-1 text-center">
        {set.rir != null ? `${set.rir} RIR` : ""}
      </Text>
    </View>
  );
}

// ─── Set Input Form ──────────────────────────────────────────────────────

interface SetFormState {
  weightKg: string;
  reps: string;
  rpe: string;
  rir: string;
}

const emptyForm: SetFormState = { weightKg: "", reps: "", rpe: "", rir: "" };

function SetInputForm({
  setNumber,
  targetReps,
  targetRpeLow,
  targetRpeHigh,
  onLog,
  onSkip,
  isLastSet,
}: {
  setNumber: number;
  targetReps: number;
  targetRpeLow: number | null;
  targetRpeHigh: number | null;
  onLog: (data: {
    weightKg: number;
    reps: number;
    rpe: number | null;
    rir: number | null;
  }) => void;
  onSkip: () => void;
  isLastSet: boolean;
}) {
  const [form, setForm] = useState<SetFormState>(emptyForm);

  const updateField = useCallback(
    (field: keyof SetFormState, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleLog = useCallback(() => {
    const weightKg = parseFloat(form.weightKg);
    const reps = parseInt(form.reps, 10);
    const rpe = form.rpe ? parseFloat(form.rpe) : null;
    const rir = form.rir ? parseInt(form.rir, 10) : null;

    if (isNaN(weightKg) || weightKg < 0) {
      Alert.alert("Validation", "Enter a valid weight.");
      return;
    }
    if (isNaN(reps) || reps < 1) {
      Alert.alert("Validation", "Reps must be at least 1.");
      return;
    }
    if (rpe != null && (rpe < 1 || rpe > 10)) {
      Alert.alert("Validation", "RPE must be between 1 and 10.");
      return;
    }
    if (rpe != null && rpe % 0.5 !== 0) {
      Alert.alert("Validation", "RPE must be in 0.5 increments.");
      return;
    }
    if (rir != null && (rir < 0 || rir > 10)) {
      Alert.alert("Validation", "RIR must be between 0 and 10.");
      return;
    }

    onLog({ weightKg, reps, rpe, rir });
    setForm(emptyForm);
  }, [form, onLog]);

  const weightRef = useRef<TextInput>(null);
  useEffect(() => {
    weightRef.current?.focus();
  }, []);

  const rpeHint =
    targetRpeLow != null || targetRpeHigh != null
      ? `Target RPE ${targetRpeLow ?? "?"}–${targetRpeHigh ?? "?"}`
      : null;

  return (
    <Card className="mt-3">
      <Text className="text-surface-100 text-sm font-semibold mb-3">
        Set #{setNumber}
      </Text>

      {rpeHint && (
        <Text className="text-surface-500 text-xs mb-3">{rpeHint}</Text>
      )}

      <View className="flex-row gap-3 mb-3">
        <View className="flex-1">
          <Text className="text-surface-400 text-xs mb-1">Weight (kg)</Text>
          <TextInput
            ref={weightRef}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#52525b"
            value={form.weightKg}
            onChangeText={(v) => updateField("weightKg", v)}
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-surface-100 text-sm"
          />
        </View>
        <View className="flex-1">
          <Text className="text-surface-400 text-xs mb-1">Reps</Text>
          <TextInput
            keyboardType="number-pad"
            placeholder={String(targetReps)}
            placeholderTextColor="#52525b"
            value={form.reps}
            onChangeText={(v) => updateField("reps", v)}
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-surface-100 text-sm"
          />
        </View>
      </View>

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <Text className="text-surface-400 text-xs mb-1">RPE (1–10)</Text>
          <TextInput
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor="#52525b"
            value={form.rpe}
            onChangeText={(v) => updateField("rpe", v)}
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-surface-100 text-sm"
          />
        </View>
        <View className="flex-1">
          <Text className="text-surface-400 text-xs mb-1">RIR (0–5)</Text>
          <TextInput
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor="#52525b"
            value={form.rir}
            onChangeText={(v) => updateField("rir", v)}
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-surface-100 text-sm"
          />
        </View>
      </View>

      <View className="flex-row gap-3">
        <Button
          title="Log Set"
          variant="primary"
          className="flex-1"
          onPress={handleLog}
        />
        {isLastSet && (
          <Button title="Skip" variant="ghost" onPress={onSkip} />
        )}
      </View>
    </Card>
  );
}

// ─── Active Workout Screen ───────────────────────────────────────────────

export function ActiveWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    templateId?: string;
  }>();

  const store = useSessionStore();
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const exercises = useSessionStore((s) => s.exercises);
  const currentIndex = useSessionStore((s) => s.currentExerciseIndex);
  const setCurrentExerciseIndex = useSessionStore(
    (s) => s.setCurrentExerciseIndex,
  );
  const startRest = useSessionStore((s) => s.startRest);

  const createSession = useCreateSession();
  const logSetMutation = useLogSet();
  const completeMutation = useCompleteSession();
  const cancelMutation = useCancelSession();

  const currentExercise = useCurrentExercise();
  const isCurrentComplete = useIsCurrentExerciseComplete();

  const [isAdvancing, setIsAdvancing] = useState(false);

  // ─── Auto-create session on initial mount ──────────────────────────────

  useEffect(() => {
    if (!activeSessionId && !createSession.isPending && !createSession.isSuccess) {
      if (params.mode === "routine" && params.templateId) {
        createSession.mutate({ workoutTemplateId: params.templateId });
      } else {
        createSession.mutate({});
      }
    }
  }, []); // only on mount

  // ─── Handle log set ────────────────────────────────────────────────────

  const handleLogSet = useCallback(
    async (data: {
      weightKg: number;
      reps: number;
      rpe: number | null;
      rir: number | null;
    }) => {
      if (!currentExercise || !activeSessionId) return;

      try {
        await logSetMutation.mutateAsync({
          exerciseId: currentExercise.exerciseId,
          setNumber: currentExercise.loggedSets.length + 1,
          weightKg: data.weightKg,
          reps: data.reps,
          rpe: data.rpe,
          rir: data.rir,
          isWarmup: false,
        });

        // Auto-start rest timer only if sets remain
        const setsAfter = currentExercise.loggedSets.length + 1;
        if (setsAfter < currentExercise.targetSets) {
          startRest(currentExercise.restSeconds);
        }
      } catch (err) {
        Alert.alert("Error", (err as Error).message ?? "Failed to log set");
      }
    },
    [currentExercise, activeSessionId, logSetMutation, startRest],
  );

  // ─── Advance to next exercise ──────────────────────────────────────────

  const handleAdvance = useCallback(() => {
    if (currentIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentIndex + 1);
    }
  }, [currentIndex, exercises.length, setCurrentExerciseIndex]);

  // ─── Handle skip (with confirmation) ───────────────────────────────────

  const isLastExercise = currentIndex >= exercises.length - 1;
  const nextExerciseName = isLastExercise
    ? undefined
    : exercises[currentIndex + 1]?.exerciseName;

  const handleSkipExercise = useCallback(() => {
    if (!isLastExercise && nextExerciseName) {
      Alert.alert(
        "Skip Exercise",
        "This exercise will remain incomplete.",
        [
          { text: "Stay", style: "cancel" },
          {
            text: `Skip to ${nextExerciseName}`,
            onPress: handleAdvance,
          },
        ],
      );
    } else if (isLastExercise) {
      // On last exercise, skip means finish
      handleFinish();
    } else {
      handleAdvance();
    }
  }, [isLastExercise, nextExerciseName, handleAdvance]);

  // ─── Finish / Complete ────────────────────────────────────────────────

  const handleFinish = useCallback(() => {
    Alert.alert("Finish Workout", "Mark this workout as complete?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          try {
            await completeMutation.mutateAsync({});
            // Store is intentionally NOT cleared here — the WorkoutCompleteScreen
            // reads exercise/set data from it. It clears itself on navigation away.
            router.replace("/(workout)/active?completed=true");
          } catch (err) {
            Alert.alert(
              "Error",
              (err as Error).message ?? "Failed to complete workout",
            );
          }
        },
      },
    ]);
  }, [completeMutation, exercises, router]);

  // ─── Cancel ────────────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    Alert.alert(
      "Cancel Workout",
      "Are you sure? This workout will be marked as cancelled.",
      [
        { text: "Keep Going", style: "cancel" },
        {
          text: "Cancel Workout",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelMutation.mutateAsync();
              router.back();
            } catch (err) {
              Alert.alert(
                "Error",
                (err as Error).message ?? "Failed to cancel workout",
              );
            }
          },
        },
      ],
    );
  }, [cancelMutation, router]);

  // ─── Loading state (session being created) ─────────────────────────────

  if (createSession.isPending || (!activeSessionId && !createSession.isError)) {
    return (
      <View className="flex-1 bg-surface-950 items-center justify-center">
        <ActivityIndicator size="large" color="#22c55e" />
        <Text className="text-surface-400 text-sm mt-4">
          Starting workout...
        </Text>
      </View>
    );
  }

  if (createSession.isError) {
    return (
      <View className="flex-1 bg-surface-950 items-center justify-center px-6">
        <Text className="text-4xl mb-4">⚠️</Text>
        <Text className="text-surface-100 text-lg font-semibold mb-2">
          Could not start workout
        </Text>
        <Text className="text-surface-400 text-center mb-6">
          {(createSession.error as Error)?.message ?? "An error occurred"}
        </Text>
        <Button
          title="Go Back"
          variant="primary"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  // ─── Empty state (blank workout, no exercises) ─────────────────────────

  if (exercises.length === 0) {
    return (
      <View className="flex-1 bg-surface-950 items-center justify-center px-6">
        <Text className="text-5xl mb-4">🏋️</Text>
        <Text className="text-surface-100 text-lg font-semibold mb-2">
          Workout Started
        </Text>
        <Text className="text-surface-400 text-center mb-6">
          This is a blank workout. Log sets for exercises as you go, or finish
          when done.
        </Text>

        {createSession.isSuccess && (
          <Card className="w-full mb-4">
            <Text className="text-surface-400 text-center py-2">
              ✓ Session created — ready to log sets
            </Text>
          </Card>
        )}

        <View className="flex-row gap-3">
          <Button
            title="Finish Workout"
            variant="primary"
            onPress={handleFinish}
          />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={handleCancel}
          />
        </View>
      </View>
    );
  }

  if (!currentExercise) {
    return (
      <View className="flex-1 bg-surface-950 items-center justify-center">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  // ─── Main workout UI ───────────────────────────────────────────────────

  const nextSetNumber = currentExercise.loggedSets.length + 1;
  const isExerciseComplete = nextSetNumber > currentExercise.targetSets;

  return (
    <View className="flex-1 bg-surface-950">
      {/* Top bar */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-2 bg-surface-950/90">
        <TouchableOpacity onPress={handleCancel} className="p-2 -ml-2">
          <Text className="text-surface-400 text-sm">Cancel</Text>
        </TouchableOpacity>

        <Text className="text-surface-500 text-xs">
          Exercise {currentIndex + 1} of {exercises.length}
        </Text>

        <TouchableOpacity onPress={handleFinish} className="p-2 -mr-2">
          <Text className="text-brand-500 text-sm font-medium">Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise navigation dots */}
      {exercises.length > 1 && (
        <View className="flex-row justify-center gap-1.5 px-4 pb-2">
          {exercises.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setCurrentExerciseIndex(idx)}
              className={`w-2 h-2 rounded-full ${
                idx === currentIndex
                  ? "bg-brand-500"
                  : exercises[idx].loggedSets.length > 0
                    ? "bg-surface-500"
                    : "bg-surface-700"
              }`}
            />
          ))}
        </View>
      )}

      {/* Exercise header */}
      <View className="px-4 pb-2">
        <Text className="text-surface-50 text-xl font-bold" numberOfLines={2}>
          {currentExercise.exerciseName}
        </Text>
        <Text className="text-surface-400 text-sm mt-1">
          Target: {currentExercise.targetSets} × {currentExercise.targetReps}{" "}
          reps
          {currentExercise.targetRpeHigh != null
            ? ` @ RPE ${currentExercise.targetRpeLow ?? ""}–${currentExercise.targetRpeHigh}`
            : ""}
        </Text>
      </View>

      {/* Sets list + input */}
      <ScrollView
        className="flex-1 px-4"
        keyboardShouldPersistTaps="handled"
      >
        {/* Column headers */}
        {currentExercise.loggedSets.length > 0 && (
          <View className="flex-row py-1 px-3 mb-1">
            <Text className="text-surface-500 text-xs font-semibold w-8">
              Set
            </Text>
            <Text className="text-surface-500 text-xs font-semibold flex-1 text-center">
              Weight
            </Text>
            <Text className="text-surface-500 text-xs font-semibold flex-1 text-center">
              Reps
            </Text>
            <Text className="text-surface-500 text-xs font-semibold flex-1 text-center">
              RPE
            </Text>
            <Text className="text-surface-500 text-xs font-semibold flex-1 text-center">
              RIR
            </Text>
          </View>
        )}

        {currentExercise.loggedSets.map((set, index) => (
          <SetRow
            key={`set-${set.setNumber}`}
            set={set}
            isActive={index === currentExercise.loggedSets.length - 1}
          />
        ))}

        {/* Set input form */}
        {!isExerciseComplete && (
          <SetInputForm
            setNumber={nextSetNumber}
            targetReps={currentExercise.targetReps}
            targetRpeLow={currentExercise.targetRpeLow}
            targetRpeHigh={currentExercise.targetRpeHigh}
            onLog={handleLogSet}
            onSkip={handleSkipExercise}
            isLastSet={nextSetNumber === currentExercise.targetSets}
          />
        )}

        {/* Exercise complete state */}
        {isExerciseComplete && (
          <View className="mt-4 mb-8 gap-3">
            <Card>
              <Text className="text-surface-400 text-center py-2">
                ✓ All {currentExercise.targetSets} sets logged
              </Text>
            </Card>

            {!isLastExercise && (
              <Button
                title={`Next: ${nextExerciseName ?? "Next Exercise"}`}
                variant="primary"
                onPress={handleAdvance}
              />
            )}

            {isLastExercise && (
              <Button
                title="Finish Workout"
                variant="primary"
                onPress={handleFinish}
              />
            )}
          </View>
        )}

        {/* Bottom spacer */}
        <View className="h-8" />
      </ScrollView>

      {/* Rest timer overlay */}
      <RestTimer />
    </View>
  );
}
