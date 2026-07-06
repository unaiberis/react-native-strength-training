import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useLingui } from "@lingui/react/macro";
import { Trans } from "@lingui/react/macro";
import { Card } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { RestTimer } from "../../../shared/ui/RestTimer";
import { BlockTimer } from "../../../shared/ui/BlockTimer";
import { RpeSlider } from "../../../shared/ui/RpeSlider";
import { WeightTypeSelector } from "../../../shared/ui/WeightTypeSelector";
import { AmrapResultInput } from "../../../shared/ui/AmrapResultInput";
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
import {
  getStrategyForExercise,
  formatTimerLabel,
  getTimerDurationSeconds,
} from "../strategies/BlockTypeStrategy";
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
          R{set.round ?? "—"}
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
  const { t } = useLingui();
  const [form, setForm] = useState<SetFormState>(emptyForm);

  const updateField = useCallback(
    (field: "weightKg" | "reps" | "rir" | "tempo", value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleRpeChange = useCallback((rpe: number | null) => {
    setForm((prev) => ({ ...prev, rpe }));
  }, []);

  const handleLog = useCallback(() => {
    const weightKg = parseFloat(form.weightKg);
    const reps = parseInt(form.reps, 10);
    const rpe = form.rpe;
    const rir = form.rir ? parseInt(form.rir, 10) : null;
    const tempo = form.tempo.trim() || null;

    if (isNaN(weightKg) || weightKg < 0) {
      Alert.alert(t`Validation`, t`Enter a valid weight.`);
      return;
    }
    if (isNaN(reps) || reps < 1) {
      Alert.alert(t`Validation`, t`Reps must be at least 1.`);
      return;
    }
    if (rir != null && (rir < 0 || rir > 10)) {
      Alert.alert(t`Validation`, t`RIR must be between 0 and 10.`);
      return;
    }
    if (tempo != null && !/^\d{3,4}$/.test(tempo)) {
      Alert.alert(t`Validation`, t`Tempo must be 3 or 4 digits (e.g. 2020).`);
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
    <View className="gap-4">
      {/* Weight and Reps row */}
      <Card>
        <Text className="text-surface-100 text-sm font-semibold mb-3">
          <Trans>Set #{setNumber}</Trans>
        </Text>

        <View className="flex-row gap-3 mb-3">
          <View className="flex-1">
            <Text className="text-surface-400 text-xs mb-1"><Trans>Weight (kg)</Trans></Text>
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
            <Text className="text-surface-400 text-xs mb-1"><Trans>Reps</Trans></Text>
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
            <Text className="text-surface-400 text-xs mb-1"><Trans>Tempo</Trans></Text>
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
          <Text className="text-surface-400 text-xs mb-1"><Trans>RIR (0–5)</Trans></Text>
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
          targetLow={targetRpeLow}
          targetHigh={targetRpeHigh}
        />
      </Card>

      {/* Action buttons */}
      <View className="flex-row gap-3">
        <Button
          title={t`Log Set`}
          variant="primary"
          className="flex-1"
          onPress={handleLog}
        />
        {isLastSet && (
          <Button title={t`Skip`} variant="ghost" onPress={onSkip} />
        )}
      </View>
    </View>
  );
}

// ─── Active Workout Screen ───────────────────────────────────────────────

export function ActiveWorkoutScreen() {
  const { t } = useLingui();
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
  const [blockTimerRunning, setBlockTimerRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [amrapDone, setAmrapDone] = useState(false);
  const [amrapResult, setAmrapResult] = useState<{ rounds: number; partialReps: number } | null>(null);

  // ─── Block strategy and prescription for current exercise ──────────────

  const strategy = getStrategyForExercise(currentExercise);
  const timerLabel = currentExercise
    ? formatTimerLabel(strategy, currentExercise)
    : "";
  const timerDuration = currentExercise
    ? getTimerDurationSeconds(currentExercise)
    : null;

  const prescriptionResult = currentExercise?.prescription
    ? computeTargetFromConfig(currentExercise.prescription, {
        userBWKg: undefined, // Would come from user profile in production
        exercise1RMKg: null,
      })
    : null;

  // Start block timer for AMRAP/EMOM when current exercise loads
  useEffect(() => {
    if (currentExercise && strategy.hasTimer && timerDuration) {
      setBlockTimerRunning(true);
      setCurrentRound(1);
      setAmrapDone(false);
      setAmrapResult(null);
    }
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
          round: strategy.showRoundCounter ? currentRound : undefined,
          timerRemaining: strategy.showTimerRemaining && timerDuration ? timerDuration : undefined,
        });

        // Auto-start rest timer for straight sets (block-type exercises handle their own pacing)
        if (!strategy.hasTimer) {
          const setsAfter = currentExercise.loggedSets.length + 1;
          if (setsAfter < currentExercise.targetSets) {
            startRest(currentExercise.restSeconds);
          }
        }
      } catch (err) {
        Alert.alert(t`Error`, (err as Error).message ?? t`Failed to log set`);
      }
    },
    [currentExercise, activeSessionId, logSetMutation, startRest, strategy, currentRound, timerDuration],
  );

  // ─── Handle AMRAP time up ──────────────────────────────────────────────

  const handleAmrapTimeUp = useCallback(() => {
    setBlockTimerRunning(false);
    setAmrapDone(true);
  }, []);

  // ─── Handle AMRAP result submission ────────────────────────────────────

  const handleAmrapResult = useCallback(
    (result: { rounds: number; partialReps: number }) => {
      setAmrapResult(result);
      setAmrapDone(false);
      // The result is stored for summary; in production it would be persisted
    },
    [],
  );

  // ─── Handle EMOM interval tick ─────────────────────────────────────────

  const handleIntervalTick = useCallback(
    (round: number) => {
      setCurrentRound(round);
    },
    [],
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
        t`Skip Exercise`,
        t`This exercise will remain incomplete.`,
        [
          { text: t`Stay`, style: "cancel" },
          {
            text: t`Skip to ${nextExerciseName}`,
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
    Alert.alert(t`Finish Workout`, t`Mark this workout as complete?`, [
      { text: t`Cancel`, style: "cancel" },
      {
        text: t`Complete`,
        onPress: async () => {
          try {
            await completeMutation.mutateAsync({});
            // Store is intentionally NOT cleared here — the WorkoutCompleteScreen
            // reads exercise/set data from it. It clears itself on navigation away.
            router.replace("/(workout)/active?completed=true");
          } catch (err) {
            Alert.alert(
              t`Error`,
              (err as Error).message ?? t`Failed to complete workout`,
            );
          }
        },
      },
    ]);
  }, [completeMutation, exercises, router, t]);

  // ─── Cancel ────────────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    Alert.alert(
      t`Cancel Workout`,
      t`Are you sure? This workout will be marked as cancelled.`,
      [
        { text: t`Keep Going`, style: "cancel" },
        {
          text: t`Cancel Workout`,
          style: "destructive",
          onPress: async () => {
            try {
              await cancelMutation.mutateAsync();
              router.back();
            } catch (err) {
              Alert.alert(
                t`Error`,
                (err as Error).message ?? t`Failed to cancel workout`,
              );
            }
          },
        },
      ],
    );
  }, [cancelMutation, router, t]);

  // ─── Loading state (session being created) ─────────────────────────────

  if (createSession.isPending || (!activeSessionId && !createSession.isError)) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#A4A4A8" />
        <Text className="text-surface-400 text-sm mt-4">
          <Trans>Starting workout...</Trans>
        </Text>
        </View>
      </GradientBackground>
    );
  }

  if (createSession.isError) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center px-6">
        <Text className="text-4xl mb-4">⚠️</Text>
        <Text className="text-surface-100 text-lg font-semibold mb-2">
          <Trans>Could not start workout</Trans>
        </Text>
        <Text className="text-surface-400 text-center mb-6">
          {(createSession.error as Error)?.message ?? <Trans>An error occurred</Trans>}
        </Text>
        <Button
          title={t`Go Back`}
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
        <Text className="text-5xl mb-4">🏋️</Text>
        <Text className="text-surface-100 text-lg font-semibold mb-2">
          <Trans>Workout Started</Trans>
        </Text>
        <Text className="text-surface-400 text-center mb-6">
          <Trans>This is a blank workout. Log sets for exercises as you go, or finish
          when done.</Trans>
        </Text>

        {createSession.isSuccess && (
          <Card className="w-full mb-4">
            <Text className="text-surface-400 text-center py-2">
              <Trans>✓ Session created — ready to log sets</Trans>
            </Text>
          </Card>
        )}

        <View className="flex-row gap-3">
          <Button
            title={t`Finish Workout`}
            variant="primary"
            onPress={handleFinish}
          />
          <Button
            title={t`Cancel`}
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
          <Text className="text-surface-400 text-sm"><Trans>Cancel</Trans></Text>
        </TouchableOpacity>

        <Text className="text-surface-500 text-xs">
          <Trans>Exercise {currentIndex + 1} of {exercises.length}</Trans>
        </Text>

        <TouchableOpacity onPress={handleFinish} className="p-2 -mr-2">
          <Text className="text-brand-500 text-sm font-medium"><Trans>Finish</Trans></Text>
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
          {strategy.blockType !== "straight_set" && (
            <View className="bg-brand-500/20 rounded-full px-2.5 py-0.5">
              <Text className="text-brand-400 text-xs font-bold">{strategy.displayName}</Text>
            </View>
          )}
        </View>
        <Text className="text-surface-400 text-sm mt-1">
          <Trans>Target: {currentExercise.targetSets} × {currentExercise.targetReps} reps</Trans>
          {currentExercise.targetRpeHigh != null
            ? t` @ RPE ${currentExercise.targetRpeLow ?? ""}–${currentExercise.targetRpeHigh}`
            : ""}
        </Text>
      </View>

      {/* Block timer for AMRAP/EMOM */}
      {strategy.hasTimer && timerDuration != null && (
        <View className="px-4 mb-2">
          <BlockTimer
            totalSeconds={timerDuration}
            mode={strategy.blockType === "emom" ? "interval" : "countdown"}
            intervalSeconds={currentExercise.timerMinutes ? currentExercise.timerMinutes * 60 : 120}
            running={blockTimerRunning}
            label={timerLabel}
            currentRound={currentRound}
            onTimeUp={handleAmrapTimeUp}
            onIntervalTick={handleIntervalTick}
          />
        </View>
      )}

      {/* Prescription display */}
      {prescriptionResult && (
        <View className="px-4 mb-2">
          <WeightTypeSelector
            weightType={currentExercise.prescription?.weight_type ?? null}
            result={prescriptionResult}
          />
        </View>
      )}

      {/* AMRAP result input (after timer runs out) */}
      {amrapDone && !amrapResult && (
        <View className="px-4 mb-2">
          <AmrapResultInput onSubmit={handleAmrapResult} />
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
              <Trans>Set</Trans>
            </Text>
            {strategy.showRoundCounter && (
              <Text className="text-surface-500 text-xs font-semibold w-10 text-center">
                <Trans>Rd</Trans>
              </Text>
            )}
            <Text className="text-surface-500 text-xs font-semibold flex-1 text-center">
              <Trans>Weight</Trans>
            </Text>
            <Text className="text-surface-500 text-xs font-semibold flex-1 text-center">
              <Trans>Reps</Trans>
            </Text>
            <Text className="text-surface-500 text-xs font-semibold flex-1 text-center">
              <Trans>RPE</Trans>
            </Text>
            <Text className="text-surface-500 text-xs font-semibold flex-1 text-center">
              <Trans>RIR</Trans>
            </Text>
            <Text className="text-surface-500 text-xs font-semibold w-12 text-right">
              <Trans>Tempo</Trans>
            </Text>
          </View>
        )}

        {currentExercise.loggedSets.map((set, index) => (
          <SetRow
            key={`set-${set.setNumber}`}
            set={set}
            isActive={index === currentExercise.loggedSets.length - 1}
            showRound={strategy.showRoundCounter}
          />
        ))}

        {/* Set input form — always available for AMRAP (time-based, not set-based) */}
        {strategy.canAddExtraSets && (
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

        {/* Standard set input form (for straight sets) */}
        {!strategy.canAddExtraSets && !isExerciseComplete && (
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
        {!strategy.canAddExtraSets && isExerciseComplete && (
          <View className="mt-4 mb-8 gap-3">
            <Card>
              <Text className="text-surface-400 text-center py-2">
                <Trans>✓ All {currentExercise.targetSets} sets logged</Trans>
              </Text>
            </Card>

            {!isLastExercise && (
              <Button
                title={t`Next: ${nextExerciseName ?? "Next Exercise"}`}
                variant="primary"
                onPress={handleAdvance}
              />
            )}

            {isLastExercise && (
              <Button
                title={t`Finish Workout`}
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
    </GradientBackground>
  );
}
