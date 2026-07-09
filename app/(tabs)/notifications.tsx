import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useNotifications, type AppNotification } from "@/features/notifications/hooks/useNotifications";

// ─── Relative Time Helper ────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

// ─── Type Icon Map ───────────────────────────────────────────────────────

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  workout_assigned: "calendar-outline",
  program_updated: "document-text-outline",
  feedback_reply: "chatbubble-outline",
  achievement: "trophy-outline",
  system: "information-circle-outline",
};

// ─── Screen ──────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, refetch } =
    useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    refetch();
    await new Promise((resolve) => setTimeout(resolve, 300));
    setRefreshing(false);
  }, [refetch]);

  const handleNotificationPress = useCallback(
    (notification: AppNotification) => {
      if (!notification.read) {
        markAsRead(notification.id);
      }
      router.push({
        pathname: "/(tabs)/notification/[id]",
        params: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          createdAt: notification.created_at,
          hasAction: notification.type !== "system" ? "1" : "0",
        },
      });
    },
    [markAsRead, router],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // ─── Empty State ──────────────────────────────────────────────────
  if (notifications.length === 0) {
    return (
      <GradientBackground>
        <View className="flex-1 px-4 pt-16">
          <View className="flex-row items-center mb-6">
            <TouchableOpacity
              onPress={handleBack}
              className="mr-3"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={24} color="#B9B9B6" />
            </TouchableOpacity>
            <ScreenTitle title="Notifications" />
          </View>
          <EmptyState
            icon="notifications-outline"
            title="No notifications yet"
            subtitle='When you get notifications from your coach or achievements, they will appear here.'
          />
        </View>
      </GradientBackground>
    );
  }

  // ─── List View ────────────────────────────────────────────────────
  return (
    <GradientBackground>
      <View className="flex-1">
        {/* ─── Header ──────────────────────────────────────────────── */}
        <View className="flex-row items-center justify-between px-4 pt-16 pb-2">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={handleBack}
              className="mr-3"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={24} color="#B9B9B6" />
            </TouchableOpacity>
            <ScreenTitle title="Notifications" />
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications as read"
            >
              <Text className="text-titanium text-sm font-semibold">
                Mark All Read
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Notification List ───────────────────────────────────── */}
        <ScrollView
          className="flex-1 px-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#B9B9B6"
            />
          }
        >
          {notifications.map((notification) => {
            const iconName =
              typeIcons[notification.type] ?? "information-circle-outline";

            return (
              <TouchableOpacity
                key={notification.id}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${notification.title}. ${notification.body}`}
              >
                <Card
                  className={`mb-3 ${!notification.read ? "border-l-2 border-l-titanium" : ""}`}
                >
                  <View className="flex-row gap-3">
                    {/* Icon */}
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center ${
                        !notification.read ? "bg-titanium/10" : "bg-graphite"
                      }`}
                    >
                      <Ionicons
                        name={iconName}
                        size={20}
                        color={
                          !notification.read ? "#B9B9B6" : "#707074"
                        }
                      />
                    </View>

                    {/* Content */}
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text
                          className={`text-[15px] flex-shrink mr-2 ${
                            !notification.read
                              ? "text-surface-50 font-semibold"
                              : "text-surface-100 font-medium"
                          }`}
                          numberOfLines={1}
                        >
                          {notification.title}
                        </Text>
                        <Text className="text-surface-500 text-xs">
                          {timeAgo(notification.created_at)}
                        </Text>
                      </View>
                      <Text
                        className="text-surface-400 text-sm leading-5"
                        numberOfLines={2}
                      >
                        {notification.body}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}

          <View className="h-8" />
        </ScrollView>
      </View>
    </GradientBackground>
  );
}
