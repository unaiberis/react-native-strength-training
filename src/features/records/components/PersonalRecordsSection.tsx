import { memo, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import {
  usePersonalRecords,
  getPRTypeLabel,
  formatPRValue,
} from "@/features/records/hooks/usePersonalRecords";
import type { PRDisplayItem } from "@/features/records/hooks/usePersonalRecords";

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── PR Card ──────────────────────────────────────────────────────────────

const PRCard = memo(function PRCard({ record }: { record: PRDisplayItem }) {
  return (
    <View className="bg-surface-800 rounded-xl p-3 mb-2 border border-surface-700">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 mr-2">
          <Text className="text-surface-400 text-xs uppercase tracking-wider">
            {getPRTypeLabel(record.pr_type)}
          </Text>
          <Text className="text-surface-50 text-lg font-bold mt-0.5">
            {formatPRValue(record)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-brand-500 text-sm font-bold">PR</Text>
          {record.achieved_at && (
            <Text className="text-surface-500 text-xs mt-0.5">
              {formatDate(record.achieved_at)}
            </Text>
          )}
        </View>
      </View>

      {(record.weight_kg != null || record.reps != null) && (
        <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-surface-700">
          {record.weight_kg != null && (
            <Text className="text-surface-400 text-xs">{record.weight_kg} kg</Text>
          )}
          {record.reps != null && (
            <Text className="text-surface-400 text-xs">× {record.reps} reps</Text>
          )}
        </View>
      )}
    </View>
  );
});

// ─── Exercise PR Group ────────────────────────────────────────────────────

const ExercisePRGroup = memo(function ExercisePRGroup({
  exerciseName,
  records,
  isExpanded,
  onToggle,
}: {
  exerciseName: string;
  records: PRDisplayItem[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="mb-3">
      <TouchableOpacity
        onPress={onToggle}
        className="flex-row justify-between items-center active:opacity-80 min-h-[44px]"
        accessibilityRole="button"
        accessibilityLabel={`${exerciseName}: ${records.length} PRs. Tap to ${
          isExpanded ? "collapse" : "expand"
        }`}
      >
        <Text className="text-surface-100 text-base font-semibold flex-1 mr-2" numberOfLines={1}>
          {exerciseName}
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="bg-brand-500/20 rounded-lg px-2 py-0.5">
            <Text className="text-brand-400 text-xs font-medium">
              {records.length} PR{records.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <Text className="text-surface-500 text-sm">{isExpanded ? "▲" : "▼"}</Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View className="mt-3">
          {records.map((record) => (
            <PRCard key={record.id} record={record} />
          ))}
        </View>
      )}
    </Card>
  );
});

// ─── Section ──────────────────────────────────────────────────────────────

export function PersonalRecordsSection(): JSX.Element {
  const router = useRouter();
  const { groupedByExercise, isLoading, totalPRs } = usePersonalRecords();

  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    new Set(),
  );

  const toggleExercise = useCallback((exerciseId: string) => {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  }, []);

  const hasRecords = groupedByExercise.length > 0;

  return (
    <View className="mt-8">
      <Text className="text-surface-50 text-xl font-extrabold tracking-[-0.5] mb-3">
        Personal Records
      </Text>
      {hasRecords && (
        <Text className="text-surface-400 text-sm mb-4">
          {totalPRs} personal record{totalPRs !== 1 ? "s" : ""} across{" "}
          {groupedByExercise.length} exercise
          {groupedByExercise.length !== 1 ? "s" : ""}
        </Text>
      )}

      {/* Loading */}
      {isLoading && (
        <View className="items-center justify-center py-8">
          <ActivityIndicator size="large" color="#A4A4A8" />
        </View>
      )}

      {/* Empty state */}
      {!isLoading && !hasRecords && (
        <View className="items-center justify-center py-8 px-6">
          <View className="mb-4">
            <Ionicons name="trophy-outline" size={48} color="#B9B9B6" />
          </View>
          <Text className="text-surface-100 text-lg font-semibold mb-2">
            No records yet
          </Text>
          <Text className="text-surface-400 text-center mb-6">
            Complete workouts to start tracking your personal records. PRs are
            automatically detected when you beat your previous best.
          </Text>
          <Button
            title="Start a Workout"
            variant="primary"
            onPress={() => router.push("/(tabs)/train")}
          />
        </View>
      )}

      {/* PR groups */}
      {hasRecords && (
        <View>
          {groupedByExercise.map((group) => (
            <ExercisePRGroup
              key={group.exerciseId}
              exerciseName={group.exerciseName}
              records={group.records}
              isExpanded={expandedExercises.has(group.exerciseId)}
              onToggle={() => toggleExercise(group.exerciseId)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
