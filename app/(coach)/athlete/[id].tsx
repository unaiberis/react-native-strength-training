import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Trans } from "@lingui/react/macro";
import { BackButton } from "@/shared/ui/BackButton";
import { Card } from "@/shared/ui/Card";
import { DETAIL_HEADER } from "@/constants/theme";
import { useAthleteDetail, useUnlinkAthlete } from "@/features/coach/hooks/useAthleteDetail";
import { useCoachFeedback } from "@/features/coach/hooks/useCoachFeedback";

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function StarRating({ rating }: { rating: number }) {
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? "star" : "star-outline"}
          size={14}
          color={star <= rating ? "#D7D7D2" : "#343437"}
        />
      ))}
    </View>
  );
}

export default function AthleteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { athlete, assignments, isLoading, refetch, error } = useAthleteDetail(id);
  const {
    data: feedbackEntries = [],
    isLoading: feedbackLoading,
  } = useCoachFeedback(id);
  const unlinkMutation = useUnlinkAthlete();

  const handleUnlink = useCallback(() => {
    if (!athlete) return;
    Alert.alert(
      "Unlink Athlete",
      `Remove ${athlete.displayName} from your athlete list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: () => {
            unlinkMutation.mutate({ athleteId: athlete.id }, {
              onSuccess: () => router.back(),
            });
          },
        },
      ],
    );
  }, [athlete, router, unlinkMutation]);

  const activeAssignments = useMemo(
    () => assignments.filter((a) => a.status === "active"),
    [assignments],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#B9B9B6" />
      </View>
    );
  }

  if (!athlete) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-surface-50 text-lg font-semibold mb-2">
          Athlete Not Found
        </Text>
        <BackButton fallbackRoute="/(coach)" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: athlete.displayName,
          ...DETAIL_HEADER,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleUnlink}
              className="mr-2 min-w-[44px] min-h-[44px] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={`Unlink ${athlete?.displayName ?? "athlete"}`}
            >
              <Ionicons name="close-outline" size={22} color="#D65F5F" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#B9B9B6" />
        }
      >
        {/* Profile card */}
        <View className="bg-card border border-border rounded-2xl p-5 mb-4">
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-graphite items-center justify-center">
              <Text className="text-surface-50 font-bold text-2xl">
                {athlete.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-surface-50 text-xl font-bold">
                {athlete.displayName}
              </Text>
              <Text className="text-surface-400 text-sm mt-0.5">
                {athlete.email}
              </Text>
              <Text className="text-surface-500 text-xs mt-1">
                <Trans>Joined</Trans> {formatDate(athlete.created)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            className="flex-1 bg-card border border-border rounded-2xl p-4 items-center"
            onPress={() => router.push(`/(coach)/analytics/${athlete.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`View analytics for ${athlete.displayName}`}
          >
            <Ionicons name="trending-up-outline" size={24} color="#B9B9B6" />
            <Text className="text-surface-50 text-sm font-semibold mt-2">
              Analytics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-card border border-border rounded-2xl p-4 items-center"
            onPress={() =>
              router.push(
                `/(coach)/assign?athleteId=${athlete.id}&athleteName=${encodeURIComponent(athlete.displayName)}`,
              )
            }
            accessibilityRole="button"
            accessibilityLabel={`Assign program to ${athlete.displayName}`}
          >
            <Ionicons name="calendar-outline" size={24} color="#B9B9B6" />
            <Text className="text-surface-50 text-sm font-semibold mt-2">
              Assign Program
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-card border border-border rounded-2xl p-4 items-center"
            onPress={() =>
              router.push(`/(coach)/athlete/${athlete.id}/calendar`)
            }
            accessibilityRole="button"
            accessibilityLabel={`View calendar for ${athlete.displayName}`}
          >
            <Ionicons name="grid-outline" size={24} color="#B9B9B6" />
            <Text className="text-surface-50 text-sm font-semibold mt-2">
              Calendar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active programs */}
        <Text className="text-surface-50 text-lg font-bold mb-3">
          Active Programs
        </Text>
        {activeAssignments.length === 0 ? (
          <View className="bg-card border border-border rounded-2xl p-5 items-center mb-4">
            <Ionicons name="document-text-outline" size={24} color="#707074" />
            <Text className="text-surface-400 text-sm mt-2">
              No active programs assigned
            </Text>
          </View>
        ) : (
          activeAssignments.map((a) => {
            const aWithName = a as any;
            return (
              <View
                key={a.id}
                className="bg-card border border-border rounded-2xl p-4 mb-3"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-surface-50 font-semibold">
                      {aWithName.templateName ?? "Template name unavailable"}
                    </Text>
                    <Text className="text-surface-400 text-xs mt-1">
                      <Trans>Starts</Trans> {formatDate(a.started_at)}
                    </Text>
                  </View>
                  <View className="bg-green-900/40 px-3 py-1 rounded-full">
                    <Text className="text-green-400 text-xs font-medium">
                      {a.status}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* Feedback section */}
        <Text className="text-surface-50 text-lg font-bold mb-3 mt-2">
          <Trans>Feedback</Trans>
        </Text>
        {feedbackLoading ? (
          <View className="bg-card border border-border rounded-2xl p-5 items-center mb-4">
            <ActivityIndicator size="small" color="#B9B9B6" />
          </View>
        ) : feedbackEntries.length === 0 ? (
          <View className="bg-card border border-border rounded-2xl p-5 items-center mb-4">
            <Ionicons name="chatbubble-outline" size={24} color="#707074" />
            <Text className="text-surface-400 text-sm mt-2">
              <Trans>No feedback yet</Trans>
            </Text>
          </View>
        ) : (
          feedbackEntries.slice(0, 5).map((entry) => (
            <View
              key={entry.id}
              className="bg-card border border-border rounded-2xl p-4 mb-3"
            >
              <View className="flex-row items-center justify-between mb-2">
                <StarRating rating={entry.rating} />
                <Text className="text-surface-500 text-xs">
                  {formatDate(entry.created_at)}
                </Text>
              </View>
              {entry.notes && (
                <Text className="text-surface-300 text-sm leading-5">
                  {entry.notes}
                </Text>
              )}
            </View>
          ))
        )}

        {/* All assignments */}
        {assignments.length > 0 && (
          <>
            <Text className="text-surface-50 text-lg font-bold mb-3 mt-2">
              Assignment History
            </Text>
            {assignments.map((a) => {
              const aWithName = a as any;
              return (
                <View
                  key={a.id}
                  className="bg-card border border-border rounded-2xl p-4 mb-3"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-surface-50 font-semibold">
                        {aWithName.templateName ?? "Template name unavailable"}
                      </Text>
                      <Text className="text-surface-400 text-xs mt-1">
                        {formatDate(a.started_at)}
                      </Text>
                    </View>
                    <View
                      className={`px-3 py-1 rounded-full ${
                        a.status === "completed"
                          ? "bg-blue-900/40"
                          : a.status === "cancelled"
                            ? "bg-red-900/40"
                            : "bg-green-900/40"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          a.status === "completed"
                            ? "text-blue-400"
                            : a.status === "cancelled"
                              ? "text-red-400"
                              : "text-green-400"
                        }`}
                      >
                        {a.status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </>
  );
}
