/**
 * AssignmentDetailScreen — Full detail of a single program assignment.
 *
 * Features:
 *   - Program name, description
 *   - Athlete profile (avatar, name, email)
 *   - Start date, status with change option
 *   - Progress bar (weeks completed / total)
 *   - Phase list (using PhaseCard from programs)
 *   - Action buttons: Complete, Pause, Cancel
 *   - Cancellation requires confirmation alert
 */

import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { KickerLabel } from "@/shared/ui/KickerLabel";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Avatar } from "@/shared/ui/Avatar";
import { Button } from "@/shared/ui/Button";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { PageSkeleton } from "@/shared/ui/SkeletonLoader";
import {
  useAssignment,
  useUpdateAssignment,
  useUnassignProgram,
} from "@/features/coach/hooks/useProgramAssignment";
import type { ProgramAssignmentRow, TemplateRow, UserRow } from "@/types/pocketbase";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AssignmentWithExpand extends ProgramAssignmentRow {
  expand?: {
    template?: TemplateRow;
    athlete?: UserRow;
  };
}

interface StatusOption {
  key: "active" | "completed" | "cancelled";
  label: string;
  variant: "success" | "default" | "danger";
  icon: keyof typeof Ionicons.glyphMap;
}

// ─── Status config ─────────────────────────────────────────────────────────

const STATUS_OPTIONS: StatusOption[] = [
  { key: "active", label: "Active", variant: "success", icon: "play-circle-outline" },
  { key: "completed", label: "Completed", variant: "default", icon: "checkmark-circle-outline" },
  { key: "cancelled", label: "Cancelled", variant: "danger", icon: "close-circle-outline" },
];

const CURRENT_STATUS_BADGE: Record<string, { label: string; variant: "success" | "default" | "danger" }> = {
  active: { label: "Active", variant: "success" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Main Screen ──────────────────────────────────────────────────────────

export function AssignmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: rawAssignment, isLoading, refetch } = useAssignment(id);
  const updateAssignment = useUpdateAssignment();
  const unassignProgram = useUnassignProgram();

  const assignment = rawAssignment as AssignmentWithExpand | undefined;
  const template = assignment?.expand?.template;
  const athlete = assignment?.expand?.athlete;

  // Compute progress
  const startDate = assignment ? new Date(assignment.started_at) : null;
  const now = new Date();
  const weeksElapsed = startDate
    ? Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)))
    : 0;
  const totalWeeks = 12;
  const progressPercent = Math.min(100, Math.round((weeksElapsed / totalWeeks) * 100));

  const handleStatusChange = useCallback(
    (status: "active" | "completed" | "cancelled") => {
      if (!assignment) return;

      if (status === "cancelled") {
        Alert.alert(
          "Cancel Assignment",
          "Are you sure you want to cancel this assignment? The athlete will no longer have access to this program.",
          [
            { text: "No, Keep It", style: "cancel" },
            {
              text: "Yes, Cancel",
              style: "destructive",
              onPress: () => {
                updateAssignment.mutate(
                  { assignmentId: assignment.id, status: "cancelled" },
                  { onSuccess: () => refetch() },
                );
              },
            },
          ],
        );
      } else {
        updateAssignment.mutate(
          { assignmentId: assignment.id, status },
          { onSuccess: () => refetch() },
        );
      }
    },
    [assignment, updateAssignment, refetch],
  );

  const handleDelete = useCallback(() => {
    if (!assignment) return;

    Alert.alert(
      "Remove Assignment",
      "This will permanently remove this assignment. The athlete will lose access to this program. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            unassignProgram.mutate(assignment.id, {
              onSuccess: () => router.back(),
              onError: (err) => Alert.alert("Error", err.message ?? "Failed to remove assignment."),
            });
          },
        },
      ],
    );
  }, [assignment, unassignProgram, router]);

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

  if (!assignment) {
    return (
      <ErrorBoundary>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={48} color="#707074" />
          <Text className="text-surface-50 text-lg font-semibold mt-4 mb-2">
            Assignment Not Found
          </Text>
          <Button title="Go Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </ErrorBoundary>
    );
  }

  const statusBadge = CURRENT_STATUS_BADGE[assignment.status] ?? CURRENT_STATUS_BADGE.active;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-5">
          <KickerLabel>ASSIGNMENT DETAIL</KickerLabel>
          <ScreenTitle title={template?.name ?? "Unknown Program"} />
        </View>

        {/* Status badge */}
        <View className="mb-5">
          <Badge label={statusBadge.label} variant={statusBadge.variant} className="mb-3" />

          {template?.description && (
            <Text className="text-surface-400 text-sm mb-3">{template.description}</Text>
          )}
        </View>

        {/* Athlete card */}
        <Card title="Athlete" className="mb-4">
          <View className="flex-row items-center gap-3">
            <Avatar name={athlete?.displayName} size="md" />
            <View className="flex-1">
              <Text className="text-surface-50 font-semibold text-base">
                {athlete?.displayName ?? "Unknown Athlete"}
              </Text>
              <Text className="text-surface-400 text-sm">{athlete?.email ?? "—"}</Text>
            </View>
          </View>
        </Card>

        {/* Progress card */}
        <Card title="Progress" className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-surface-400 text-sm">Start Date</Text>
            <Text className="text-surface-50 font-semibold">
               {formatDate(assignment.started_at)}
            </Text>
          </View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-surface-400 text-sm">Status</Text>
            <Badge label={statusBadge.label} variant={statusBadge.variant} />
          </View>

          {/* Progress bar */}
          <View className="h-2 bg-graphite rounded-full mb-1.5 overflow-hidden mt-2">
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
        </Card>

        {/* Phase list (placeholder — real data from backend TBD) */}
        <Card title="Program Phases" className="mb-4">
          <Text className="text-surface-500 text-sm italic text-center py-4">
            Phases will appear here once the program block data is available.
          </Text>
        </Card>

        {/* Action buttons */}
        {assignment.status === "active" && (
          <View className="mb-6">
            <Text className="text-surface-400 text-[13px] font-semibold mb-3 uppercase tracking-wide">
              Change Status
            </Text>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Button
                  title="Complete"
                  variant="secondary"
                  size="md"
                  icon="checkmark-circle-outline"
                  loading={updateAssignment.isPending && updateAssignment.variables?.status === "completed"}
                  onPress={() => handleStatusChange("completed")}
                />
              </View>
              <View className="flex-1">
                <Button
                  title="Cancel"
                  variant="danger"
                  size="md"
                  icon="close-circle-outline"
                  loading={updateAssignment.isPending && updateAssignment.variables?.status === "cancelled"}
                  onPress={() => handleStatusChange("cancelled")}
                />
              </View>
            </View>

            {/* Dangerous: full remove */}
            <Button
              title="Remove Assignment"
              variant="ghost"
              size="md"
              icon="trash-outline"
              loading={unassignProgram.isPending}
              onPress={handleDelete}
            />
          </View>
        )}

        {assignment.status === "completed" && (
          <View className="mb-6">
            <Button
              title="Reactivate Assignment"
              variant="secondary"
              size="md"
              icon="refresh-outline"
              loading={updateAssignment.isPending}
              onPress={() => handleStatusChange("active")}
            />
          </View>
        )}

        {assignment.status === "cancelled" && (
          <View className="mb-6">
            <Button
              title="Reactivate Assignment"
              variant="secondary"
              size="md"
              icon="refresh-outline"
              loading={updateAssignment.isPending}
              onPress={() => handleStatusChange("active")}
            />
            <View className="mt-3">
              <Button
                title="Remove Permanently"
                variant="ghost"
                size="md"
                icon="trash-outline"
                loading={unassignProgram.isPending}
                onPress={handleDelete}
              />
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </ErrorBoundary>
  );
}
