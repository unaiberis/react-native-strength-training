import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/auth-store";
import { View } from "react-native";
import { GradientBackground } from "../../src/shared/ui/GradientBackground";
import { OfflineBanner } from "../../src/shared/ui/OfflineBanner";

/**
 * Coach layout — stack navigator (no tab bar).
 * The main tabs layout provides the Coach submenu navigation.
 * This layout only handles deep coach routes (team detail, analytics, etc.).
 */
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
          {/* Main coach screens — accessible from submenu */}
          <Stack.Screen name="athletes" />
          <Stack.Screen name="teams" />
          <Stack.Screen name="workout-templates" />

          {/* Detail/secondary screens */}
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
      </View>
    </GradientBackground>
  );
}
