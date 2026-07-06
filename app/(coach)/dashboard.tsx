import { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCoachDashboard } from "@/features/coach/hooks/useCoachDashboard";

function StatusIndicator({ active }: { active: boolean }) {
  return (
    <View
      className={`w-2.5 h-2.5 rounded-full ${active ? "bg-green-500" : "bg-amber-500"}`}
    />
  );
}

export default function CoachDashboardScreen() {
  const router = useRouter();
  const {
    athletes,
    activeCount,
    inactiveCount,
    totalAthletes,
    isLoading,
    refetch,
    isRefetching,
  } = useCoachDashboard();

  const renderAthlete = useCallback(
    ({ item }: { item: (typeof athletes)[0] }) => {
      const isActive = item.thisWeekWorkouts > 0;
      return (
        <TouchableOpacity
          className="bg-card border border-border rounded-2xl p-4 mb-3"
          onPress={() => router.push(`/(coach)/athlete/${item.id}`)}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-full bg-graphite items-center justify-center">
                <Text className="text-surface-50 font-bold text-base">
                  {item.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-surface-50 font-semibold text-base">
                  {item.displayName}
                </Text>
                <View className="flex-row items-center gap-2 mt-0.5">
                  <Text className="text-surface-400 text-xs">
                    {item.totalWorkouts} workouts
                  </Text>
                  <View className="w-1 h-1 rounded-full bg-border" />
                  <Text className="text-surface-400 text-xs">
                    {item.totalVolumeKg > 0
                      ? `${(item.totalVolumeKg / 1000).toFixed(1)}k kg`
                      : "No volume"}
                  </Text>
                </View>
              </View>
            </View>
            <View className="items-end gap-1">
              <StatusIndicator active={isActive} />
              <Text className="text-surface-500 text-xs">
                {isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [router],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#B9B9B6" />
      </View>
    );
  }

  return (
    <View className="flex-1 px-4 pt-4">
      {/* Stats bar */}
      <View className="flex-row gap-3 mb-5">
        <View className="flex-1 bg-card border border-border rounded-2xl p-4">
          <Text className="text-surface-50 text-2xl font-bold">
            {totalAthletes}
          </Text>
          <Text className="text-surface-400 text-xs mt-1">Total Athletes</Text>
        </View>
        <View className="flex-1 bg-card border border-border rounded-2xl p-4">
          <Text className="text-green-400 text-2xl font-bold">
            {activeCount}
          </Text>
          <Text className="text-surface-400 text-xs mt-1">Active This Week</Text>
        </View>
        <View className="flex-1 bg-card border border-border rounded-2xl p-4">
          <Text className="text-amber-400 text-2xl font-bold">
            {inactiveCount}
          </Text>
          <Text className="text-surface-400 text-xs mt-1">Inactive</Text>
        </View>
      </View>

      {/* Athlete list */}
      {athletes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-graphite items-center justify-center mb-4">
            <Ionicons name="people-outline" size={28} color="#B9B9B6" />
          </View>
          <Text className="text-surface-50 text-lg font-semibold mb-2">
            No Athletes Yet
          </Text>
          <Text className="text-surface-400 text-center text-sm leading-5">
            Athletes will appear here once they link to you as their coach.
          </Text>
        </View>
      ) : (
        <FlatList
          data={athletes}
          keyExtractor={(item) => item.id}
          renderItem={renderAthlete}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#B9B9B6"
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
