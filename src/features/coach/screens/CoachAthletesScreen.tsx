import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { DashboardSkeleton } from "@/shared/ui/SkeletonLoader";
import { useCoachDashboard } from "@/features/coach/hooks/useCoachDashboard";
import { useUnlinkAthlete } from "@/features/coach/hooks/useAthleteDetail";

// ─── Helpers ────────────────────────────────────────────────────────────

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`;
  return String(Math.round(kg));
}

export function CoachAthletesScreen() {
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
  const [searchQuery, setSearchQuery] = useState("");
  const unlinkMutation = useUnlinkAthlete();

  const filteredAthletes = useMemo(() => {
    if (!searchQuery.trim()) return athletes;
    const q = searchQuery.toLowerCase();
    return athletes.filter(
      (a) =>
        a.displayName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q),
    );
  }, [athletes, searchQuery]);

  // Compute dashboard aggregates
  const dashboardStats = useMemo(() => {
    const totalVol = athletes.reduce((sum, a) => sum + a.totalVolumeKg, 0);
    const avgCompliance =
      athletes.length > 0
        ? athletes.reduce((sum, a) => sum + a.complianceRate, 0) / athletes.length
        : 0;
    return { totalVolume: totalVol, avgCompliance };
  }, [athletes]);

  const handleUnlink = useCallback(
    (athleteId: string, athleteName: string) => {
      Alert.alert(
        "Unlink Athlete",
        `Remove ${athleteName} from your athlete list? They won't lose any data.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unlink",
            style: "destructive",
            onPress: () => {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
              }
              unlinkMutation.mutate({ athleteId });
            },
          },
        ],
      );
    },
    [unlinkMutation],
  );

  const renderAthlete = useCallback(
    ({ item }: { item: (typeof athletes)[0] }) => (
          <View className="bg-card border border-border rounded-2xl p-4 mb-3 shadow-card">
            <TouchableOpacity
              onPress={() => router.push(`/(coach)/athlete/${item.id}`)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`View athlete details for ${item.displayName}`}
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
                    <Text className="text-surface-400 text-xs">{item.email}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => router.push(`/(coach)/analytics/${item.id}`)}
                    className="bg-graphite rounded-xl p-2 min-w-[44px] min-h-[44px] items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel={`View analytics for ${item.displayName}`}
                  >
                    <Ionicons name="trending-up-outline" size={18} color="#B9B9B6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleUnlink(item.id, item.displayName)}
                    className="bg-graphite rounded-xl p-2 min-w-[44px] min-h-[44px] items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel={`Unlink ${item.displayName}`}
                  >
                    <Ionicons name="close-outline" size={18} color="#D65F5F" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>

            {/* Quick stats + Alerts */}
            <View className="flex-row flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
              {/* Last workout */}
              <View className="flex-row items-center gap-1">
                <Ionicons name="time-outline" size={13} color="#A4A4A8" />
                <Text className="text-surface-400 text-xs">{relativeDate(item.lastWorkoutDate)}</Text>
              </View>

              {/* This week workouts */}
              <View className="flex-row items-center gap-1">
                <Ionicons name="barbell-outline" size={13} color="#A4A4A8" />
                <Text className="text-surface-400 text-xs">
                  {item.thisWeekWorkouts > 0 ? `${item.thisWeekWorkouts} this wk` : "0 this wk"}
                </Text>
              </View>

              {/* Compliance bar */}
              <View className="flex-1 min-w-[80px] ml-auto">
                <View className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
                  <View
                    className={`h-full rounded-full ${item.complianceRate >= 0.5 ? "bg-titanium" : "bg-danger"}`}
                    style={{ width: `${Math.min(item.complianceRate * 100, 100)}%` }}
                  />
                </View>
                <Text className="text-surface-500 text-[10px] mt-0.5 text-right">
                  {Math.round(item.complianceRate * 100)}% comp
                </Text>
              </View>
            </View>

            {/* Alert badges */}
            {item.thisWeekWorkouts === 0 && item.totalWorkouts > 0 && (
              <View className="flex-row mt-2 bg-danger/10 rounded-lg px-2 py-1.5 items-center gap-1.5">
                <Text className="text-danger text-xs font-medium">⚠ Inactive</Text>
                <Text className="text-surface-400 text-[10px]">
                  {item.lastWorkoutDate ? `Last workout ${relativeDate(item.lastWorkoutDate)}` : "No workouts yet"}
                </Text>
              </View>
            )}
            {item.complianceRate < 0.5 && item.totalWorkouts > 0 && (
              <View className="flex-row mt-1.5 bg-amber-400/10 rounded-lg px-2 py-1.5 items-center gap-1.5">
                <Text className="text-amber-400 text-xs font-medium">⚠ Low compliance</Text>
                <Text className="text-surface-400 text-[10px]">
                  {Math.round(item.complianceRate * 100)}% — needs attention
                </Text>
              </View>
            )}
          </View>
    ),
    [router, handleUnlink],
  );

  if (isLoading) {
    return (
      <ErrorBoundary>
        <View className="flex-1">
          <DashboardSkeleton />
        </View>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <View className="flex-1 px-4 pt-4">
        {/* Dashboard header */}
        {!isLoading && (
          <View className="flex-row gap-2 mb-4">
            <View className="flex-1 bg-card border border-border rounded-2xl p-3 shadow-card items-center">
              <Text className="text-surface-50 text-2xl font-bold">{totalAthletes}</Text>
              <Text className="text-surface-400 text-xs mt-1 text-center">Athletes</Text>
            </View>
            <View className="flex-1 bg-card border border-border rounded-2xl p-3 shadow-card items-center">
              <Text className="text-green-400 text-2xl font-bold">{activeCount}</Text>
              <Text className="text-surface-400 text-xs mt-1 text-center">Active This Wk</Text>
            </View>
            <View className="flex-1 bg-card border border-border rounded-2xl p-3 shadow-card items-center">
              <Text className="text-amber-400 text-2xl font-bold">{inactiveCount}</Text>
              <Text className="text-surface-400 text-xs mt-1 text-center">Inactive</Text>
            </View>
            <View className="flex-1 bg-card border border-border rounded-2xl p-3 shadow-card items-center">
              <Text className="text-surface-50 text-lg font-bold">
                {formatVolume(dashboardStats.totalVolume)}
              </Text>
              <Text className="text-surface-400 text-xs mt-1 text-center">Volume</Text>
            </View>
          </View>
        )}

        {/* Search bar */}
        <View className="flex-row items-center bg-card border border-border rounded-xl px-3 mb-4 min-h-[44px]">
          <Ionicons name="search-outline" size={18} color="#707074" />
          <TextInput
            className="flex-1 text-surface-50 text-sm ml-2"
            placeholder="Search athletes..."
            placeholderTextColor="#707074"
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search athletes"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              className="min-w-[44px] min-h-[44px] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color="#707074" />
            </TouchableOpacity>
          )}
        </View>

        {filteredAthletes.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 rounded-full bg-graphite items-center justify-center mb-4">
              <Ionicons name="people-outline" size={28} color="#B9B9B6" />
            </View>
            <Text className="text-surface-50 text-lg font-semibold mb-2">
              {searchQuery ? "No Results" : "No Athletes Yet"}
            </Text>
            <Text className="text-surface-400 text-center text-sm leading-5">
              {searchQuery
                ? "Try a different name or email."
                : "Invite athletes to get started. Athletes will appear here once they link to you as their coach."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredAthletes}
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
    </ErrorBoundary>
  );
}
