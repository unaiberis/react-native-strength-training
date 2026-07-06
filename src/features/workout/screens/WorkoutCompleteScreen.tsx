import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { useSessionStore } from "../../../stores/session-store";
import { useAuthStore } from "../../../stores/auth-store";
import { useClearSession } from "../hooks/useWorkoutSession";
import { useSubmitFeedback } from "../hooks/useSubmitFeedback";

/**
 * Workout Complete Screen
 *
 * Shown after a session is successfully completed. Reads exercise/set data
 * from the Zustand store (still populated from the active workout) and clears
 * the store when navigating away.
 *
 * Falls back gracefully if the store has been cleared (e.g. after app restart).
 */
export function WorkoutCompleteScreen() {
  const router = useRouter();
  const clearSession = useClearSession();
  const exercises = useSessionStore((s) => s.exercises);
  const startedAt = useSessionStore((s) => s.startedAt);
  const sessionId = useSessionStore((s) => s.activeSessionId);
  const user = useAuthStore((s) => s.user);

  // Feedback state
  const [rating, setRating] = useState<number>(0);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const submitFeedback = useSubmitFeedback();
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Compute summary
  const totalLoggedSets = exercises.reduce(
    (sum, ex) => sum + ex.loggedSets.length,
    0,
  );
  const totalExercises = exercises.length;
  const completedExercises = exercises.filter(
    (ex) => ex.loggedSets.length > 0,
  ).length;

  // Compute duration from startedAt
  const durationMinutes = startedAt
    ? Math.round(
        (Date.now() - new Date(startedAt).getTime()) / 60000,
      )
    : 0;

  const handleGoHome = useCallback(() => {
    clearSession();
    router.replace("/(tabs)");
  }, [clearSession, router]);

  const handleGoTrain = useCallback(() => {
    clearSession();
    router.replace("/(tabs)/train");
  }, [clearSession, router]);

  return (
    <GradientBackground>
    <View className="flex-1">
      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="items-center pt-24 pb-8"
      >
        {/* Celebration */}
        <Text className="text-6xl mb-4">🎉</Text>
        <Text className="text-surface-50 text-2xl font-bold mb-2">
          Workout Complete!
        </Text>
        <Text className="text-surface-400 text-base mb-8 text-center">
          Great effort — keep up the momentum.
        </Text>

        {/* Summary cards */}
        <Card className="w-full mb-3">
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-surface-400">Sets logged</Text>
            <Text className="text-surface-50 text-lg font-bold">
              {totalLoggedSets}
            </Text>
          </View>
        </Card>

        {durationMinutes > 0 && (
          <Card className="w-full mb-3">
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-surface-400">Duration</Text>
              <Text className="text-surface-50 text-lg font-bold">
                {durationMinutes} min
              </Text>
            </View>
          </Card>
        )}

        {totalExercises > 0 && (
          <Card className="w-full mb-3">
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-surface-400">Exercises completed</Text>
              <Text className="text-surface-50 text-lg font-bold">
                {completedExercises} / {totalExercises}
              </Text>
            </View>
          </Card>
        )}

        {/* Exercise breakdown */}
        {exercises.length > 0 && (
          <Card title="Exercise Summary" className="w-full mb-8">
            {exercises.map((ex, idx) => (
              <View
                key={ex.exerciseId}
                className={`flex-row justify-between items-center py-2 ${
                  idx < exercises.length - 1 ? "border-b border-surface-800" : ""
                }`}
              >
                <Text
                  className="text-surface-100 text-sm flex-1 mr-2"
                  numberOfLines={1}
                >
                  {ex.exerciseName}
                </Text>
                <Text className="text-surface-400 text-sm font-mono">
                  {ex.loggedSets.length} / {ex.targetSets} sets
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Empty state for blank workouts */}
        {exercises.length === 0 && (
          <Card className="w-full mb-8">
            <Text className="text-surface-400 text-center py-4">
              Free workout completed with no logged sets.
            </Text>
          </Card>
        )}

        {/* Feedback section */}
        <Card title="How was the workout?" className="w-full mb-8">
          {feedbackSubmitted ? (
            <Text className="text-surface-400 text-center py-4">
              Thanks for your feedback!
            </Text>
          ) : (
            <>
              {/* Star rating */}
              <View className="flex-row justify-center gap-2 mb-4" testID="feedback-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    activeOpacity={0.7}
                    testID={`star-${star}`}
                  >
                    <Text className={`text-3xl ${star <= rating ? "text-yellow-400" : "text-surface-700"}`}>
                      {star <= rating ? "★" : "☆"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes input */}
              <TextInput
                className="bg-cardSoft border border-border rounded-xl px-4 py-3 text-surface-50 text-[15px] mb-4 min-h-[80px]"
                placeholder="How did it feel? (optional)"
                placeholderTextColor="#707074"
                multiline
                value={feedbackNotes}
                onChangeText={setFeedbackNotes}
                maxLength={500}
                testID="feedback-notes"
              />

              {/* Submit button */}
              <Button
                title={submitFeedback.isPending ? "Submitting..." : "Submit Feedback"}
                variant="primary"
                disabled={rating === 0 || submitFeedback.isPending}
                onPress={() => {
                  if (!sessionId || !user?.id) return;
                  submitFeedback.mutate(
                    {
                      sessionId,
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
                testID="submit-feedback"
              />
            </>
          )}
        </Card>

        {/* Actions */}
        <View className="w-full gap-3">
          <Button
            title="Back to Training"
            variant="primary"
            onPress={handleGoTrain}
          />
          <Button
            title="Go Home"
            variant="secondary"
            onPress={handleGoHome}
          />
        </View>
      </ScrollView>
    </View>
    </GradientBackground>
  );
}
