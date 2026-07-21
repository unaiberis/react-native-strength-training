import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Card } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import { ScreenTitle } from "../../../shared/ui/ScreenTitle";
import { ScreenLayout } from "@/shared/ui/ScreenLayout";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { useAuth } from "../../auth/hooks/useAuth";
import { useProfileStats } from "../hooks/useProfileStats";
import { usePendingSyncCount } from "../hooks/usePendingSyncCount";
import { useProfileCoach } from "../hooks/useProfileCoach";
import { useUserTeams } from "../../coach/hooks/useTeams";
import { useAuthStore } from "../../../stores/auth-store";
import { useNotifications } from "../../notifications/hooks/useNotifications";
import { ProfileHeader } from "../components/ProfileHeader";
import { ProfileStats } from "../components/ProfileStats";
import { ProfileMenu } from "../components/ProfileMenu";

export function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const query = useProfileStats();
  const { data: syncCount } = usePendingSyncCount();
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const { coaches: myCoaches } = useProfileCoach();

  const userRole = useAuthStore((s) => s.role);
  const isTeamCoachFlag = useAuthStore((s) => s.isTeamCoach);
  const isCoachView = userRole === "coach" || isTeamCoachFlag;

  // ─── Derived data ─────────────────────────────────────────────────────
  const email = user?.email ?? "No email";
  const displayName =
    user?.displayName ?? email.split("@")[0] ?? "User";
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
      const confirmed = window.confirm(t`Are you sure you want to sign out?`);
      if (confirmed) logout();
      return;
    }
    Alert.alert(t`Sign Out`, t`Are you sure you want to sign out?`, [
      { text: t`Cancel`, style: "cancel" },
      { text: t`Sign Out`, style: "destructive", onPress: logout },
    ]);
  };

  const handleEditProfile = () => {
    router.push("/(tabs)/edit-profile");
  };

  const handleNotifications = () => {
    router.push("/(tabs)/notifications");
  };

  const handleHelp = () => {
    Alert.alert(
      t`Help & Support`,
      t`Contact support@example.com for assistance.`,
    );
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
      <Card title={t`My Teams`} className="mb-4">
        {teams.map((team) => (
          <TouchableOpacity
            key={team.id}
            onPress={() => {
              if (isCoach) {
                innerRouter.push(`/(coach)/teams/${team.id}`);
              } else {
                innerRouter.push(`/(tabs)/team/${team.id}`);
              }
            }}
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
                  <Trans>
                    {team.member_count} member
                    {team.member_count !== 1 ? "s" : ""}
                  </Trans>
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
        <ScreenLayout>
        <ScreenTitle title={t`Profile`} className="mb-6" />

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

        {/* ─── My Coach / Your Athletes ──────────────────────────── */}
        {isCoachView ? (
          <Card title={t`Coaching`} className="mb-4">
            <View className="flex-row items-center gap-3 py-2">
              <View className="w-10 h-10 rounded-full bg-graphite items-center justify-center">
                <Ionicons name="people-outline" size={20} color="#B9B9B6" />
              </View>
              <View className="flex-1">
                <Text className="text-surface-50 text-sm font-semibold">
                  <Trans>Your Athletes</Trans>
                </Text>
                <Text className="text-surface-400 text-xs">
                  <Trans>View and manage your athletes from the dashboard</Trans>
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card title={t`My Coach`} className="mb-4">
            {myCoaches.length === 0 ? (
              <View className="py-3 items-center">
                <Ionicons name="person-outline" size={24} color="#707074" />
                <Text className="text-surface-400 text-sm mt-2 text-center">
                  <Trans>You don't have a coach yet</Trans>
                </Text>
              </View>
            ) : (
              myCoaches.map((coach) => (
                <View
                  key={coach.id}
                  className="flex-row items-center gap-3 py-2 border-b border-border last:border-b-0"
                >
                  <View className="w-10 h-10 rounded-full bg-graphite items-center justify-center">
                    <Text className="text-surface-50 font-bold text-sm">
                      {coach.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-surface-50 text-sm font-semibold">
                      {coach.displayName}
                    </Text>
                    <Text className="text-surface-400 text-xs">
                      {coach.email}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Card>
        )}

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
                <Text className="text-surface-300 text-sm font-medium">
                  {syncBadge.text}
                </Text>
              </View>
              <Text className="text-surface-500 text-xs">
                <Trans>Changes queued for sync</Trans>
              </Text>
            </View>
          </Card>
        )}

        {/* ─── Profile Menu ──────────────────────────────────────────── */}
        <ProfileMenu
          onNotifications={handleNotifications}
          notificationUnreadCount={notificationUnreadCount}
          onWellness={() => router.push("/(tabs)/wellness")}
          onHistory={() => router.push("/(tabs)/history/index")}
          onHelp={handleHelp}
          onSignOut={handleLogout}
        />

        {/* ─── Account Info ────────────────────────────────────────── */}
        <Card title={t`Account Info`} className="mb-4">
          <View className="flex-row justify-between py-2 border-b border-border">
            <Text className="text-surface-400"><Trans>Member since</Trans></Text>
            <Text className="text-surface-100">{createdAt}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-surface-400"><Trans>User ID</Trans></Text>
            <Text
              className="text-surface-100 text-xs font-mono"
              numberOfLines={1}
            >
              {user?.id.slice(0, 12)}...
            </Text>
          </View>
        </Card>

        <View className="h-8" />
        </ScreenLayout>
      </ScrollView>
    </GradientBackground>
  );
}
