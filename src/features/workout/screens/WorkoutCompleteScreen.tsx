import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { useSessionStore } from "../../../stores/session-store";
import { useAuthStore } from "../../../stores/auth-store";
import { useClearSession } from "../hooks/useWorkoutSession";
import { useSubmitFeedback } from "../hooks/useSubmitFeedback";
import { computeWorkoutSummary } from "../../../shared/utils/workout-summary";

// ─── Best Set Badge ──────────────────────────────────────────────────────

function BestSetBadge({ weightKg, reps, e1rm }: { weightKg: number; reps: number; e1rm: number }) {
  return (
    <View className="bg-surface-800 rounded-lg px-2 py-1 mt-1">
      <Text className="text-surface-300 text-[11px] font-mono">
        Best: {weightKg} kg × {reps} reps (e1RM: {e1rm.toFixed(1)})
      </Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────

/**
 * Workout Complete / Post-Workout Summary Screen
 *
 * Shown after a session is successfully completed. Reads exercise/set data
 * from the Zustand store (still populated from the active workout) and clears
 * the store when navigating away.
 *
 * Shows: total volume, duration, exercise breakdown, best set per exercise.
 * Offers: "Back to Training" (train tab), "Go Home" (home tab),
 * and "Self-Assessment" (wellness survey).
 *
 * Falls back gracefully if the store has been cleared (e.g. after app restart).
 */
export function WorkoutCompleteScreen() {
  const router = useRouter();
  const clearSession = useClearSession();
  const exercises = useSessionStore((s) => s.exercises);
  const startedAt = useSessionStore((s) => s.startedAt);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const user = useAuthStore((s) => s.user);

  // Feedback state
  const [rating, setRating] = useState<number>(0);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const submitFeedback = useSubmitFeedback();
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Compute summary from store data
  const flatSets = useMemo(() => {
    return exercises.flatMap((ex) =>
      ex.loggedSets.map((s) => ({
        exercise_id: ex.exerciseId,
        exercise_name: ex.exerciseName,
        weight: s.weightKg,
        reps: s.reps,
      })),
    );
  }, [exercises]);

  const summary = useMemo(
    () => computeWorkoutSummary(
      { started_at: startedAt ?? undefined },
      flatSets,
    ),
    [startedAt, flatSets],
  );

  const totalExercises = exercises.length;
  const completedExercises = exercises.filter(
    (ex) => ex.loggedSets.length > 0,
  ).length;

  const handleGoHome = useCallback(() => {
    clearSession();
    router.replace("/(tabs)/home");
  }, [clearSession, router]);

  const handleGoTrain = useCallback(() => {
    clearSession();
    router.replace("/(tabs)/train");
  }, [clearSession, router]);

  const handleSelfAssessment = useCallback(() => {
    router.push(`/(workout)/self-assessment?sessionId=${activeSessionId ?? ""}`);
  }, [router, activeSessionId]);

  return (
    <GradientBackground>
    <View className="flex-1">
      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="items-center pt-20 pb-8"
      >
        {/* Celebration */}
        <Text className="text-6xl mb-4">💪</Text>
        <Text className="text-surface-50 text-2xl font-bold mb-1">
          Workout Complete!
        </Text>
        <Text className="text-surface-400 text-sm mb-8 text-center">
          Great effort — here's how it went.
        </Text>

        {/* Stats grid */}
        <View className="w-full flex-row flex-wrap gap-3 mb-6">
          {/* Total volume */}
          <Card className="flex-1 min-w-[45%]">
            <Text className="text-surface-400 text-xs">Total Volume</Text>
            <Text className="text-surface-50 text-xl font-bold mt-1">
              {summary.totalVolume.toLocaleString()}
            </Text>
            <Text className="text-surface-500 text-[10px]">kg</Text>
          </Card>

          {/* Duration */}
          {summary.duration > 0 && (
            <Card className="flex-1 min-w-[45%]">
              <Text className="text-surface-400 text-xs">Duration</Text>
              <Text className="text-surface-50 text-xl font-bold mt-1">
                {summary.duration}
              </Text>
              <Text className="text-surface-500 text-[10px]">min</Text>
            </Card>
          )}

          {/* Sets */}
          <Card className="flex-1 min-w-[45%]">
            <Text className="text-surface-400 text-xs">Sets Logged</Text>
            <Text className="text-surface-50 text-xl font-bold mt-1">
              {summary.totalSets}
            </Text>
            <Text className="text-surface-500 text-[10px]">total</Text>
          </Card>

          {/* Exercises completed */}
          <Card className="flex-1 min-w-[45%]">
            <Text className="text-surface-400 text-xs">Exercises</Text>
            <Text className="text-surface-50 text-xl font-bold mt-1">
              {completedExercises}/{totalExercises}
            </Text>
            <Text className="text-surface-500 text-[10px]">completed</Text>
          </Card>
        </View>

        {/* Exercise breakdown with best set */}
        {summary.exerciseBreakdown.length > 0 && (
          <Card className="w-full mb-6">
            <Text className="text-surface-50 text-sm font-bold mb-3">
              Exercise Breakdown
            </Text>
            {summary.exerciseBreakdown.map((ex, idx) => (
              <View
                key={ex.exerciseId}
                className={`py-3 ${idx < summary.exerciseBreakdown.length - 1 ? "border-b border-surface-800" : ""}`}
              >
                <View className="flex-row justify-between items-start">
                  <Text
                    className="text-surface-100 text-sm flex-1 mr-2 font-medium"
                    numberOfLines={1}
                  >
                    {ex.exerciseName}
                  </Text>
                  {ex.isPr && (
                    <View className="bg-amber-500/20 rounded-full px-2 py-0.5">
                      <Text className="text-amber-400 text-xs font-bold">PR</Text>
                    </View>
                  )}
                </View>
                {ex.bestSet && (
                  <BestSetBadge
                    weightKg={ex.bestSet.weight}
                    reps={ex.bestSet.reps}
                    e1rm={ex.bestSet.estimatedOneRm}
                  />
                )}
              </View>
            ))}
          </Card>
        )}

        {/* Empty state for blank workouts */}
        {exercises.length === 0 && (
          <Card className="w-full mb-6">
            <Text className="text-surface-400 text-center py-4">
              Free workout completed with no logged sets.
            </Text>
          </Card>
        )}

        {/* Feedback section */}
        <Card title="How was the workout?" className="w-full mb-4">
          {feedbackSubmitted ? (
            <Text className="text-surface-400 text-center py-4">
              Thanks for your feedback!
            </Text>
          ) : (
            <>
              {/* Star rating */}
              <View className="flex-row justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-3xl ${star <= rating ? "text-yellow-400" : "text-surface-700"}`}>
                      {star <= rating ? "★" : "☆"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes input */}
              <TextInput
                className="bg-surface-900 border border-surface-700 rounded-xl px-4 py-3 text-surface-50 text-[15px] mb-4 min-h-[80px]"
                placeholder="How did it feel? (optional)"
                placeholderTextColor="#707074"
                multiline
                value={feedbackNotes}
                onChangeText={setFeedbackNotes}
                maxLength={500}
              />

              {/* Submit button */}
              <Button
                title={submitFeedback.isPending ? "Submitting..." : "Submit Feedback"}
                variant="primary"
                disabled={rating === 0 || submitFeedback.isPending}
                onPress={() => {
                  if (!activeSessionId || !user?.id) return;
                  submitFeedback.mutate(
                    {
                      sessionId: activeSessionId,
                      athleteId: user.id,
                      coachId: (user as any).coach_id ?? null,
                      rating,
                      notes: feedbackNotes || null,
                    },
                    {
                      onSuccess: () => setFeedbackSubmitted(true),
                    },
                  );
                }}
              />
            </>
          )}
        </Card>

        {/* Actions */}
        <View className="w-full gap-3">
          <Button
            title="Self-Assessment"
            variant="primary"
            onPress={handleSelfAssessment}
          />
          <Button
            title="Back to Training"
            variant="secondary"
            onPress={handleGoTrain}
          />
          <Button
            title="Go Home"
            variant="ghost"
            onPress={handleGoHome}
          />
        </View>
      </ScrollView>
    </View>
    </GradientBackground>
  );
}
