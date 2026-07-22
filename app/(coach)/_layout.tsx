import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { OfflineBanner } from "@/shared/ui/OfflineBanner";

/** Professional user dropdown — avatar initial → menu card with user info + logout. */
function UserMenu() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const reset = useAuthStore((s) => s.reset);
  const displayName = user?.displayName ?? "";
  const email = user?.email ?? "";
  const initial = (displayName || email || "?").charAt(0).toUpperCase();

  return (
    <View className="relative">
      {/* Avatar button */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-card border border-border items-center justify-center active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={`${displayName || "User"} menu`}
      >
        <Text className="text-surface-50 text-sm font-bold">{initial}</Text>
      </Pressable>

      {/* Dropdown backdrop + menu */}
      {open && (
        <>
          {/* Backdrop — closes menu on tap outside */}
          <Pressable
            onPress={() => setOpen(false)}
            className="absolute inset-0 z-40"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
            accessibilityLabel="Close menu"
          />

          {/* Dropdown card */}
          <View className="absolute right-0 top-10 min-w-[200px] bg-card border border-border rounded-2xl shadow-elevated overflow-hidden"
            style={{ position: "absolute", right: 0, top: 40, zIndex: 50 }}
          >
            {/* User info header */}
            <View className="px-4 py-3 border-b border-border">
              {displayName ? (
                <Text className="text-surface-50 text-sm font-semibold" numberOfLines={1}>
                  {displayName}
                </Text>
              ) : null}
              <Text className="text-surface-400 text-xs" numberOfLines={1}>
                {email}
              </Text>
            </View>

            {/* Logout action */}
            <Pressable
              onPress={() => {
                setOpen(false);
                reset();
              }}
              className="flex-row items-center gap-2 px-4 py-3 active:bg-card-soft hover:bg-card-soft"
              accessibilityRole="button"
              accessibilityLabel="Logout"
            >
              <Ionicons name="log-out-outline" size={18} color="#D65F5F" />
              <Text className="text-danger text-sm font-medium">Logout</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
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
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* Primary screen: Athletes */}
          <Stack.Screen
            name="athletes"
            options={{
              title: "Athletes",
              headerShown: true,
              headerTitle: "Athletes",
              headerStyle: { backgroundColor: "#050505" },
              headerTintColor: "#F4F4F2",
              headerTitleStyle: { fontWeight: "700" },
              headerShadowVisible: false,
              headerRight: () => <UserMenu />,
            }}
          />

          {/* Hidden routes — navigated from screens */}
          <Stack.Screen
            name="index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="athlete/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="athlete/[id]/calendar"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="analytics/[athleteId]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="library/index"
            options={{}}
          />
          <Stack.Screen
            name="library/create"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="library/[id]/edit"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="assign"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="teams/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="workout-builder/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="workout-builder/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="assigned-programs"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="assignment/[id]"
            options={{ headerShown: false }}
          />
        </Stack>
      </View>
    </GradientBackground>
  );
}
