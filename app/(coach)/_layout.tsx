import { useEffect } from "react";
import { Tabs, useRouter, type BottomTabBarProps } from "expo-router";
import { useAuthStore } from "../../src/stores/auth-store";
import { View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "../../src/shared/ui/GradientBackground";
import { OfflineBanner } from "../../src/shared/ui/OfflineBanner";

/**
 * Coach tab routes that should appear in the tab bar.
 * Hidden routes (athlete/[id], library/*, etc.) are NOT listed here —
 * they are navigated to via router.push() and rendered by the Tabs navigator
 * but never shown in the tab bar.
 */
const COACH_TABS = ["athletes", "teams", "workout-templates"] as const;

const TAB_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  athletes: { label: "Athletes", icon: "people-outline" },
  teams: { label: "Teams", icon: "shield-outline" },
  "workout-templates": { label: "Templates", icon: "barbell-outline" },
};

function CoachTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#0B0B0C",
        borderTopColor: "#343437",
        borderTopWidth: 1,
        paddingTop: 4,
        paddingBottom: 4,
        height: 56,
      }}
    >
      {COACH_TABS.map((tabName) => {
        const config = TAB_CONFIG[tabName];
        const routeIndex = state.routes.findIndex((r) => r.name === tabName);
        if (routeIndex === -1) return null;

        const isFocused = state.index === routeIndex;

        return (
          <TouchableOpacity
            key={tabName}
            onPress={() => {
              if (!isFocused) {
                navigation.navigate(tabName);
              }
            }}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            accessibilityRole="button"
            accessibilityLabel={config.label}
          >
            <Ionicons
              name={config.icon}
              size={22}
              color={isFocused ? "#B9B9B6" : "#71717a"}
            />
            <Text
              style={{
                fontSize: 10,
                color: isFocused ? "#B9B9B6" : "#71717a",
                marginTop: 2,
              }}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function CoachTabsLayout() {
  const router = useRouter();
  const { state } = useAuthStore();

  useEffect(() => {
    if (state === "unauthenticated") {
      const id = setTimeout(() => router.replace("/(auth)/login"), 0);
      return () => clearTimeout(id);
    }
  }, [state, router]);

  return (
    <GradientBackground>
      <View style={{ flex: 1, backgroundColor: "#050505" }}>
        <OfflineBanner />
        <Tabs
          tabBar={(props) => <CoachTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#050505" },
          }}
        >
          {/* Visible tabs */}
          <Tabs.Screen name="athletes" options={{ title: "Athletes" }} />
          <Tabs.Screen name="teams" options={{ title: "Teams" }} />
          <Tabs.Screen
            name="workout-templates"
            options={{ title: "Templates" }}
          />

          {/* Hidden routes — navigated via router.push, not in tab bar */}
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="athlete/[id]" options={{ href: null }} />
          <Tabs.Screen name="athlete/[id]/calendar" options={{ href: null }} />
          <Tabs.Screen name="analytics/[athleteId]" options={{ href: null }} />
          <Tabs.Screen name="library/index" options={{ href: null }} />
          <Tabs.Screen name="library/create" options={{ href: null }} />
          <Tabs.Screen name="library/[id]/edit" options={{ href: null }} />
          <Tabs.Screen name="assign" options={{ href: null }} />
          <Tabs.Screen name="teams/[id]" options={{ href: null }} />
          <Tabs.Screen name="workout-builder/index" options={{ href: null }} />
          <Tabs.Screen name="workout-builder/[id]" options={{ href: null }} />
          <Tabs.Screen name="assigned-programs" options={{ href: null }} />
          <Tabs.Screen name="assignment/[id]" options={{ href: null }} />
        </Tabs>
      </View>
    </GradientBackground>
  );
}
