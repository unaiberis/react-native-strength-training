import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/auth-store";
import { View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "../../src/shared/ui/GradientBackground";
import { OfflineBanner } from "../../src/shared/ui/OfflineBanner";

const MAIN_TABS = [
  { key: "calendar", label: "Calendar", icon: "calendar-outline" as const },
  { key: "home", label: "Home", icon: "home-outline" as const },
  { key: "train", label: "Train", icon: "barbell-outline" as const },
  { key: "analytics", label: "Analytics", icon: "stats-chart-outline" as const },
  { key: "profile", label: "Profile", icon: "person-outline" as const },
];

const COACH_SUBMENU = [
  { key: "athletes", label: "Athletes", icon: "people-outline" as const },
  { key: "workout-templates", label: "Templates", icon: "barbell-outline" as const },
];

function MainTabBar() {
  const router = useRouter();
  const pathname = require("expo-router").usePathname();

  return (
    <View style={{ backgroundColor: "#0B0B0C", borderTopColor: "#343437", borderTopWidth: 1 }}>
      {/* Coach submenu */}
      <View style={{ flexDirection: "row", paddingTop: 8, paddingBottom: 8, borderBottomColor: "#343437", borderBottomWidth: 1 }}>
        {COACH_SUBMENU.map((item) => {
          const isActive = pathname.includes(`/${item.key}`);
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => router.push(`/(coach)/${item.key}`)}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Ionicons name={item.icon} size={20} color={isActive ? "#B9B9B6" : "#71717a"} />
              <Text style={{ fontSize: 10, color: isActive ? "#B9B9B6" : "#71717a", marginTop: 2 }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Main tabs */}
      <View style={{ flexDirection: "row", paddingTop: 4, paddingBottom: 4, height: 56 }}>
        {MAIN_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => router.replace(`/(tabs)/${tab.key}`)}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            <Ionicons name={tab.icon} size={22} color="#71717a" />
            <Text style={{ fontSize: 10, color: "#71717a", marginTop: 2 }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function CoachStackLayout() {
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
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#050505" },
          }}
        >
          <Stack.Screen name="athletes" />
          <Stack.Screen name="workout-templates" />
          <Stack.Screen name="index" />
          <Stack.Screen name="athlete/[id]" />
          <Stack.Screen name="athlete/[id]/calendar" />
          <Stack.Screen name="analytics/[athleteId]" />
          <Stack.Screen name="library/index" />
          <Stack.Screen name="library/create" />
          <Stack.Screen name="library/[id]/edit" />
          <Stack.Screen name="assign" />
          <Stack.Screen name="teams/[id]" />
          <Stack.Screen name="workout-builder/index" />
          <Stack.Screen name="workout-builder/[id]" />
          <Stack.Screen name="assigned-programs" />
          <Stack.Screen name="assignment/[id]" />
        </Stack>
        <MainTabBar />
      </View>
    </GradientBackground>
  );
}
