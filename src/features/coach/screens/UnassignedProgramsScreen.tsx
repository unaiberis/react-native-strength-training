/**
 * UnassignedProgramsScreen — Program templates NOT yet assigned to any athlete.
 *
 * Features:
 *   - List templates not present in any active/completed assignment
 *   - Each card: name, exercise count, block info, estimated duration
 *   - "Assign" button → opens athlete selector modal
 *   - Athlete selector: search athletes, pick start date, confirm assignment
 *   - Search by name
 *   - Pull-to-refresh
 *   - EmptyState: "All templates assigned"
 */

import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { KickerLabel } from "@/shared/ui/KickerLabel";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Avatar } from "@/shared/ui/Avatar";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { PageSkeleton } from "@/shared/ui/SkeletonLoader";
import { useTemplates } from "@/features/routines/hooks/useTemplates";
import {
  useCoachAssignments,
  useAssignProgram,
} from "@/features/coach/hooks/useProgramAssignment";
import { useMyTeams, useTeamMembers } from "@/features/coach/hooks/useTeams";
import type { TemplateWithExercises } from "@/lib/pocketbase/services/templates";
import type { ProgramAssignmentRow, TemplateRow, UserRow } from "@/types/pocketbase";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AssignmentWithExpand extends ProgramAssignmentRow {
  expand?: {
    template?: TemplateRow;
    athlete?: UserRow;
  };
}

/** Info extracted from template exercises. */
interface TemplateMeta {
  exerciseCount: number;
  totalSets: number;
  blockCount: number;
  blockLabel: string;
  estDuration: number; // minutes
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function extractBlockInfo(exercises: TemplateWithExercises["exercises"]): {
  blockCount: number;
  blockLabel: string;
} {
  const blockNames = new Set<string>();
  for (const ex of exercises) {
    try {
      if (ex.notes) {
        const meta = JSON.parse(ex.notes);
        if (meta.blockName) blockNames.add(meta.blockName);
        else if (meta.blockType) blockNames.add(meta.blockType);
      }
    } catch {
      // Plain text notes
    }
  }
  return {
    blockCount: blockNames.size || 1,
    blockLabel: blockNames.size > 0 ? `${blockNames.size} block${blockNames.size !== 1 ? "s" : ""}` : "",
  };
}

function computeTemplateMeta(template: TemplateWithExercises): TemplateMeta {
  const exerciseCount = template.exercises.length;
  const totalSets = template.exercises.reduce((sum, ex) => sum + ex.target_sets, 0);
  const { blockCount, blockLabel } = extractBlockInfo(template.exercises);
  // Estimate: 3 min per set + rest
  const estDuration = Math.round((totalSets * 3) / 5) * 5 || 5;
  return { exerciseCount, totalSets, blockCount, blockLabel, estDuration };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Template Card ─────────────────────────────────────────────────────────

function UnassignedTemplateCard({
  template,
  onAssign,
}: {
  template: TemplateWithExercises;
  onAssign: () => void;
}) {
  const meta = computeTemplateMeta(template);

  return (
    <Card className="mb-3">
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-3">
          <Text className="text-surface-50 text-base font-semibold mb-1">
            {template.name}
          </Text>
          {template.description && (
            <Text className="text-surface-400 text-sm mb-2" numberOfLines={2}>
              {template.description}
            </Text>
          )}
          <View className="flex-row flex-wrap gap-2 mb-3">
            <View className="bg-graphite px-2 py-0.5 rounded-md">
              <Text className="text-surface-400 text-xs">
                {meta.exerciseCount} exercise{meta.exerciseCount !== 1 ? "s" : ""}
              </Text>
            </View>
            <View className="bg-graphite px-2 py-0.5 rounded-md">
              <Text className="text-surface-400 text-xs">
                {meta.totalSets} set{meta.totalSets !== 1 ? "s" : ""}
              </Text>
            </View>
            {meta.blockLabel ? (
              <View className="bg-graphite px-2 py-0.5 rounded-md">
                <Text className="text-surface-400 text-xs">{meta.blockLabel}</Text>
              </View>
            ) : null}
            <View className="bg-graphite px-2 py-0.5 rounded-md">
              <Text className="text-surface-400 text-xs">~{meta.estDuration} min</Text>
            </View>
          </View>
        </View>
      </View>

      <Button
        title="Assign to Athlete"
        variant="secondary"
        size="sm"
        icon="person-add-outline"
        onPress={onAssign}
      />
    </Card>
  );
}

// ─── Assign Modal ──────────────────────────────────────────────────────────

function AssignModal({
  visible,
  template,
  onClose,
}: {
  visible: boolean;
  template: TemplateWithExercises | null;
  onClose: () => void;
}) {
  const assignProgram = useAssignProgram();
  const { data: teams } = useMyTeams();
  const { data: memberships } = useMyTeams(); // Will use for athlete selection via team

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  // Fetch athletes from teams the coach manages — grab members from first team for now
  const [selectedTeamForAthletes, setSelectedTeamForAthletes] = useState<string | null>(null);
  const { data: teamMembers } = useTeamMembers(selectedTeamForAthletes);

  // Filter team members to athletes only
  const athletes = useMemo(() => {
    if (!teamMembers) return [];
    return teamMembers.filter((m) => m.role === "athlete");
  }, [teamMembers]);

  const filteredAthletes = useMemo(() => {
    if (!searchQuery.trim()) return athletes;
    const q = searchQuery.toLowerCase();
    return athletes.filter(
      (a) =>
        a.user_name.toLowerCase().includes(q) ||
        a.user_email.toLowerCase().includes(q),
    );
  }, [athletes, searchQuery]);

  const handleConfirm = useCallback(() => {
    if (!selectedAthleteId || !template || !startDate) {
      Alert.alert("Missing Fields", "Select an athlete and start date.");
      return;
    }

    assignProgram.mutate(
      {
        athleteId: selectedAthleteId,
        templateId: template.id,
        startedAt: startDate,
        teamId: selectedTeamId ?? undefined,
      },
      {
        onSuccess: () => {
          Alert.alert(
            "Assigned",
            `"${template.name}" has been assigned to the athlete.`,
          );
          onClose();
        },
        onError: (err) => {
          Alert.alert("Error", err.message ?? "Failed to assign program.");
        },
      },
    );
  }, [selectedAthleteId, selectedTeamId, startDate, template, assignProgram, onClose]);

  const handleClose = useCallback(() => {
    setSearchQuery("");
    setSelectedAthleteId(null);
    setSelectedTeamForAthletes(null);
    setStartDate(new Date().toISOString().split("T")[0]);
    onClose();
  }, [onClose]);

  // Pick first team's athletes when modal opens
  useMemo(() => {
    if (visible && teams && teams.length > 0 && !selectedTeamForAthletes) {
      setSelectedTeamForAthletes(teams[0].id);
    }
  }, [visible, teams, selectedTeamForAthletes]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View className="flex-1 bg-background px-4 pt-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-surface-50 text-xl font-bold flex-1">
            Assign: {template?.name ?? ""}
          </Text>
          <TouchableOpacity onPress={handleClose} className="p-2">
            <Ionicons name="close" size={24} color="#F4F4F2" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Team selector */}
          {teams && teams.length > 0 && (
            <View className="mb-4">
              <Text className="text-surface-400 text-[13px] font-semibold mb-1.5">Team</Text>
              <View className="flex-row flex-wrap gap-2">
                {teams.map((team) => (
                  <TouchableOpacity
                    key={team.id}
                    onPress={() => {
                      setSelectedTeamForAthletes(team.id);
                      setSelectedTeamId(team.id);
                      setSelectedAthleteId(null);
                    }}
                    className={`px-3.5 py-2 rounded-full border ${
                      selectedTeamForAthletes === team.id
                        ? "bg-titanium border-titanium"
                        : "bg-card border-border"
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        selectedTeamForAthletes === team.id ? "text-background" : "text-surface-400"
                      }`}
                    >
                      {team.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Search athletes */}
          <Text className="text-surface-400 text-[13px] font-semibold mb-1.5">Athlete</Text>
          <View className="flex-row items-center bg-card border border-border rounded-xl px-3 mb-3">
            <Ionicons name="search-outline" size={16} color="#707074" />
            <TextInput
              placeholder="Search athletes..."
              placeholderTextColor="#707074"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 px-2 py-3 text-surface-50 text-sm"
              autoCapitalize="none"
            />
          </View>

          {/* Athlete list */}
          {filteredAthletes.length === 0 ? (
            <Text className="text-surface-500 text-sm text-center py-6">
              {searchQuery.trim() ? "No matching athletes." : "No athletes in this team."}
            </Text>
          ) : (
            filteredAthletes.map((athlete) => {
              const isSelected = selectedAthleteId === athlete.user_id;
              return (
                <TouchableOpacity
                  key={athlete.id}
                  onPress={() => setSelectedAthleteId(athlete.user_id)}
                  className={`flex-row items-center gap-3 px-3 py-3 rounded-xl mb-1 ${
                    isSelected ? "bg-titanium/10 border border-titanium/40" : "bg-card border border-border"
                  }`}
                  activeOpacity={0.7}
                >
                  <Avatar name={athlete.user_name} size="sm" />
                  <View className="flex-1">
                    <Text className="text-surface-50 text-sm font-semibold">
                      {athlete.user_name}
                    </Text>
                    <Text className="text-surface-400 text-xs">{athlete.user_email}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#B9B9B6" />
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {/* Start date */}
          <View className="mt-4">
            <Input
              label="Start Date"
              placeholder="YYYY-MM-DD"
              value={startDate}
              onChangeText={setStartDate}
              autoCapitalize="none"
            />
          </View>

          {/* Confirm button */}
          <View className="mt-4 mb-8">
            <Button
              title="Confirm Assignment"
              variant="primary"
              loading={assignProgram.isPending}
              disabled={!selectedAthleteId || !startDate || assignProgram.isPending}
              onPress={handleConfirm}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────

export function UnassignedProgramsScreen() {
  const { data: templates, isLoading, isRefetching, refetch } = useTemplates();
  const { data: assignments } = useCoachAssignments();

  const [searchQuery, setSearchQuery] = useState("");
  const [assigningTemplate, setAssigningTemplate] = useState<TemplateWithExercises | null>(null);

  // Compute unassigned templates
  const unassigned = useMemo(() => {
    if (!templates || !assignments) return templates ?? [];
    const assignedTemplateIds = new Set<string>();
    for (const a of assignments as AssignmentWithExpand[]) {
      if (a.template_id) assignedTemplateIds.add(a.template_id);
    }
    return templates.filter((t) => !assignedTemplateIds.has(t.id));
  }, [templates, assignments]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return unassigned;
    const q = searchQuery.toLowerCase();
    return unassigned.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    );
  }, [unassigned, searchQuery]);

  const handleAssign = useCallback((template: TemplateWithExercises) => {
    setAssigningTemplate(template);
  }, []);

  const handleCloseModal = useCallback(() => {
    setAssigningTemplate(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: TemplateWithExercises }) => (
      <UnassignedTemplateCard template={item} onAssign={() => handleAssign(item)} />
    ),
    [handleAssign],
  );

  const keyExtractor = useCallback((item: TemplateWithExercises) => item.id, []);

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
          <ScreenTitle
            title="Unassigned Programs"
            subtitle="Templates not yet assigned to any athlete"
          />
        </View>

        {/* Search */}
        {unassigned.length > 0 && (
          <View className="flex-row items-center bg-card border border-border rounded-xl px-4 mb-4">
            <Ionicons name="search-outline" size={18} color="#707074" />
            <TextInput
              placeholder="Search templates..."
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

        {/* Template list */}
        {filtered.length === 0 ? (
          <EmptyState
            icon="checkmark-done-outline"
            title={
              !templates
                ? "No Templates"
                : searchQuery.trim()
                  ? "No Matching Templates"
                  : "All Templates Assigned"
            }
            subtitle={
              !templates
                ? "Create workout templates first."
                : searchQuery.trim()
                  ? "Try a different search term."
                  : "Every template is being used by at least one athlete."
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

        {/* Assign modal */}
        <AssignModal
          visible={assigningTemplate !== null}
          template={assigningTemplate}
          onClose={handleCloseModal}
        />
      </View>
    </ErrorBoundary>
  );
}
