import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { View, Pressable, Text, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { OfflineBanner } from "@/shared/ui/OfflineBanner";
import {
  TAB_BAR_BG,
  TAB_BAR_BORDER,
  TAB_BAR_HEIGHT,
  TAB_BAR_ACTIVE_TINT,
  TAB_BAR_INACTIVE_TINT,
} from "@/constants/theme";

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  athletes: "people-outline",
};

const tabLabels: Record<string, string> = {
  athletes: "Athletes",
};

function HeaderRight() {
  const user = useAuthStore((s) => s.user);
  const reset = useAuthStore((s) => s.reset);
  const initial = (user?.displayName ?? user?.email ?? "?").charAt(0).toUpperCase();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => reset(),
        },
      ],
    );
  };

  return (
    <Pressable
      onPress={handleLogout}
      className="w-9 h-9 rounded-full bg-card border border-border items-center justify-center active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel="Account"
    >
      <Text className="text-surface-50 text-sm font-bold">{initial}</Text>
    </Pressable>
  );
}

export default function CoachTabsLayout() {
  const router = useRouter();
  const { state } = useAuthStore();

  /**
   * If the user is not authenticated, redirect to the auth flow.
   */
  useEffect(() => {
    if (state === "unauthenticated") {
      const id = setTimeout(() => router.replace("/(auth)/login"), 0);
      return () => clearTimeout(id);
    }
  }, [state, router]);

  return (
    <GradientBackground>
      <View className="flex-1 bg-soft">
        <OfflineBanner />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: TAB_BAR_BG,
              borderTopColor: TAB_BAR_BORDER,
              borderTopWidth: 1,
              paddingTop: 4,
              height: TAB_BAR_HEIGHT,
            },
            tabBarActiveTintColor: TAB_BAR_ACTIVE_TINT,
            tabBarInactiveTintColor: TAB_BAR_INACTIVE_TINT,
          }}
        >
          {/* Primary tab: Athletes */}
          <Tabs.Screen
            name="athletes"
            options={{
              title: "Athletes",
              headerShown: true,
              headerTitle: "Athletes",
              headerStyle: { backgroundColor: "#050505" },
              headerTintColor: "#F4F4F2",
              headerTitleStyle: { fontWeight: "700" },
              headerShadowVisible: false,
              headerRight: () => <HeaderRight />,
              tabBarIcon: ({ focused }) => (
                <Ionicons
                  name={tabIcons.athletes}
                  size={22}
                  color={focused ? TAB_BAR_ACTIVE_TINT : TAB_BAR_INACTIVE_TINT}
                />
              ),
            }}
          />

          {/* Hidden routes — navigated from screens, not shown in tab bar */}
          <Tabs.Screen
            name="index"
            options={{ href: null }}
          />
          <Tabs.Screen
            name="athlete/[id]"
            options={{ href: null, headerShown: false }}
          />
          <Tabs.Screen
            name="athlete/[id]/calendar"
            options={{ href: null, headerShown: false }}
          />
          <Tabs.Screen
            name="analytics/[athleteId]"
            options={{ href: null, headerShown: false }}
          />
          <Tabs.Screen
            name="library/index"
            options={{ href: null }}
          />
          <Tabs.Screen
            name="library/create"
            options={{ href: null, headerShown: false }}
          />
          <Tabs.Screen
            name="library/[id]/edit"
            options={{ href: null, headerShown: false }}
          />
          <Tabs.Screen
            name="assign"
            options={{ href: null, headerShown: false }}
          />
          <Tabs.Screen
            name="teams/[id]"
            options={{ href: null, headerShown: false }}
          />
          <Tabs.Screen
            name="workout-builder/index"
            options={{ href: null, headerShown: false }}
          />
          <Tabs.Screen
            name="workout-builder/[id]"
            options={{ href: null, headerShown: false }}
          />
          <Tabs.Screen
            name="assigned-programs"
            options={{ href: null, headerShown: false }}
          />
          <Tabs.Screen
            name="assignment/[id]"
            options={{ href: null, headerShown: false }}
          />
        </Tabs>
      </View>
    </GradientBackground>
  );
}
