import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { View } from "react-native";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { OfflineBanner } from "@/shared/ui/OfflineBanner";
import { UserMenu } from "@/shared/ui/UserMenu";

export default function CoachLayout() {
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
