import { View, Text } from "react-native";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ProfileStatsProps {
  totalWorkouts: number;
  currentStreak: number;
  personalRecords: number;
  totalVolume: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  return `${Math.round(kg).toLocaleString()}`;
}

function formatStreak(days: number): string {
  return `${days} day${days !== 1 ? "s" : ""}`;
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  value: string;
  label: string;
}

function StatCard({ value, label }: StatCardProps) {
  return (
    <View className="bg-card border border-border rounded-xl p-4 flex-1 min-w-[45%]">
      <Text className="text-titanium text-2xl font-extrabold">{value}</Text>
      <Text className="text-surface-500 text-xs uppercase tracking-wider mt-1 font-semibold">
        {label}
      </Text>
    </View>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Horizontal grid of 4 stat cards showing workout summary metrics.
 *
 * Displays in a 2x2 grid: Total Workouts | Current Streak
 *                            Personal Records | Total Volume
 */
function ProfileStats({
  totalWorkouts,
  currentStreak,
  personalRecords,
  totalVolume,
}: ProfileStatsProps) {
  return (
    <View className="flex-row flex-wrap gap-3 mb-6">
      <StatCard
        value={String(totalWorkouts)}
        label="Total Workouts"
      />
      <StatCard
        value={formatStreak(currentStreak)}
        label="Current Streak"
      />
      <StatCard
        value={String(personalRecords)}
        label="Personal Records"
      />
      <StatCard
        value={formatVolume(totalVolume)}
        label="Total Volume"
      />
    </View>
  );
}

export { ProfileStats };
export default ProfileStats;
