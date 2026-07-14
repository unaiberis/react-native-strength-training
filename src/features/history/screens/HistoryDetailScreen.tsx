import { useMemo } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/EmptyState";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { SkeletonCard } from "@/shared/ui/SkeletonLoader";
import { useSessionDetail } from "../hooks/useHistory";
import {
  calculateVolume,
  calculateTonnage,
  calculateE1RM,
} from "@/shared/utils/pr-calc";

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
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

// ─── Set row ──────────────────────────────────────────────────────────────

function SetRow({
  set,
  isLast,
}: {
  set: {
    setNumber: number;
    weightKg: number;
    reps: number;
    rpe: number | null;
    rir: number | null;
    isWarmup: boolean;
  };
  isLast: boolean;
}) {
  const volume = calculateVolume(set.weightKg, set.reps);
  const e1rm = calculateE1RM(set.weightKg, set.reps);

  return (
    <View
      className={`flex-row items-center py-2 ${!isLast ? "border-b border-border" : ""} ${set.isWarmup ? "opacity-60" : ""}`}
    >
      <Text className="text-surface-400 text-xs font-mono w-8">
        #{set.setNumber}
      </Text>
      <View className="flex-1">
        <Text className="text-surface-50 text-sm">
          {set.weightKg} kg × {set.reps}
        </Text>
        <View className="flex-row items-center gap-2 mt-0.5">
          {set.rpe != null && (
            <Text className="text-surface-500 text-xs">RPE {set.rpe}</Text>
          )}
          {set.rir != null && (
            <Text className="text-surface-500 text-xs">RIR {set.rir}</Text>
          )}
          {set.isWarmup && (
            <Text className="text-amber-500 text-xs font-medium">Warmup</Text>
          )}
        </View>
      </View>
      <View className="items-end">
        <Text className="text-surface-400 text-xs">Vol {volume.toFixed(0)}</Text>
        {e1rm > 0 && (
          <Text className="text-surface-500 text-xs">e1RM {e1rm.toFixed(1)}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Exercise section ─────────────────────────────────────────────────────

function ExerciseSection({
  exerciseName,
  sets,
}: {
  exerciseName: string;
  sets: {
    setNumber: number;
    weightKg: number;
    reps: number;
    rpe: number | null;
    rir: number | null;
    isWarmup: boolean;
  }[];
}) {
  const workingSets = sets.filter((s) => !s.isWarmup);
  const tonnage = calculateTonnage(workingSets);
  const totalSets = sets.length;
  const workingSetCount = workingSets.length;

  return (
    <Card className="mb-3" title={exerciseName}>
      {/* Summary row */}
      <View className="flex-row justify-between items-center mb-2 pb-2 border-b border-border">
        <Text className="text-surface-400 text-xs">
          {workingSetCount} working set{workingSetCount !== 1 ? "s" : ""}
          {totalSets > workingSetCount && (
            <Text className="text-surface-500">
              {" "}· {totalSets} total
            </Text>
          )}
        </Text>
        <Text className="text-surface-100 text-xs font-semibold">
          Volume: {tonnage.toFixed(0)} kg
        </Text>
      </View>

      {/* Column headers */}
      <View className="flex-row py-1 mb-1">
        <Text className="text-surface-500 text-xs font-semibold w-8">Set</Text>
        <Text className="text-surface-500 text-xs font-semibold flex-1">
          Load
        </Text>
        <Text className="text-surface-500 text-xs font-semibold">Metrics</Text>
      </View>

      {/* Sets */}
      {sets.map((set, idx) => (
        <SetRow
          key={`${set.setNumber}-${idx}`}
          set={set}
          isLast={idx === sets.length - 1}
        />
      ))}

      {sets.length === 0 && (
        <Text className="text-surface-500 text-xs text-center py-2">
          No sets logged for this exercise.
        </Text>
      )}
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────

export function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: detail, isLoading, error, refetch, isRefetching } = useSessionDetail(id);

  if (isLoading) {
    return (
      <GradientBackground>
        <View className="flex-1 px-4 pt-16">
          <SkeletonCard lines={4} />
        </View>
      </GradientBackground>
    );
  }

  if (error || !detail) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center px-6">
        <EmptyState
          icon="warning-outline"
          title="Could not load workout"
          subtitle={error ? (error as Error).message : "Workout not found"}
        />
      </View>
      </GradientBackground>
    );
  }

  const { groupedSets, exerciseNames } = detail;
  const totalSets = detail.sets.length;
  const totalVolume = calculateTonnage(
    detail.sets.filter((s) => !s.is_warmup).map((s) => ({
      weightKg: Number(s.weight_kg),
      reps: s.reps,
    })),
  );

  // Convert groupedSets object to ordered array for rendering
  const exerciseGroups = useMemo(() => {
    return Object.entries(groupedSets).map(([exerciseId, sets]) => ({
      exerciseId,
      exerciseName: exerciseNames[exerciseId] ?? "Unknown Exercise",
      sets: sets.map((s) => ({
        setNumber: s.set_number,
        weightKg: Number(s.weight_kg),
        reps: s.reps,
        rpe: s.rpe != null ? Number(s.rpe) : null,
        rir: s.rir ?? null,
        isWarmup: s.is_warmup,
      })),
    }));
  }, [groupedSets, exerciseNames]);

  return (
    <GradientBackground>
    <ScrollView
      className="flex-1 px-4 pt-16"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching || false}
          onRefresh={refetch}
          tintColor="#B9B9B6"
        />
      }
    >
      {/* Header */}
      <ScreenTitle
        title={detail.templateName ?? "Workout"}
        subtitle={`${formatDate(detail.started_at)} at ${formatTime(detail.started_at)}`}
        className="mb-4"
      />

      {/* Stats cards */}
      <View className="flex-row gap-3 mb-4">
        {detail.duration_minutes != null && (
          <Card className="flex-1">
            <Text className="text-surface-400 text-xs mb-1">Duration</Text>
            <Text className="text-surface-50 text-lg font-bold">
              {detail.duration_minutes} min
            </Text>
          </Card>
        )}

        <Card className="flex-1">
          <Text className="text-surface-400 text-xs mb-1">Volume</Text>
          <Text className="text-surface-50 text-lg font-bold">
            {totalVolume.toFixed(0)} kg
          </Text>
        </Card>

        <Card className="flex-1">
          <Text className="text-surface-400 text-xs mb-1">Sets</Text>
          <Text className="text-surface-50 text-lg font-bold">
            {totalSets}
          </Text>
        </Card>
      </View>

      {/* Notes */}
      {detail.notes && (
        <Card className="mb-4">
          <Text className="text-surface-400 text-xs mb-1">Notes</Text>
          <Text className="text-surface-50 text-sm">{detail.notes}</Text>
        </Card>
      )}

      {/* Exercise sections */}
      <Text className="text-surface-50 text-base font-semibold mb-3">
        Exercise Breakdown
      </Text>

      {exerciseGroups.map((group) => (
        <ExerciseSection
          key={group.exerciseId}
          exerciseName={group.exerciseName}
          sets={group.sets}
        />
      ))}

      {/* Bottom spacer */}
      <View className="h-8" />
    </ScrollView>
    </GradientBackground>
  );
}
