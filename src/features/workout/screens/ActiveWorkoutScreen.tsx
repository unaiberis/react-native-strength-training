import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Card } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { RestTimer } from "../../../shared/ui/RestTimer";
import { RpeSlider } from "../../../shared/ui/RpeSlider";
import { WeightTypeSelector } from "../../../shared/ui/WeightTypeSelector";
import { BlockTimer } from "../components/BlockTimer";
import { AmrapResultInput } from "../components/AmrapResultInput";
import { ExerciseNotes } from "../components/ExerciseNotes";
import { SessionNotes } from "../components/SessionNotes";
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
import { getBlockTypeStrategy } from "../strategies/BlockTypeStrategy";
import { computeTargetFromConfig } from "../../../shared/utils/prescription";

// ─── Set Row ─────────────────────────────────────────────────────────────

function SetRow({
  set,
  isActive,
  showRound = false,
}: {
  set: LoggedSet;
  isActive: boolean;
  showRound?: boolean;
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
      {showRound && (
        <Text className="text-surface-500 text-xs w-10 text-center font-mono">
          R{set.setNumber}
        </Text>
      )}
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
      <Text className="text-surface-500 text-xs w-12 text-right font-mono">
        {set.tempo ?? ""}
      </Text>
    </View>
  );
}

// ─── Set Input Form ──────────────────────────────────────────────────────

interface SetFormState {
  weightKg: string;
  reps: string;
  rpe: number | null;
  rir: string;
  tempo: string;
}

const emptyForm: SetFormState = { weightKg: "", reps: "", rpe: null, rir: "", tempo: "" };

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
    tempo: string | null;
  }) => void;
  onSkip: () => void;
  isLastSet: boolean;
}) {
  const [form, setForm] = useState<SetFormState>(emptyForm);

  const updateField = useCallback(
    (field: "weightKg" | "reps" | "rir" | "tempo", value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleRpeChange = useCallback((rpe: number) => {
    setForm((prev) => ({ ...prev, rpe }));
  }, []);

  const handleLog = useCallback(() => {
    const weightKg = parseFloat(form.weightKg);
    const reps = parseInt(form.reps, 10);
    const rpe = form.rpe;
    const rir = form.rir ? parseInt(form.rir, 10) : null;
    const tempo = form.tempo.trim() || null;

    if (isNaN(weightKg) || weightKg < 0) {
      Alert.alert("Validation", "Enter a valid weight.");
      return;
    }
    if (isNaN(reps) || reps < 1) {
      Alert.alert("Validation", "Reps must be at least 1.");
      return;
    }
    if (rir != null && (rir < 0 || rir > 10)) {
      Alert.alert("Validation", "RIR must be between 0 and 10.");
      return;
    }
    if (tempo != null && !/^\d{3,4}$/.test(tempo)) {
      Alert.alert("Validation", "Tempo must be 3 or 4 digits (e.g. 2020).");
      return;
    }

    onLog({ weightKg, reps, rpe, rir, tempo });
    setForm(emptyForm);
  }, [form, onLog]);

  const weightRef = useRef<TextInput>(null);
  useEffect(() => {
    weightRef.current?.focus();
  }, []);

  return (
    <View className="gap-3 mt-3">
      {/* Weight, Reps, Tempo row */}
      <Card>
        <Text className="text-surface-100 text-sm font-semibold mb-3">
          Set #{setNumber}
        </Text>

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
          <View className="flex-1">
            <Text className="text-surface-400 text-xs mb-1">Tempo</Text>
            <TextInput
              keyboardType="number-pad"
              placeholder="2020"
              placeholderTextColor="#52525b"
              value={form.tempo}
              onChangeText={(v) => updateField("tempo", v)}
              className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-surface-100 text-sm"
            />
          </View>
        </View>

        <View className="mb-3">
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
      </Card>

      {/* RPE Slider */}
      <Card>
        <RpeSlider
          value={form.rpe}
          onChange={handleRpeChange}
        />
      </Card>

      {/* Action buttons */}
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
    </View>
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
  const updateExerciseNotes = useSessionStore((s) => s.updateExerciseNotes);
  const updateSessionNotes = useSessionStore((s) => s.updateSessionNotes);
  const sessionNotes = useSessionStore((s) => s.sessionNotes);

  const createSession = useCreateSession();
  const logSetMutation = useLogSet();
  const completeMutation = useCompleteSession();
  const cancelMutation = useCancelSession();

  const currentExercise = useCurrentExercise();
  const isCurrentComplete = useIsCurrentExerciseComplete();

  const [isAdvancing, setIsAdvancing] = useState(false);

  // ─── Block type state ──────────────────────────────────────────────────

  const blockType = useSessionStore((s) => s.blockType);
  const prescription = useSessionStore((s) => s.prescription);
  const timerMinutes = useSessionStore((s) => s.timerMinutes);

  const blockStrategy = getBlockTypeStrategy(blockType);
  const isTimedBlock = blockType === "amrap" || blockType === "emom";

  const [blockTimerPaused, setBlockTimerPaused] = useState(false);
  const [amrapDone, setAmrapDone] = useState(false);
  const [amrapRounds, setAmrapRounds] = useState(0);
  const [amrapPartialReps, setAmrapPartialReps] = useState(0);

  // Prescription display
  const prescriptionResult = prescription
    ? computeTargetFromConfig(prescription, {})
    : null;

  // Reset AMRAP state when exercise changes
  useEffect(() => {
    setAmrapDone(false);
    setAmrapRounds(0);
    setAmrapPartialReps(0);
    setBlockTimerPaused(false);
  }, [currentExercise?.exerciseId]);

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
      tempo: string | null;
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
          tempo: data.tempo,
        });

        // Haptic feedback on successful set log
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }

        // Auto-start rest timer for straight sets (timed blocks handle their own pacing)
        if (!isTimedBlock) {
          const setsAfter = currentExercise.loggedSets.length + 1;
          if (setsAfter < currentExercise.targetSets) {
            startRest(currentExercise.restSeconds);
          }
        }
      } catch (err) {
        // Haptic feedback on error
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }
        Alert.alert("Error", (err as Error).message ?? "Failed to log set");
      }
    },
    [currentExercise, activeSessionId, logSetMutation, startRest, isTimedBlock],
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
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
              }
              await cancelMutation.mutateAsync();
              router.back();
            } catch (err) {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
              }
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

  // ─── Handle AMRAP time up ───────────────────────────────────────────────

  const handleAmrapTimeUp = useCallback(() => {
    setBlockTimerPaused(true);
    setAmrapDone(true);
  }, []);

  // ─── Handle AMRAP result submission ────────────────────────────────────

  const handleAmrapSubmitResult = useCallback(() => {
    // Store the AMRAP result and close the input
    setAmrapDone(false);
  }, []);

  // ─── Loading state (session being created) ─────────────────────────────

  if (createSession.isPending || (!activeSessionId && !createSession.isError)) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#A4A4A8" />
        <Text className="text-surface-400 text-sm mt-4">
          Starting workout...
        </Text>
        </View>
      </GradientBackground>
    );
  }

  if (createSession.isError) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center px-6">
        <View className="mb-4">
          <Ionicons name="warning-outline" size={48} color="#B9B9B6" />
        </View>
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
      </GradientBackground>
    );
  }

  // ─── Empty state (blank workout, no exercises) ─────────────────────────

  if (exercises.length === 0) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center px-6">
        <View className="mb-4">
          <Ionicons name="fitness-outline" size={48} color="#B9B9B6" />
        </View>
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
      </GradientBackground>
    );
  }

  if (!currentExercise) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#A4A4A8" />
        </View>
      </GradientBackground>
    );
  }

  // ─── Main workout UI ───────────────────────────────────────────────────

  const nextSetNumber = currentExercise.loggedSets.length + 1;
  const isExerciseComplete = nextSetNumber > currentExercise.targetSets;

  return (
    <GradientBackground>
    <View className="flex-1">
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
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-surface-50 text-xl font-bold flex-1" numberOfLines={2}>
            {currentExercise.exerciseName}
          </Text>
          {blockType !== "straight_set" && (
            <View className="bg-brand-500/20 rounded-full px-2.5 py-0.5">
              <Text className="text-brand-400 text-xs font-bold uppercase">{blockType}</Text>
            </View>
          )}
        </View>
        <Text className="text-surface-400 text-sm mt-1">
          Target: {currentExercise.targetSets} × {currentExercise.targetReps}{" "}
          reps
          {currentExercise.targetRpeHigh != null
            ? ` @ RPE ${currentExercise.targetRpeLow ?? ""}–${currentExercise.targetRpeHigh}`
            : ""}
        </Text>
      </View>

      {/* Exercise notes */}
      <View className="px-4 pb-2">
        <ExerciseNotes
          exerciseId={currentExercise.exerciseId}
          exerciseName={currentExercise.exerciseName}
          notes={currentExercise.notes}
          onNotesChange={updateExerciseNotes}
        />
      </View>

      {/* Block timer for AMRAP/EMOM */}
      {isTimedBlock && timerMinutes > 0 && (
        <View className="px-1 mb-1">
          <BlockTimer
            blockType={blockType}
            minutes={timerMinutes}
            paused={blockTimerPaused}
            onTimeUp={handleAmrapTimeUp}
          />
        </View>
      )}

      {/* Prescription display */}
      {prescriptionResult && prescriptionResult.targetKg > 0 && (
        <View className="px-4 mb-2">
          <WeightTypeSelector
            weightType={prescription?.type ?? null}
            targetKg={prescriptionResult.targetKg}
            label={prescriptionResult.label}
            warning={prescriptionResult.warning}
            showLabel={true}
          />
        </View>
      )}

      {/* AMRAP result input (after timer runs out) */}
      {blockType === "amrap" && amrapDone && (
        <View className="px-4 mb-2">
          <AmrapResultInput
            rounds={amrapRounds}
            partialReps={amrapPartialReps}
            onRoundsChange={setAmrapRounds}
            onPartialRepsChange={setAmrapPartialReps}
          />
        </View>
      )}

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
            {blockType !== "straight_set" && (
              <Text className="text-surface-500 text-xs font-semibold w-10 text-center">
                Rd
              </Text>
            )}
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
            <Text className="text-surface-500 text-xs font-semibold w-12 text-right">
              Tempo
            </Text>
          </View>
        )}

        {currentExercise.loggedSets.map((set, index) => (
          <SetRow
            key={`set-${set.setNumber}`}
            set={set}
            isActive={index === currentExercise.loggedSets.length - 1}
            showRound={blockType !== "straight_set"}
          />
        ))}

        {/* Set input form (always available for timed blocks) */}
        {isTimedBlock && (
          <SetInputForm
            setNumber={nextSetNumber}
            targetReps={currentExercise.targetReps}
            targetRpeLow={currentExercise.targetRpeLow}
            targetRpeHigh={currentExercise.targetRpeHigh}
            onLog={handleLogSet}
            onSkip={handleSkipExercise}
            isLastSet={false}
          />
        )}

        {/* Set input form (standard for straight sets) */}
        {!isTimedBlock && !isExerciseComplete && (
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

        {/* Exercise complete state (for straight sets only) */}
        {!isTimedBlock && isExerciseComplete && (
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

        {/* Session Notes */}
        <View className="mb-4">
          <SessionNotes
            sessionId={activeSessionId ?? ""}
            notes={sessionNotes}
            onNotesChange={updateSessionNotes}
          />
        </View>

        {/* Bottom spacer */}
        <View className="h-8" />
      </ScrollView>

      {/* Rest timer overlay */}
      <RestTimer />
    </View>
    </GradientBackground>
  );
}
