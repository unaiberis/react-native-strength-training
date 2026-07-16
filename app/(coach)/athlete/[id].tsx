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
import { DETAIL_HEADER } from "@/constants/theme";
import { useAthleteDetail, useUnlinkAthlete } from "@/features/coach/hooks/useAthleteDetail";
import { useAssignments } from "@/features/coach/hooks/useProgramAssignment";

export default function AthleteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { athlete, assignments, isLoading, refetch, error } = useAthleteDetail(id);
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
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-titanium text-sm">Go back</Text>
        </TouchableOpacity>
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
                Joined {new Date(athlete.created).toLocaleDateString()}
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
          activeAssignments.map((a) => (
            <View
              key={a.id}
              className="bg-card border border-border rounded-2xl p-4 mb-3"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-surface-50 font-semibold">
                    {a.template_id}
                  </Text>
                  <Text className="text-surface-400 text-xs mt-1">
                    Starts {new Date(a.started_at).toLocaleDateString()}
                  </Text>
                </View>
                <View className="bg-green-900/40 px-3 py-1 rounded-full">
                  <Text className="text-green-400 text-xs font-medium">
                    {a.status}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        {/* All assignments */}
        {assignments.length > 0 && (
          <>
            <Text className="text-surface-50 text-lg font-bold mb-3 mt-2">
              Assignment History
            </Text>
            {assignments.map((a) => (
              <View
                key={a.id}
                className="bg-card border border-border rounded-2xl p-4 mb-3"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-surface-50 font-semibold">
                      {a.template_id}
                    </Text>
                    <Text className="text-surface-400 text-xs mt-1">
                      {new Date(a.started_at).toLocaleDateString()}
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
            ))}
          </>
        )}
      </ScrollView>
    </>
  );
}
