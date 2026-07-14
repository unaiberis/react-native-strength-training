import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import {
  useUserTeams,
  useCreateTeam,
  useDeleteTeam,
} from "@/features/coach/hooks/useTeams";
import type { UserTeam } from "@/types/pocketbase";

export default function TeamsScreen() {
  const router = useRouter();
  const { data: teams = [], isLoading, refetch, isRefetching } = useUserTeams();
  const createTeamMutation = useCreateTeam();
  const deleteTeamMutation = useDeleteTeam();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const handleCreate = useCallback(() => {
    const name = newName.trim();
    if (!name) {
      Alert.alert("Required", "Team name is required.");
      return;
    }
    createTeamMutation.mutate(
      { name, description: newDescription.trim() || undefined },
      {
        onSuccess: () => {
          setShowCreateForm(false);
          setNewName("");
          setNewDescription("");
        },
        onError: (err: any) => {
          Alert.alert("Error", err?.message ?? "Failed to create team.");
        },
      },
    );
  }, [newName, newDescription, createTeamMutation]);

  const handleDelete = useCallback(
    (team: UserTeam) => {
      const deleteFn = () => {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }
        deleteTeamMutation.mutate(team.id);
      };
      if (Platform.OS === "web") {
        if (window.confirm(`Delete "${team.name}"? This cannot be undone.`)) {
          deleteFn();
        }
        return;
      }
      Alert.alert("Delete Team", `Delete "${team.name}"? This cannot be undone.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deleteFn },
      ]);
    },
    [deleteTeamMutation],
  );

  const renderTeam = useCallback(
    ({ item }: { item: UserTeam }) => (
      <View className="flex-row items-center bg-card border border-border rounded-2xl p-4 mb-3 shadow-button">
        <TouchableOpacity
          onPress={() => router.push(`/(coach)/teams/${item.id}`)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`View team: ${item.name}`}
          className="flex-1"
        >
          <Text className="text-surface-50 font-semibold text-base">
            {item.name}
          </Text>
          {item.description ? (
            <Text className="text-surface-400 text-sm mt-1" numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </TouchableOpacity>
        <View className="items-end gap-2 ml-3">
          <View className="flex-row items-center gap-1">
            <Ionicons name="people-outline" size={14} color="#A4A4A8" />
            <Text className="text-surface-400 text-xs">
              {item.member_count}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            className="bg-graphite rounded-xl p-2 min-w-[36px] min-h-[36px] items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={`Delete team ${item.name}`}
          >
            <Ionicons name="trash-outline" size={16} color="#D65F5F" />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [router, handleDelete],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#B9B9B6" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, backgroundColor: "#050505" }}>
        {/* Header + Create button */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-surface-50 text-[34px] font-black tracking-[-0.8]">Teams</Text>
          <TouchableOpacity
            onPress={() => setShowCreateForm((v) => !v)}
            className="bg-brand-500 rounded-xl px-4 py-2.5 flex-row items-center gap-2"
            accessibilityRole="button"
            accessibilityLabel="Create new team"
          >
            <Ionicons name="add" size={18} color="#050505" />
            <Text className="text-surface-950 font-bold text-sm">New Team</Text>
          </TouchableOpacity>
        </View>

        {/* Create form */}
        {showCreateForm && (
          <Card className="mb-4">
            <TextInput
              className="bg-card-soft text-surface-100 text-base rounded-xl px-4 py-3 border border-border mb-3"
              placeholder="Team name"
              placeholderTextColor="#707074"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              accessibilityLabel="Team name"
            />
            <TextInput
              className="bg-card-soft text-surface-100 text-base rounded-xl px-4 py-3 border border-border mb-4"
              placeholder="Description (optional)"
              placeholderTextColor="#707074"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={3}
              accessibilityLabel="Team description"
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setShowCreateForm(false);
                    setNewName("");
                    setNewDescription("");
                  }}
                />
              </View>
              <View className="flex-1">
                <Button
                  title="Create"
                  variant="primary"
                  onPress={handleCreate}
                  loading={createTeamMutation.isPending}
                />
              </View>
            </View>
          </Card>
        )}

        {teams.length === 0 && !showCreateForm ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 rounded-full bg-graphite items-center justify-center mb-4">
              <Ionicons name="shield-outline" size={28} color="#B9B9B6" />
            </View>
            <Text className="text-surface-50 text-lg font-semibold mb-2">
              No Teams Yet
            </Text>
            <Text className="text-surface-400 text-center text-sm leading-5">
              Create a team to start managing athletes and assigning programs
              together.
            </Text>
          </View>
        ) : (
          <FlatList
            data={teams}
            keyExtractor={(item) => item.id}
            renderItem={renderTeam}
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
