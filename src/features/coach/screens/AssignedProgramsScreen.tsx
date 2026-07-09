/**
 * AssignedProgramsScreen — List of all program assignments visible to the coach.
 *
 * Features:
 *   - Search by athlete name or program name
 *   - Filter chips: All / Active / Completed / Cancelled
 *   - Each card: program name, athlete avatar+name, team badge, start date,
 *     status badge, weeks progress bar
 *   - Tap → navigate to assignment detail
 *   - Pull-to-refresh
 *   - EmptyState when no assignments match
 */

import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { KickerLabel } from "@/shared/ui/KickerLabel";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Avatar } from "@/shared/ui/Avatar";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { PageSkeleton } from "@/shared/ui/SkeletonLoader";
import { useCoachAssignments } from "@/features/coach/hooks/useProgramAssignment";
import type { ProgramAssignmentRow, TemplateRow, UserRow } from "@/types/pocketbase";

// ─── Types ─────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "active" | "completed" | "cancelled";

/** Assignment row with expanded template + athlete from PocketBase. */
interface AssignmentWithExpand extends ProgramAssignmentRow {
  expand?: {
    template?: TemplateRow;
    athlete?: UserRow;
  };
}

// ─── Status config ─────────────────────────────────────────────────────────

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "default" | "danger" }> = {
  active: { label: "Active", variant: "success" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

// ─── Assignment Card ───────────────────────────────────────────────────────

function AssignmentCard({
  assignment,
  onPress,
}: {
  assignment: AssignmentWithExpand;
  onPress: () => void;
}) {
  const template = assignment.expand?.template;
  const athlete = assignment.expand?.athlete;
  const status = STATUS_BADGE[assignment.status] ?? STATUS_BADGE.active;

  // Compute weeks progress (rough estimate based on time since started_at)
  const startDate = new Date(assignment.started_at);
  const now = new Date();
  const weeksElapsed = Math.max(
    0,
    Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)),
  );
  const totalWeeks = 12; // Default program length — will refine when program_blocks data is available
  const progressPercent = Math.min(100, Math.round((weeksElapsed / totalWeeks) * 100));

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-card border border-border rounded-2xl p-4 mb-3 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`Assignment: ${template?.name ?? "Unknown"} for ${athlete?.displayName ?? "Unknown athlete"}`}
    >
      {/* Program name + status badge */}
      <View className="flex-row items-start justify-between mb-3">
        <Text className="text-surface-50 text-[17px] font-bold flex-1 mr-3" numberOfLines={1}>
          {template?.name ?? "Unknown Program"}
        </Text>
        <Badge label={status.label} variant={status.variant} />
      </View>

      {/* Athlete row */}
      <View className="flex-row items-center gap-3 mb-2">
        <Avatar name={athlete?.displayName} size="sm" />
        <View className="flex-1">
          <Text className="text-surface-100 text-sm font-semibold">
            {athlete?.displayName ?? "Unknown Athlete"}
          </Text>
          {assignment.team_id ? (
            <Badge label={`Team: ${assignment.team_id.slice(0, 8)}`} variant="default" />
          ) : null}
        </View>
      </View>

      {/* Start date */}
      <Text className="text-surface-400 text-xs mb-3">
        Started {formatDate(assignment.started_at)}
      </Text>

      {/* Progress bar */}
      <View className="h-2 bg-graphite rounded-full mb-1.5 overflow-hidden">
        <View
          className="h-full bg-titanium rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-surface-400 text-xs font-medium">
          Week {weeksElapsed} of {totalWeeks}
        </Text>
        <Text className="text-surface-500 text-xs">{progressPercent}%</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Main Screen ──────────────────────────────────────────────────────────

export function AssignedProgramsScreen() {
  const router = useRouter();
  const { data: assignments, isLoading, isRefetching, refetch } = useCoachAssignments();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const rawAssignments = (assignments ?? []) as AssignmentWithExpand[];

  const filtered = useMemo(() => {
    let list = rawAssignments;

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }

    // Search filter — match athlete name or template name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => {
        const athleteName = a.expand?.athlete?.displayName?.toLowerCase() ?? "";
        const templateName = a.expand?.template?.name?.toLowerCase() ?? "";
        return athleteName.includes(q) || templateName.includes(q);
      });
    }

    return list;
  }, [rawAssignments, statusFilter, searchQuery]);

  const handlePress = useCallback(
    (id: string) => {
      router.push(`/(coach)/assignment/${id}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: AssignmentWithExpand }) => (
      <AssignmentCard assignment={item} onPress={() => handlePress(item.id)} />
    ),
    [handlePress],
  );

  const keyExtractor = useCallback((item: AssignmentWithExpand) => item.id, []);

  // ── Loading ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ErrorBoundary>
        <View className="flex-1">
          <PageSkeleton />
        </View>
      </ErrorBoundary>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
      <View className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="mb-4">
          <KickerLabel>COACH TOOLS</KickerLabel>
          <ScreenTitle title="Assigned Programs" subtitle="Programs assigned to your athletes" />
        </View>

        {/* Search bar */}
        {rawAssignments.length > 0 && (
          <View className="flex-row items-center bg-card border border-border rounded-xl px-4 mb-3">
            <Ionicons name="search-outline" size={18} color="#707074" />
            <TextInput
              placeholder="Search athlete or program..."
              placeholderTextColor="#707074"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 px-3 py-3.5 text-surface-50 text-base"
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1">
                <Ionicons name="close-circle" size={18} color="#707074" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Status filter chips */}
        {rawAssignments.length > 0 && (
          <View className="flex-row gap-2 mb-4">
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setStatusFilter(f.key)}
                className={`px-3.5 py-2 rounded-full border ${
                  statusFilter === f.key
                    ? "bg-titanium border-titanium"
                    : "bg-card border-border"
                }`}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Filter: ${f.label}`}
                accessibilityState={{ selected: statusFilter === f.key }}
              >
                <Text
                  className={`text-xs font-semibold ${
                    statusFilter === f.key ? "text-background" : "text-surface-400"
                  }`}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Assignment list */}
        {filtered.length === 0 ? (
          <EmptyState
            icon="clipboard-outline"
            title={
              rawAssignments.length === 0
                ? "No Programs Assigned"
                : "No Matching Assignments"
            }
            subtitle={
              rawAssignments.length === 0
                ? "Assign a program template to an athlete to get started."
                : "Try adjusting your search or filters."
            }
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
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
