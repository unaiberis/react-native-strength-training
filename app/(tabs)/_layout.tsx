import { useEffect, useMemo, useState } from "react";
import { Tabs, useRouter, usePathname } from "expo-router";
import { useAuthStore } from "../../src/stores/auth-store";
import { Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "../../src/shared/ui/GradientBackground";

function SyncBanner() {
  const isOnline = useAuthStore((s) => s.isOnline);
  const syncStatus = useAuthStore((s) => s.syncStatus);

  const banner = useMemo(() => {
    if (!isOnline) return { text: "You're offline — changes sync when connected", bg: "bg-amber-900/60", textColor: "text-amber-300" };
    if (syncStatus === "syncing") return { text: "Syncing\u2026", bg: "bg-brand-900/40", textColor: "text-brand-300" };
    if (syncStatus === "dead-letters") return { text: "Some changes couldn't sync", bg: "bg-red-900/40", textColor: "text-red-300" };
    if (syncStatus === "auth-expired") return { text: "Session expired. Log in again to sync.", bg: "bg-red-900/40", textColor: "text-red-300" };
    if (syncStatus === "error") return { text: "Sync error", bg: "bg-amber-900/40", textColor: "text-amber-300" };
    return null;
  }, [isOnline, syncStatus]);

  if (!banner) return null;

  return (
    <View className={`${banner.bg} py-1.5 px-4`}>
      <Text className={`${banner.textColor} text-xs text-center font-medium`}>
        {banner.text}
      </Text>
    </View>
  );
}

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "calendar-outline",
  home: "home-outline",
  train: "barbell-outline",
  analytics: "stats-chart-outline",
  profile: "person-outline",
  coach: "shield-outline",
};

const COACH_SUBMENU = [
  { key: "athletes", label: "Athletes", icon: "people-outline" as const },
  { key: "teams", label: "Teams", icon: "shield-outline" as const },
  { key: "templates", label: "Templates", icon: "barbell-outline" as const },
];

export default function TabsLayout() {
  const router = useRouter();
  const { state, role, isTeamCoach } = useAuthStore();

  /**
   * Auth guards:
   * 1. Unauthenticated → redirect to login
   * 2. Coaches now stay in main tabs — Coach tab is visible for them
   */
  useEffect(() => {
    if (state === "unauthenticated") {
      const id = setTimeout(() => router.replace("/(auth)/login"), 0);
      return () => clearTimeout(id);
    }
  }, [state, router]);

  const [coachMenuOpen, setCoachMenuOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close coach submenu when navigating away
  useEffect(() => {
    if (!pathname.startsWith("/(coach)")) {
      setCoachMenuOpen(false);
    }
  }, [pathname]);

  return (
    <GradientBackground>
      <View style={{ flex: 1, backgroundColor: "#050505" }}>
      <SyncBanner />
      
      {/* Coach Submenu — appears above tab bar when Coach is selected */}
      {coachMenuOpen && (
        <View style={{
          flexDirection: "row",
          backgroundColor: "#0B0B0C",
          borderBottomColor: "#343437",
          borderBottomWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
        }}>
          {COACH_SUBMENU.map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => router.push(`/(coach)/${item.key}`)}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Ionicons name={item.icon} size={20} color="#B9B9B6" />
              <Text style={{ fontSize: 10, color: "#B9B9B6", marginTop: 2 }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#050505" },
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
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ focused }) => (
            <Ionicons name={tabIcons.index} size={22} color={focused ? "#B9B9B6" : "#71717a"} />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <Ionicons name={tabIcons.home} size={22} color={focused ? "#B9B9B6" : "#71717a"} />
          ),
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: "Train",
          tabBarIcon: ({ focused }) => (
            <Ionicons name={tabIcons.train} size={22} color={focused ? "#B9B9B6" : "#71717a"} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ focused }) => (
            <Ionicons name={tabIcons.analytics} size={22} color={focused ? "#B9B9B6" : "#71717a"} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <Ionicons name={tabIcons.profile} size={22} color={focused ? "#B9B9B6" : "#71717a"} />
          ),
        }}
      />
      {/* Coach tab — toggles submenu, navigates to coach dashboard */}
      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
          href: isTeamCoach ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={tabIcons.coach} size={22} color={focused ? "#B9B9B6" : "#71717a"} />
          ),
        }}
      />
      {/* Hidden routes — navigated to from other screens, not shown in tab bar */}
      <Tabs.Screen name="index" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="exercises/index" options={{ href: null, tabBarItemStyle: { display: 'none' }, headerShown: true, headerTitle: "Exercise Library", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
      <Tabs.Screen name="exercises/[id]" options={{ href: null, tabBarItemStyle: { display: 'none' }, headerShown: true, headerTitle: "Exercise Details", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
      <Tabs.Screen name="history/index" options={{ href: null, tabBarItemStyle: { display: 'none' }, headerShown: true, headerTitle: "Workout History", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
      <Tabs.Screen name="history/[id]" options={{ href: null, tabBarItemStyle: { display: 'none' }, headerShown: true, headerTitle: "Workout Details", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
      <Tabs.Screen name="analytics/exercise/[id]" options={{ href: null, tabBarItemStyle: { display: 'none' }, headerShown: true, headerTitle: "Exercise Progress", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
      <Tabs.Screen name="wellness" options={{ href: null, tabBarItemStyle: { display: 'none' }, headerShown: true, headerTitle: "Wellness", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
      <Tabs.Screen name="notifications" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="notification/[id]" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="unit-preferences" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
    </Tabs>
      </View>
    </GradientBackground>
  );
}
