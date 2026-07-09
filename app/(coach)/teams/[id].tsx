import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { useAuthStore } from "@/stores/auth-store";
import {
  useTeamMembers,
  useUpdateTeam,
  useDeleteTeam,
  useAddTeamMember,
  useRemoveTeamMember,
  useUpdateMemberRole,
  useCreateInvite,
} from "@/features/coach/hooks/useTeams";
import type { TeamMember, TeamRole } from "@/types/pocketbase";

const ROLE_ORDER: TeamRole[] = ["admin", "coach", "athlete"];
const ROLE_LABELS: Record<TeamRole, string> = {
  admin: "Admin",
  coach: "Coach",
  athlete: "Athlete",
};

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const teamId = id!;
  const userId = useAuthStore((s) => s.user?.id);
  const isTeamAdmin = useAuthStore((s) => s.isTeamAdmin);

  const { data: members = [], isLoading: membersLoading } = useTeamMembers(teamId);
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();
  const addMemberMutation = useAddTeamMember();
  const removeMemberMutation = useRemoveTeamMember();
  const updateRoleMutation = useUpdateMemberRole();
  const createInviteMutation = useCreateInvite();

  // ─── Derived ──────────────────────────────────────
  const currentMember = useMemo(
    () => members.find((m) => m.user_id === userId),
    [members, userId],
  );
  const canManage = currentMember?.role === "admin" || currentMember?.role === "coach";
  const canDelete = currentMember?.role === "admin";

  const groupedMembers = useMemo(() => {
    const groups: Record<TeamRole, TeamMember[]> = {
      admin: [],
      coach: [],
      athlete: [],
    };
    for (const m of members) {
      if (groups[m.role]) groups[m.role].push(m);
    }
    return groups;
  }, [members]);

  // ─── Edit name/desc state ─────────────────────────
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const handleStartEdit = useCallback(() => {
    const first = members[0];
    if (!first) return;
    setEditName("");
    setEditDesc("");
    setEditing(true);
  }, [members]);

  const handleSaveEdit = useCallback(() => {
    const name = editName.trim();
    if (!name) {
      Alert.alert("Required", "Team name is required.");
      return;
    }
    updateTeamMutation.mutate(
      { teamId, name, description: editDesc.trim() || undefined },
      {
        onSuccess: () => setEditing(false),
        onError: (err: any) => Alert.alert("Error", err?.message ?? "Update failed."),
      },
    );
  }, [teamId, editName, editDesc, updateTeamMutation]);

  // ─── Add member ───────────────────────────────────
  const [showAddMember, setShowAddMember] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<TeamRole>("athlete");

  const handleAddMember = useCallback(() => {
    const uid = addUserId.trim();
    if (!uid) {
      Alert.alert("Required", "User ID is required.");
      return;
    }
    addMemberMutation.mutate(
      { teamId, userId: uid, role: addRole },
      {
        onSuccess: () => {
          setShowAddMember(false);
          setAddUserId("");
          setAddRole("athlete");
        },
        onError: (err: any) => Alert.alert("Error", err?.message ?? "Add member failed."),
      },
    );
  }, [teamId, addUserId, addRole, addMemberMutation]);

  // ─── Remove member ────────────────────────────────
  const handleRemoveMember = useCallback(
    (member: TeamMember) => {
      const removeFn = () => {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }
        removeMemberMutation.mutate({ membershipId: member.id, teamId });
      };
      if (Platform.OS === "web") {
        if (window.confirm(`Remove ${member.user_name} from this team?`)) removeFn();
        return;
      }
      Alert.alert("Remove Member", `Remove ${member.user_name}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: removeFn },
      ]);
    },
    [teamId, removeMemberMutation],
  );

  // ─── Change role ──────────────────────────────────
  const handleChangeRole = useCallback(
    (member: TeamMember, newRole: TeamRole) => {
      updateRoleMutation.mutate(
        { membershipId: member.id, role: newRole },
        { onError: (err: any) => Alert.alert("Error", err?.message ?? "Role update failed.") },
      );
    },
    [updateRoleMutation],
  );

  // ─── Generate invite ──────────────────────────────
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const handleGenerateInvite = useCallback(() => {
    createInviteMutation.mutate(
      { teamId, role: "athlete" },
      {
        onSuccess: (result: any) => {
          setInviteCode(result?.code ?? "unknown");
        },
        onError: (err: any) => Alert.alert("Error", err?.message ?? "Invite creation failed."),
      },
    );
  }, [teamId, createInviteMutation]);

  // ─── Member row renderer ──────────────────────────
  const MemberRow = ({ member }: { member: TeamMember }) => (
    <View className="flex-row items-center justify-between py-3 border-b border-border">
      <View className="flex-row items-center gap-3 flex-1">
        <View className="w-9 h-9 rounded-full bg-graphite items-center justify-center">
          <Text className="text-surface-50 font-bold text-sm">
            {member.user_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-surface-50 text-sm font-medium">
            {member.user_name}
          </Text>
          <Text className="text-surface-400 text-xs">{member.user_email}</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        {/* Role badge / changer */}
        {canManage && member.user_id !== userId ? (
          <TouchableOpacity
            onPress={() => {
              const roles: TeamRole[] = ["athlete", "coach", "admin"];
              const idx = roles.indexOf(member.role);
              const next = roles[(idx + 1) % roles.length];
              handleChangeRole(member, next);
            }}
            className="bg-graphite rounded-lg px-3 py-1.5 min-w-[44px] items-center"
            accessibilityRole="button"
            accessibilityLabel={`Change role for ${member.user_name}`}
          >
            <Text className="text-surface-300 text-xs font-semibold">
              {ROLE_LABELS[member.role]}
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="bg-graphite rounded-lg px-3 py-1.5">
            <Text className="text-surface-300 text-xs font-semibold">
              {ROLE_LABELS[member.role]}
            </Text>
          </View>
        )}
        {canManage && member.user_id !== userId && (
          <TouchableOpacity
            onPress={() => handleRemoveMember(member)}
            className="min-w-[36px] min-h-[36px] items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={`Remove ${member.user_name}`}
          >
            <Ionicons name="close-outline" size={18} color="#D65F5F" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (membersLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#B9B9B6" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ScrollView className="flex-1 px-4 pt-4">
        {/* ─── Team Name + Description ──────────────── */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-surface-50 text-2xl font-bold flex-1">
              {/* Show name from first member's team — we don't have a useTeam hook */}
              Team
            </Text>
            {canDelete && (
              <TouchableOpacity
                onPress={() => {
                  deleteTeamMutation.mutate(teamId, {
                    onSuccess: () => router.back(),
                  });
                }}
                className="min-w-[44px] min-h-[44px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Delete team"
              >
                <Ionicons name="trash-outline" size={20} color="#D65F5F" />
              </TouchableOpacity>
            )}
          </View>

          {canManage && !editing && (
            <TouchableOpacity
              onPress={handleStartEdit}
              className="mt-4"
              accessibilityRole="button"
              accessibilityLabel="Edit team name and description"
            >
              <Text className="text-surface-300 text-sm font-medium underline">
                Edit
              </Text>
            </TouchableOpacity>
          )}

          {editing && (
            <View className="mt-4">
              <TextInput
                className="bg-card-soft text-surface-100 text-base rounded-xl px-4 py-3 border border-border mb-3"
                placeholder="Team name"
                placeholderTextColor="#707074"
                value={editName}
                onChangeText={setEditName}
                autoFocus
              />
              <TextInput
                className="bg-card-soft text-surface-100 text-base rounded-xl px-4 py-3 border border-border mb-4"
                placeholder="Description (optional)"
                placeholderTextColor="#707074"
                value={editDesc}
                onChangeText={setEditDesc}
                multiline
                numberOfLines={2}
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={() => setEditing(false)}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    title="Save"
                    variant="primary"
                    onPress={handleSaveEdit}
                    loading={updateTeamMutation.isPending}
                  />
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* ─── Members ──────────────────────────────── */}
        <Card title="Members" className="mb-4">
          {ROLE_ORDER.map((role) => {
            const roleMembers = groupedMembers[role];
            if (roleMembers.length === 0) return null;
            return (
              <View key={role} className="mb-2">
                <Text className="text-surface-400 text-xs font-semibold uppercase tracking-wider mb-1">
                  {ROLE_LABELS[role]} ({roleMembers.length})
                </Text>
                {roleMembers.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))}
              </View>
            );
          })}

          {canManage && (
            <TouchableOpacity
              onPress={() => setShowAddMember((v) => !v)}
              className="flex-row items-center gap-2 mt-3"
              accessibilityRole="button"
              accessibilityLabel="Add member to team"
            >
              <Ionicons name="add-circle-outline" size={18} color="#B9B9B6" />
              <Text className="text-surface-300 text-sm font-medium">Add Member</Text>
            </TouchableOpacity>
          )}

          {showAddMember && (
            <View className="mt-4 pt-4 border-t border-border">
              <TextInput
                className="bg-card-soft text-surface-100 text-base rounded-xl px-4 py-3 border border-border mb-3"
                placeholder="User ID"
                placeholderTextColor="#707074"
                value={addUserId}
                onChangeText={setAddUserId}
                autoFocus
              />
              <View className="flex-row gap-2 mb-4">
                {(["athlete", "coach", "admin"] as TeamRole[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setAddRole(r)}
                    className={`rounded-lg px-4 py-2 ${
                      addRole === r ? "bg-brand-500" : "bg-graphite"
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={`Role: ${r}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        addRole === r ? "text-surface-950" : "text-surface-300"
                      }`}
                    >
                      {ROLE_LABELS[r]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Button
                title="Add"
                variant="primary"
                onPress={handleAddMember}
                loading={addMemberMutation.isPending}
              />
            </View>
          )}
        </Card>

        {/* ─── Invite Section ───────────────────────── */}
        <Card title="Invite" className="mb-4">
          <Text className="text-surface-400 text-sm mb-3">
            Generate an invite code to share with athletes so they can join this
            team.
          </Text>
          <Button
            title="Generate Invite Code"
            variant="secondary"
            onPress={handleGenerateInvite}
            loading={createInviteMutation.isPending}
          />
          {inviteCode && (
            <View className="mt-3 bg-card-soft rounded-xl p-3 border border-border">
              <Text className="text-surface-500 text-xs mb-1">Invite Code</Text>
              <Text className="text-surface-50 text-lg font-bold tracking-widest">
                {inviteCode}
              </Text>
            </View>
          )}
        </Card>

        {/* ─── Program Assignment ───────────────────── */}
        <Card title="Assign Program" className="mb-8">
          <Text className="text-surface-400 text-sm mb-3">
            Assign a training program to all members of this team.
          </Text>
          <Button
            title="Select Program"
            variant="secondary"
            icon="document-text-outline"
            onPress={() => {
              // Navigate to program assignment with team pre-selected
              router.push(`/(coach)/assign?teamId=${teamId}`);
            }}
          />
        </Card>
      </ScrollView>
    </ErrorBoundary>
  );
}
