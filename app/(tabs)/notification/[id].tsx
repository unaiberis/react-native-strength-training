import { useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackButton } from "@/shared/ui/BackButton";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import type { AppNotification } from "@/features/notifications/hooks/useNotifications";

// ─── Type Display Map ────────────────────────────────────────────────────

const typeLabels: Record<string, string> = {
  workout_assigned: "Workout Assigned",
  program_updated: "Program Updated",
  feedback_reply: "Feedback Reply",
  achievement: "Achievement",
  system: "System Notification",
};

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  workout_assigned: "calendar-outline",
  program_updated: "document-text-outline",
  feedback_reply: "chatbubble-outline",
  achievement: "trophy-outline",
  system: "information-circle-outline",
};

const typeActions: Record<
  string,
  { label: string; route: string } | null
> = {
  workout_assigned: { label: "View Workout", route: "/(tabs)/train" },
  program_updated: { label: "View Program", route: "/(tabs)/programs" },
  feedback_reply: {
    label: "View Feedback",
    route: "/(tabs)/history/index",
  },
  achievement: { label: "View Achievement", route: "/(tabs)/progress" },
  system: null,
};

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Screen ──────────────────────────────────────────────────────────────

export default function NotificationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    type: AppNotification["type"];
    title: string;
    body: string;
    createdAt: string;
    hasAction: string;
  }>();

  const { id, type, title, body, createdAt, hasAction } = params;

  const displayType = typeLabels[type] ?? "Notification";
  const iconName = typeIcons[type] ?? "information-circle-outline";
  const action = typeActions[type] ?? null;

  const handleAction = useCallback(() => {
    if (action) {
      router.push(action.route as any);
    }
  }, [action, router]);

  return (
    <GradientBackground>
      <ScrollView className="flex-1 px-4 pt-16">
        {/* ─── Header with back ───────────────────────────────────── */}
        <View className="flex-row items-center mb-6">
          <BackButton fallbackRoute="/(tabs)/notifications" />
          <ScreenTitle title="Notification" />
        </View>

        {/* ─── Notification Card ──────────────────────────────────── */}
        <Card className="mb-4">
          {/* Type Badge */}
          <View className="flex-row items-center gap-2 mb-4">
            <View className="w-8 h-8 rounded-full bg-titanium/10 items-center justify-center">
              <Ionicons name={iconName} size={18} color="#B9B9B6" />
            </View>
            <Text className="text-surface-400 text-sm font-medium">
              {displayType}
            </Text>
          </View>

          {/* Title */}
          <Text className="text-surface-50 text-[23px] font-extrabold mb-3">
            {title ?? "Notification"}
          </Text>

          {/* Body */}
          <Text className="text-surface-300 text-[17px] leading-6 mb-6">
            {body ?? "No content"}
          </Text>

          {/* Timestamp */}
          <View className="flex-row items-center gap-2 pt-4 border-t border-border">
            <Ionicons name="time-outline" size={16} color="#707074" />
            <Text className="text-surface-500 text-sm">
              {createdAt ? formatTimestamp(createdAt) : ""}
            </Text>
          </View>
        </Card>

        {/* ─── Action Button ──────────────────────────────────────── */}
        {hasAction === "1" && action && (
          <Button
            title={action.label}
            variant="primary"
            onPress={handleAction}
          />
        )}

        <View className="h-8" />
      </ScrollView>
    </GradientBackground>
  );
}
