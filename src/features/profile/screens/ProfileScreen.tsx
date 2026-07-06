import { View, Text, ScrollView, Alert, Platform } from "react-native";
import { Card } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { useAuth } from "../../auth/hooks/useAuth";
import { useLingui } from "@lingui/react/macro";
import { Trans } from "@lingui/react/macro";

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t } = useLingui();

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

  const email = user?.email ?? t`No email`;
  const displayName =
    user?.user_metadata?.display_name ?? email.split("@")[0] ?? t`User`;
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : t`Unknown`;

  return (
    <GradientBackground>
    <ScrollView className="flex-1 px-4 pt-16">
      <Text className="text-surface-50 text-2xl font-bold mb-6"><Trans>Profile</Trans></Text>

      {/* User info card */}
      <Card className="mb-4">
        <View className="items-center mb-4">
          <View className="w-20 h-20 rounded-full bg-brand-500 items-center justify-center mb-3">
            <Text className="text-surface-950 text-3xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-surface-100 text-xl font-semibold">
            {displayName}
          </Text>
          <Text className="text-surface-400 text-sm mt-1">{email}</Text>
        </View>
      </Card>

      {/* Stats card */}
      <Card title={t`Account Info`} className="mb-4">
        <View className="flex-row justify-between py-2 border-b border-surface-800">
          <Text className="text-surface-400"><Trans>Member since</Trans></Text>
          <Text className="text-surface-100">{createdAt}</Text>
        </View>
        <View className="flex-row justify-between py-2">
          <Text className="text-surface-400"><Trans>User ID</Trans></Text>
          <Text className="text-surface-100 text-xs font-mono" numberOfLines={1}>
            {user?.id.slice(0, 12)}...
          </Text>
        </View>
      </Card>

      {/* Sign out */}
      <Button title={t`Sign Out`} variant="danger" onPress={handleLogout} />
    </ScrollView>
    </GradientBackground>
  );
}
