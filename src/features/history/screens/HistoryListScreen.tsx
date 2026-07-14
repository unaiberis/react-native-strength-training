import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/EmptyState";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { useHistory } from "../hooks/useHistory";
import { useExercises } from "../../exercises/hooks/useExercises";
import type { SessionListItem } from "@/lib/pocketbase/services/sessions";

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Session Row ──────────────────────────────────────────────────────────

function SessionRow({
  session,
  onPress,
}: {
  session: SessionListItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${session.templateName ?? "Free Workout"} workout`}
      className="bg-card rounded-xl p-4 mb-3 border border-border active:opacity-80"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-3">
          <Text
            className="text-surface-50 text-base font-semibold"
            numberOfLines={1}
          >
            {session.templateName ?? "Free Workout"}
          </Text>
          <Text className="text-surface-400 text-xs mt-0.5">
            {formatDate(session.started_at)} · {formatTime(session.started_at)}
          </Text>
        </View>

        {session.duration_minutes != null && (
          <View className="bg-cardSoft rounded-xl px-2.5 py-1">
            <Text className="text-surface-100 text-xs">
              {session.duration_minutes} min
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-3">
        {session.exerciseCount != null && (
          <View className="flex-row items-center gap-1">
            <Ionicons name="fitness-outline" size={14} color="#A4A4A8" />
            <Text className="text-surface-400 text-xs">
              {session.exerciseCount} exercise{session.exerciseCount !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
        {session.totalSets != null && (
          <View className="flex-row items-center gap-1">
            <Ionicons name="locate-outline" size={14} color="#A4A4A8" />
            <Text className="text-surface-400 text-xs">
              {session.totalSets} set{session.totalSets !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────

interface HistoryFiltersState {
  exerciseId: string | null;
}

function FilterBar({
  filters,
  onChange,
}: {
  filters: HistoryFiltersState;
  onChange: (f: HistoryFiltersState) => void;
}) {
  const { data: exercises } = useExercises();
  const [showPicker, setShowPicker] = useState(false);

  const selectedName = filters.exerciseId
    ? exercises?.data?.find((e) => e.id === filters.exerciseId)?.name ?? "Unknown"
    : null;

  return (
    <View className="px-4 pb-3">
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => setShowPicker(!showPicker)}
          accessibilityRole="button"
          accessibilityLabel={
            filters.exerciseId
              ? `Filter by exercise, currently ${selectedName}`
              : "Filter by exercise"
          }
          className={`flex-1 flex-row items-center bg-cardSoft border border-border rounded-xl px-3 py-2.5 ${
            filters.exerciseId ? "" : ""
          }`}
        >
          <Text className="text-surface-500 text-xs mr-2">Filter:</Text>
          <Text
            className={`text-sm flex-1 ${filters.exerciseId ? "text-surface-50" : "text-surface-500"}`}
            numberOfLines={1}
          >
            {selectedName ?? "All exercises"}
          </Text>
          <Text className="text-surface-500 text-xs">
            {showPicker ? "▲" : "▼"}
          </Text>
        </TouchableOpacity>

        {filters.exerciseId && (
          <TouchableOpacity
            onPress={() => onChange({ exerciseId: null })}
            accessibilityRole="button"
            accessibilityLabel="Clear exercise filter"
            className="bg-cardSoft rounded-xl px-3 py-2.5 border border-border"
          >
            <Text className="text-surface-400 text-xs">Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Exercise picker dropdown */}
      {showPicker && (
        <View className="mt-2 bg-cardSoft border border-border rounded-xl max-h-48">
          <FlatList
            data={[{ id: null, name: "All exercises" } as { id: string | null; name: string }, ...(exercises?.data ?? [])]}
            keyExtractor={(item) => item.id ?? "__all__"}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onChange({ exerciseId: item.id });
                  setShowPicker(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item.name}`}
                className={`px-3 py-2.5 border-b border-border last:border-b-0 ${
                  filters.exerciseId === item.id ? "bg-graphite" : ""
                }`}
              >
                <Text
                  className={`text-sm ${
                    filters.exerciseId === item.id
                      ? "text-brand-400 font-medium"
                      : "text-surface-100"
                  }`}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            scrollEnabled
          />
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────

export function HistoryListScreen() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<HistoryFiltersState>({ exerciseId: null });

  const {
    sessions,
    isLoading,
    isRefetching,
    refetch,
    hasMore,
    totalCount,
  } = useHistory(page, { exerciseId: filters.exerciseId });

  const onRefresh = useCallback(() => {
    setPage(0);
    refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, isLoading]);

  const handleSessionPress = useCallback(
    (sessionId: string) => {
      router.push(`/history/${sessionId}`);
    },
    [router],
  );

  const handleFilterChange = useCallback(
    (f: HistoryFiltersState) => {
      setFilters(f);
      setPage(0);
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: SessionListItem }) => (
      <SessionRow
        session={item}
        onPress={() => handleSessionPress(item.id)}
      />
    ),
    [handleSessionPress],
  );

  const keyExtractor = useCallback((item: SessionListItem) => item.id, []);

  const renderFooter = () => {
    if (!isLoading || sessions.length === 0) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#A4A4A8" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <EmptyState
        icon="clipboard-outline"
        title="No workouts yet"
        subtitle="Complete your first workout to see your history here."
        action={{ label: "Start a Workout", onPress: () => router.push("/(tabs)/train") }}
      />
    );
  };

  return (
    <GradientBackground>
    <View className="flex-1">
      <ScreenTitle title="History" className="px-4 pt-16 pb-2" />
      {/* Filter bar */}
      <FilterBar filters={filters} onChange={handleFilterChange} />

      {/* Session list */}
      <FlatList
        data={sessions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor="#B9B9B6"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {totalCount > 0 && (
        <View className="px-4 pb-4 pt-2">
          <Text className="text-surface-500 text-xs text-center">
            {totalCount} workout{totalCount !== 1 ? "s" : ""} total
          </Text>
        </View>
      )}
    </View>
    </GradientBackground>
  );
}
