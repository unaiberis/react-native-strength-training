import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../../src/shared/ui/Card";
import { Button } from "../../../src/shared/ui/Button";
import { GradientBackground } from "../../../src/shared/ui/GradientBackground";
import { listFeedback } from "../../../src/lib/pocketbase/services/feedback";

const FEEDBACK_QUERY_KEY = "workout-feedback";

/**
 * Coach Athlete Detail Screen
 *
 * Displays submitted feedback for a specific athlete, newest first.
 * Shows an empty state when no feedback exists.
 */
export default function AthleteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: feedback,
    isLoading,
    error,
  } = useQuery({
    queryKey: [FEEDBACK_QUERY_KEY, id],
    queryFn: () => listFeedback(id!),
    enabled: !!id,
  });

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <GradientBackground>
    <ScrollView className="flex-1 px-4 pt-16">
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <Button
          title="← Back"
          variant="ghost"
          onPress={handleBack}
        />
        <Text className="text-surface-50 text-2xl font-bold ml-2">
          Athlete Feedback
        </Text>
      </View>

      {/* Loading */}
      {isLoading && (
        <View className="py-8 items-center">
          <ActivityIndicator size="small" color="#B9B9B6" />
        </View>
      )}

      {/* Error */}
      {error && !isLoading && (
        <Card className="mb-4">
          <Text className="text-danger text-center py-4">
            Failed to load feedback. Pull down to retry.
          </Text>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !error && (!feedback || feedback.length === 0) && (
        <Card className="mb-4">
          <Text className="text-surface-400 text-center py-4">
            No feedback yet from this athlete.
          </Text>
        </Card>
      )}

      {/* Feedback list */}
      {!isLoading && feedback && feedback.length > 0 && (
        <View className="gap-3 mb-8">
          {feedback.map((entry) => (
            <Card key={entry.id}>
              {/* Rating + Date */}
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg">
                  {"★".repeat(entry.rating)}
                  {"☆".repeat(5 - entry.rating)}
                </Text>
                <Text className="text-surface-500 text-xs">
                  {new Date(entry.created_at).toLocaleDateString()}
                </Text>
              </View>

              {/* Notes */}
              {entry.notes && (
                <Text className="text-surface-300 text-sm mt-1">
                  {entry.notes}
                </Text>
              )}
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
    </GradientBackground>
  );
}
