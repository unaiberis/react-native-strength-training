import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/auth-store";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "../../src/shared/ui/GradientBackground";
import { OfflineBanner } from "../../src/shared/ui/OfflineBanner";

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "grid-outline",
  athletes: "people-outline",
  library: "barbell-outline",
  teams: "shield-outline",
  "workout-templates": "document-text-outline",
};

const tabLabels: Record<string, string> = {
  index: "Dashboard",
  athletes: "Athletes",
  library: "Library",
  teams: "Teams",
  "workout-templates": "Templates",
};

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
      <View className="flex-1">
        <OfflineBanner />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: "#0B0B0C",
              borderTopColor: "#343437",
              borderTopWidth: 1,
              paddingTop: 4,
              height: 56,
            },
            tabBarActiveTintColor: "#B9B9B6",
            tabBarInactiveTintColor: "#707074",
          }}
        >
          {/* Tab bar screens */}
          {(["index", "athletes", "library", "teams", "workout-templates"] as const).map((name) => (
            <Tabs.Screen
              key={name}
              name={name}
              options={{
                title: tabLabels[name],
                tabBarIcon: ({ focused }) => (
                  <Ionicons
                    name={tabIcons[name]}
                    size={22}
                    color={focused ? "#B9B9B6" : "#71717a"}
                  />
                ),
              }}
            />
          ))}

          {/* Hidden routes — navigated from screens, not shown in tab bar */}
          <Tabs.Screen
            name="dashboard"
            options={{ href: null, headerShown: true, headerTitle: "Dashboard", headerStyle: { backgroundColor: "#050505" }, headerTintColor: "#F4F4F2" }}
          />
          <Tabs.Screen
            name="athlete/[id]"
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
