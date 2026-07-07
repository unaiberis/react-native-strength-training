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
import { Card } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { useAuth } from "../../auth/hooks/useAuth";
import { usePersonalRecords } from "../../records/hooks/usePersonalRecords";
import { useProfileStats } from "../hooks/useProfileStats";
import { usePendingSyncCount } from "../hooks/usePendingSyncCount";

type WeightUnit = "kg" | "lbs";

export function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: stats, isLoading: statsLoading } = useProfileStats();
  const { totalPRs } = usePersonalRecords();
  const { data: syncCount } = usePendingSyncCount();

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

  const totalWorkouts = stats?.totalWorkouts ?? 0;
  const currentStreak = stats?.currentStreak ?? 0;

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

  const handleSaveBodyweight = () => {
    const num = parseFloat(bodyweight);
    if (isNaN(num) || num <= 0) {
      Alert.alert("Invalid weight", "Please enter a valid number");
      return;
    }
    setIsEditingBodyweight(false);
    // Future: persist to DB or preferences store
  };

  // ─── Stat card helper ──────────────────────────────────────────────────
  function StatItem({
    label,
    value,
    loading,
  }: {
    label: string;
    value: string | number;
    loading?: boolean;
  }) {
    return (
      <View className="flex-1 items-center py-3">
        <Text className="text-surface-100 text-2xl font-extrabold">
          {loading ? "\u2014" : value}
        </Text>
        <Text className="text-surface-400 text-xs mt-1">{label}</Text>
      </View>
    );
  }

  return (
    <GradientBackground>
      <ScrollView className="flex-1 px-4 pt-16">
        <Text className="text-surface-50 text-2xl font-bold mb-6">
          Profile
        </Text>

        {/* ─── Avatar + User Info ──────────────────────────────────── */}
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

        {/* ─── Stats Grid ──────────────────────────────────────────── */}
        <Card className="mb-4">
          <View className="flex-row">
            <StatItem
              label="Workouts"
              value={totalWorkouts}
              loading={statsLoading}
            />
            <View className="w-px bg-border self-stretch my-1" />
            <StatItem
              label="Streak"
              value={`${currentStreak} days`}
              loading={statsLoading}
            />
            <View className="w-px bg-border self-stretch my-1" />
            <StatItem
              label="PRs"
              value={totalPRs}
            />
          </View>
        </Card>

        {/* ─── Bodyweight ──────────────────────────────────────────── */}
        <Card title="Bodyweight" className="mb-4">
          <View className="flex-row items-center justify-between">
            {isEditingBodyweight ? (
              <View className="flex-row items-center flex-1 gap-3">
                <TextInput
                  className="flex-1 bg-card-soft text-surface-100 text-lg font-semibold rounded-xl px-4 py-3 border border-border"
                  placeholder="Enter weight"
                  placeholderTextColor="#707074"
                  keyboardType="decimal-pad"
                  value={bodyweight}
                  onChangeText={setBodyweight}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={handleSaveBodyweight}
                  className="bg-brand-500 rounded-xl px-5 py-3"
                >
                  <Text className="text-surface-950 font-bold">Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setIsEditingBodyweight(false);
                    setBodyweight("");
                  }}
                  className="rounded-xl px-3 py-3"
                >
                  <Text className="text-surface-400 font-bold">Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View className="flex-row items-center gap-3">
                  <Text className="text-surface-100 text-lg font-semibold">
                    {bodyweight
                      ? `${bodyweight} ${weightUnit}`
                      : "Not set"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsEditingBodyweight(true)}
                  className="bg-card-soft rounded-xl px-4 py-2 border border-border"
                >
                  <Text className="text-surface-300 text-sm font-semibold">
                    Edit
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Card>

        {/* ─── Unit Preference ─────────────────────────────────────── */}
        <Card title="Units" className="mb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-surface-300 text-base">Weight unit</Text>
            <View className="flex-row bg-card-soft rounded-xl overflow-hidden border border-border">
              <TouchableOpacity
                onPress={() => setWeightUnit("kg")}
                className={`px-5 py-2.5 ${
                  weightUnit === "kg" ? "bg-brand-500" : ""
                }`}
              >
                <Text
                  className={`font-bold ${
                    weightUnit === "kg"
                      ? "text-surface-950"
                      : "text-surface-400"
                  }`}
                >
                  kg
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setWeightUnit("lbs")}
                className={`px-5 py-2.5 ${
                  weightUnit === "lbs" ? "bg-brand-500" : ""
                }`}
              >
                <Text
                  className={`font-bold ${
                    weightUnit === "lbs"
                      ? "text-surface-950"
                      : "text-surface-400"
                  }`}
                >
                  lbs
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* ─── Account Info ────────────────────────────────────────── */}
        <Card title="Account Info" className="mb-4">
          <View className="flex-row justify-between py-2 border-b border-border">
            <Text className="text-surface-400">Member since</Text>
            <Text className="text-surface-100">{createdAt}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-border">
            <Text className="text-surface-400">User ID</Text>
            <Text
              className="text-surface-100 text-xs font-mono"
              numberOfLines={1}
            >
              {user?.id.slice(0, 12)}...
            </Text>
          </View>
        </Card>

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
                Changes queued for sync
              </Text>
            </View>
          </Card>
        )}

        {/* ─── Quick Links ─────────────────────────────────────────── */}
        <Card title="Quick Links" className="mb-4">
          <View className="gap-3">
            <Button
              title="Wellness Dashboard"
              variant="secondary"
              icon="heart-outline"
              onPress={() => router.push("/(tabs)/wellness")}
            />
            <Button
              title="Export Data"
              variant="secondary"
              icon="download-outline"
              onPress={() => {
                Alert.alert(
                  "Export Data",
                  "Data export will be available in a future update.",
                );
              }}
            />
          </View>
        </Card>

        {/* ─── Sign out ────────────────────────────────────────────── */}
        <View className="mb-8">
          <Button
            title="Sign Out"
            variant="danger"
            icon="log-out-outline"
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </GradientBackground>
  );
}
