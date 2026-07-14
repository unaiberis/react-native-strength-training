import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { useAuth } from "../../auth/hooks/useAuth";
import { useProfileStats } from "../hooks/useProfileStats";
import { usePendingSyncCount } from "../hooks/usePendingSyncCount";
import { useUserTeams } from "../../coach/hooks/useTeams";
import { useAuthStore } from "@/stores/auth-store";
import { useNotifications } from "../../notifications/hooks/useNotifications";
import { ProfileHeader } from "../components/ProfileHeader";
import { ProfileStats } from "../components/ProfileStats";
import { ProfileMenu } from "../components/ProfileMenu";

type WeightUnit = "kg" | "lbs";

export function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const query = useProfileStats();
  const { data: syncCount } = usePendingSyncCount();
  const { unreadCount: notificationUnreadCount } = useNotifications();

  // ─── Local state for editable fields ──────────────────────────────────
  const [bodyweight, setBodyweight] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [isEditingBodyweight, setIsEditingBodyweight] = useState(false);

  // ─── Derived data ─────────────────────────────────────────────────────
  const email = user?.email ?? "No email";
  const displayName =
    user?.user_metadata?.display_name ?? email.split("@")[0] ?? "User";
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : "Unknown";

  const stats = query.data;
  const totalWorkouts = stats?.totalWorkouts ?? 0;
  const currentStreak = stats?.currentStreak ?? 0;
  const personalRecords = stats?.personalRecords ?? 0;
  const totalVolume = stats?.totalVolume ?? 0;
  const statsLoading = query.isLoading;

  const syncBadge = useMemo(() => {
    if (!syncCount) return null;
    const { pending, deadLetters, authErrors } = syncCount;
    const total = pending + deadLetters + authErrors;
    if (total === 0) return null;

    if (deadLetters > 0 || authErrors > 0) {
      return {
        text: `${total} pending sync`,
        variant: "danger" as const,
      };
    }
    return {
      text: `${total} pending sync`,
      variant: "warning" as const,
    };
  }, [syncCount]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleLogout = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to sign out?");
      if (confirmed) logout();
      return;
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const handleEditProfile = () => {
    Alert.alert(
      "Edit Profile",
      "Profile editing will be available in a future update.",
    );
  };

  const handleNotifications = () => {
    router.push("/(tabs)/notifications");
  };

  const handleHelp = () => {
    Alert.alert(
      "Help & Support",
      "Contact support@example.com for assistance.",
    );
  };

  const handleSaveBodyweight = () => {
    const num = parseFloat(bodyweight);
    if (isNaN(num) || num <= 0) {
      Alert.alert("Invalid weight", "Please enter a valid number");
      return;
    }
    setIsEditingBodyweight(false);
    // Future: persist to DB or preferences store
  };

  /** Teams section — shows the user's team memberships. */
  function MyTeamsSection() {
    const { data: teams, isLoading: teamsLoading } = useUserTeams();
    const innerRouter = useRouter();
    const isCoach =
      useAuthStore((s) => s.role === "coach") ||
      useAuthStore((s) => s.isTeamCoach);

    if (teamsLoading) return null;
    if (!teams || teams.length === 0) return null;

    return (
      <Card title="My Teams" className="mb-4">
        {teams.map((team) => (
          <TouchableOpacity
            key={team.id}
            onPress={() => innerRouter.push(`/(coach)/teams/${team.id}`)}
            className="flex-row items-center justify-between py-3 border-b border-border last:border-b-0"
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Team: ${team.name}`}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-graphite items-center justify-center">
                <Text className="text-surface-50 font-bold text-sm">
                  {team.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text className="text-surface-100 text-sm font-medium">
                  {team.name}
                </Text>
                <Text className="text-surface-400 text-xs">
                  {team.member_count} member
                  {team.member_count !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#707074" />
          </TouchableOpacity>
        ))}
      </Card>
    );
  }

  return (
    <GradientBackground>
      <ScrollView className="flex-1 px-4 pt-16">
        <ScreenTitle title="Profile" className="mb-6" />

        {/* ─── Profile Header ─────────────────────────────────────────── */}
        <ProfileHeader
          name={displayName}
          email={email}
          onEdit={handleEditProfile}
        />

        {/* ─── Stats Grid ─────────────────────────────────────────────── */}
        <ProfileStats
          totalWorkouts={totalWorkouts}
          currentStreak={currentStreak}
          personalRecords={personalRecords}
          totalVolume={totalVolume}
        />

        {/* ─── My Teams ────────────────────────────────────────────── */}
        <MyTeamsSection />

        {/* ─── Sync Status ─────────────────────────────────────────── */}
        {syncBadge && (
          <Card className="mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  className={`w-2.5 h-2.5 rounded-full ${
                    syncBadge.variant === "danger"
                      ? "bg-danger"
                      : "bg-amber-500"
                  }`}
                />
                <Text className="text-surface-100 text-sm font-medium">
                  {syncBadge.text}
                </Text>
              </View>
              <Text className="text-surface-500 text-xs">
                Changes queued for sync
              </Text>
            </View>
          </Card>
        )}

        {/* ─── Profile Menu ──────────────────────────────────────────── */}
        <ProfileMenu
          onEditProfile={handleEditProfile}
          onNotifications={handleNotifications}
          notificationUnreadCount={notificationUnreadCount}
          onUnitPreferences={() => router.push("/(tabs)/unit-preferences")}
          onWellness={() => router.push("/(tabs)/wellness")}
          onHistory={() => router.push("/(tabs)/history/index")}
          onHelp={handleHelp}
          onSignOut={handleLogout}
        />

        {/* ─── Bodyweight ──────────────────────────────────────────── */}
        <Card title="Bodyweight" className="mb-4">
          <View className="flex-row items-center justify-between">
            {isEditingBodyweight ? (
              <View className="flex-row items-center flex-1 gap-3">
                <TextInput
                  className="flex-1 bg-cardSoft text-surface-100 text-lg font-semibold rounded-xl px-4 py-3 border border-border"
                  placeholder="Enter weight"
                  placeholderTextColor="#707074"
                  keyboardType="decimal-pad"
                  value={bodyweight}
                  onChangeText={setBodyweight}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={handleSaveBodyweight}
                  accessibilityRole="button"
                  accessibilityLabel="Save bodyweight"
                  className="bg-titanium rounded-xl px-5 py-3"
                >
                  <Text className="text-background font-bold">Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setIsEditingBodyweight(false);
                    setBodyweight("");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel editing bodyweight"
                  className="rounded-xl px-3 py-3"
                >
                  <Text className="text-surface-400 font-bold">Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View className="flex-row items-center gap-3">
                  <Ionicons name="scale-outline" size={20} color="#A4A4A8" />
                  <Text className="text-surface-50 text-lg font-semibold">
                    {bodyweight
                      ? `${bodyweight} ${weightUnit}`
                      : "Not set"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsEditingBodyweight(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Edit bodyweight"
                  className="bg-cardSoft rounded-xl px-4 py-2 border border-border"
                >
                  <Text className="text-surface-100 text-sm font-semibold">
                    Edit
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Card>

        {/* ─── Account Info ────────────────────────────────────────── */}
        <Card title="Account Info" className="mb-4">
          <View className="flex-row justify-between py-2 border-b border-border">
            <Text className="text-surface-400">Member since</Text>
            <Text className="text-surface-50">{createdAt}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-surface-400">User ID</Text>
            <Text
              className="text-surface-50 text-xs font-mono"
              numberOfLines={1}
            >
              {user?.id.slice(0, 12)}...
            </Text>
          </View>
        </Card>

        <View className="h-8" />
      </ScrollView>
    </GradientBackground>
  );
}
