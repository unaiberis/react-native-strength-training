import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackButton } from "@/shared/ui/BackButton";
import { DETAIL_HEADER } from "@/constants/theme";
import { useCoachFeedback } from "@/features/coach/hooks/useCoachFeedback";

function StarRating({ rating }: { rating: number }) {
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Text
          key={star}
          className={star <= rating ? "text-yellow-400 text-lg" : "text-surface-600 text-lg"}
        >
          {star <= rating ? "★" : "☆"}
        </Text>
      ))}
    </View>
  );
}

export default function FeedbackScreen() {
  const { athleteId, athleteName } = useLocalSearchParams<{
    athleteId: string;
    athleteName: string;
  }>();
  const { data: feedback, isLoading, error, refetch } = useCoachFeedback(athleteId);

  const sortedFeedback = useMemo(
    () =>
      [...(feedback ?? [])].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [feedback],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: athleteName
            ? `${decodeURIComponent(athleteName)} — Feedback`
            : "Feedback",
          ...DETAIL_HEADER,
          headerLeft: () => (
            <BackButton />
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, backgroundColor: "#050505" }}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center pt-20">
            <ActivityIndicator size="large" color="#B9B9B6" />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center pt-20 px-8">
            <Ionicons name="alert-circle-outline" size={32} color="#D65F5F" />
            <Text className="text-surface-50 text-base font-semibold mt-3 mb-1">
              Something went wrong
            </Text>
            <Text className="text-surface-400 text-sm text-center mb-4">
              {error?.message ?? "Could not load feedback."}
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              className="bg-card border border-border rounded-2xl px-6 py-3"
              accessibilityRole="button"
              accessibilityLabel="Retry loading feedback"
            >
              <Text className="text-surface-50 font-semibold">Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : sortedFeedback.length === 0 ? (
          <View className="flex-1 items-center justify-center pt-20 px-8">
            <Ionicons name="chatbubble-ellipses-outline" size={32} color="#707074" />
            <Text className="text-surface-50 text-base font-semibold mt-3 mb-1">
              No feedback yet
            </Text>
            <Text className="text-surface-400 text-sm text-center">
              {athleteName ? `${decodeURIComponent(athleteName)} hasn't submitted any feedback yet.` : "No feedback to display."}
            </Text>
          </View>
        ) : (
          <>
            <Text className="text-surface-400 text-xs font-semibold uppercase tracking-wider mb-3 ml-1">
              {sortedFeedback.length} {sortedFeedback.length === 1 ? "entry" : "entries"}
            </Text>
            {sortedFeedback.map((fb) => (
              <View
                key={fb.id}
                className="bg-card border border-border rounded-2xl p-5 mb-3"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <StarRating rating={fb.rating} />
                  <Text className="text-surface-500 text-xs">
                    {new Date(fb.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
                {fb.notes ? (
                  <Text className="text-surface-50 text-sm leading-5">
                    {fb.notes}
                  </Text>
                ) : (
                  <Text className="text-surface-500 text-sm italic">
                    No additional notes
                  </Text>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </>
  );
}
