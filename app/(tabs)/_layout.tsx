import { useEffect, useMemo } from "react";
import { Tabs, useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/auth-store";
import { Text, View } from "react-native";
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
  index: "home-outline",
  train: "barbell-outline",
  programs: "document-text-outline",
  progress: "trending-up-outline",
  profile: "person-outline",
};

export default function TabsLayout() {
  const router = useRouter();
  const { state } = useAuthStore();

  /**
   * If the user is not authenticated, redirect to the auth flow.
   * Diferido con setTimeout(0) para que el navegador esté montado
   * antes de intentar la navegación (evita "navigate before mounting Root Layout").
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
      <SyncBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#18181b",
            borderTopColor: "#27272a",
            borderTopWidth: 1,
            paddingTop: 4,
          },
          tabBarActiveTintColor: "#B9B9B6",
          tabBarInactiveTintColor: "#71717a",
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <Ionicons name={tabIcons.index} size={22} color={focused ? "#B9B9B6" : "#71717a"} />
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
        name="programs"
        options={{
          title: "Programs",
          tabBarIcon: ({ focused }) => (
            <Ionicons name={tabIcons.programs} size={22} color={focused ? "#B9B9B6" : "#71717a"} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ focused }) => (
            <Ionicons name={tabIcons.progress} size={22} color={focused ? "#B9B9B6" : "#71717a"} />
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
      {/* Hidden routes — navigated to from other screens, not shown in tab bar */}
      <Tabs.Screen name="exercises/index" options={{ href: null, headerShown: true, headerTitle: "Exercise Library", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
      <Tabs.Screen name="exercises/[id]" options={{ href: null, headerShown: true, headerTitle: "Exercise Details", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
      <Tabs.Screen name="routines/index" options={{ href: null, headerShown: true, headerTitle: "Routines", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
      <Tabs.Screen name="routines/new" options={{ href: null, headerShown: true, headerTitle: "New Routine", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
      <Tabs.Screen name="routines/[id]/edit" options={{ href: null, headerShown: true, headerTitle: "Edit Routine", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
      <Tabs.Screen name="history/index" options={{ href: null, headerShown: true, headerTitle: "Workout History", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
      <Tabs.Screen name="history/[id]" options={{ href: null, headerShown: true, headerTitle: "Workout Details", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
    </Tabs>
      </View>
    </GradientBackground>
  );
}
