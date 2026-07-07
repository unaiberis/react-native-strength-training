import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "../../../src/stores/auth-store";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../../src/shared/ui/Card";
import { Button } from "../../../src/shared/ui/Button";
import { GradientBackground } from "../../../src/shared/ui/GradientBackground";
import * as FeedbackService from "../../../src/lib/pocketbase/services/feedback";

const FEEDBACK_QUERY_KEY = "workout-feedback";

export default function AthleteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const {
    data: feedbackEntries,
    isLoading,
    error,
  } = useQuery({
    queryKey: [FEEDBACK_QUERY_KEY, id],
    queryFn: () => FeedbackService.listFeedback(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#A4A4A8" />
        </View>
      </GradientBackground>
    );
  }

  if (error) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-surface-400 text-base">
            Failed to load athlete feedback.
          </Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header */}
        <Text className="text-surface-50 text-2xl font-bold mb-6">
          Athlete Feedback
        </Text>

        {/* Feedback list */}
        {feedbackEntries && feedbackEntries.length > 0 ? (
          feedbackEntries.map((entry) => (
            <Card key={entry.id} className="mb-3">
              <View className="flex-row items-center mb-2">
                {/* Star rating */}
                <View className="flex-row gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Text
                      key={star}
                      className={`text-lg ${
                        star <= entry.rating
                          ? "text-yellow-400"
                          : "text-surface-700"
                      }`}
                    >
                      ★
                    </Text>
                  ))}
                </View>
                <Text className="text-surface-500 text-xs ml-auto">
                  {new Date(entry.created_at).toLocaleDateString()}
                </Text>
              </View>
              {entry.notes && (
                <Text className="text-surface-200 text-sm">
                  {entry.notes}
                </Text>
              )}
              {!entry.notes && (
                <Text className="text-surface-500 text-sm italic">
                  No notes
                </Text>
              )}
            </Card>
          ))
        ) : (
          <View className="items-center py-16">
            <Text className="text-surface-500 text-base text-center">
              No feedback entries yet.
            </Text>
            <Text className="text-surface-600 text-sm text-center mt-2">
              Feedback appears here after the athlete completes workouts.
            </Text>
          </View>
        )}

        {/* Back button */}
        <View className="mt-4 mb-8">
          <Button
            title="Back to Athletes"
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
      </ScrollView>
    </GradientBackground>
  );
}
