import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCoachDashboard } from "@/features/coach/hooks/useCoachDashboard";
import { useUnlinkAthlete } from "@/features/coach/hooks/useAthleteDetail";

export default function CoachAthletesScreen() {
  const router = useRouter();
  const { athletes, isLoading, refetch, isRefetching } = useCoachDashboard();
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
            onPress: () => unlinkMutation.mutate(athleteId),
          },
        ],
      );
    },
    [unlinkMutation],
  );

  const renderAthlete = useCallback(
    ({ item }: { item: (typeof athletes)[0] }) => (
      <View className="bg-card border border-border rounded-2xl p-4 mb-3">
        <TouchableOpacity
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
                <Text className="text-surface-400 text-xs">{item.email}</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => router.push(`/(coach)/analytics/${item.id}`)}
                className="bg-graphite rounded-xl p-2"
              >
                <Ionicons name="trending-up-outline" size={18} color="#B9B9B6" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleUnlink(item.id, item.displayName)}
                className="bg-graphite rounded-xl p-2"
              >
                <Ionicons name="close-outline" size={18} color="#D65F5F" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick stats */}
        <View className="flex-row mt-3 pt-3 border-t border-border gap-4">
          <View className="flex-row items-center gap-1">
            <Ionicons name="barbell-outline" size={14} color="#A4A4A8" />
            <Text className="text-surface-400 text-xs">
              {item.totalWorkouts} workouts
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="checkmark-circle-outline" size={14} color="#A4A4A8" />
            <Text className="text-surface-400 text-xs">
              {Math.round(item.complianceRate * 100)}% compliance
            </Text>
          </View>
        </View>
      </View>
    ),
    [router, handleUnlink],
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
      {/* Search bar */}
      <View className="flex-row items-center bg-card border border-border rounded-xl px-3 mb-4 h-11">
        <Ionicons name="search-outline" size={18} color="#707074" />
        <TextInput
          className="flex-1 text-surface-50 text-sm ml-2"
          placeholder="Search athletes..."
          placeholderTextColor="#707074"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
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
              : "Athletes will appear here once they link to you as their coach."}
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
  );
}
