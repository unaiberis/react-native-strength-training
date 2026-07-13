import { useEffect, useRef } from "react";
import { SafeAreaView, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../src/shared/ui/Button";
import { GradientBackground } from "../src/shared/ui/GradientBackground";
import { useAuthStore } from "@/stores/auth-store";

function SplashLogo() {
  return (
    <View className="items-center">
      <View
        className="w-[74px] h-[74px] rounded-full items-center justify-center border border-border"
        style={{ backgroundColor: "rgba(255,255,255,0.045)" }}
      >
        <Ionicons name="infinite-outline" size={42} color="#B9B9B6" />
      </View>
      <Text
        className="text-surface-50 mt-5"
        style={{ fontSize: 18, fontWeight: "900", letterSpacing: 2.2 }}
      >
        THE HYBRID PROJECT
      </Text>
    </View>
  );
}

function SplashFooter() {
  return (
    <Text
      className="text-surface-400 text-center uppercase"
      style={{ fontSize: 13, letterSpacing: 1.4, fontWeight: "600" }}
    >
      Train to greatness
    </Text>
  );
}

const LOGIN_ROUTE = "/(auth)/login";
const REGISTER_ROUTE = "/(auth)/register";
const TABS_HOME_ROUTE = "/(tabs)/home";
const COACH_ROUTE = "/(coach)";

export default function WelcomeScreen() {
  const router = useRouter();
  const { state, role, isTeamCoach } = useAuthStore();
  // Remembers the last navigation target so the redirect fires exactly once
  // per distinct destination. Idempotent under StrictMode's dev double-invoke,
  // yet still re-routes when async team-role resolution promotes an athlete to
  // team-coach (target changes -> one more navigation to the correct place).
  const redirectedTo = useRef<string | null>(null);

  useEffect(() => {
    if (state !== "authenticated") return;
    const target = role === "coach" || isTeamCoach ? COACH_ROUTE : TABS_HOME_ROUTE;
    if (redirectedTo.current === target) return;
    redirectedTo.current = target;
    try {
      router.replace(target);
    } catch {
      // Navigation should never throw for a valid target; fall back safely.
      if (target !== TABS_HOME_ROUTE) router.replace(TABS_HOME_ROUTE);
    }
  }, [state, role, isTeamCoach, router]);

  // Loading OR authenticated -> neutral logo-only splash (no action buttons).
  // Avoids a flash of login UI before the authenticated redirect fires.
  if (state !== "unauthenticated") {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1">
          <View
            className="flex-1"
            style={{ paddingTop: 56, paddingBottom: 26, paddingHorizontal: 28 }}
          >
            <View className="flex-1" />
            <SplashLogo />
            <View className="flex-1" />
            <SplashFooter />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Unauthenticated -> existing welcome UI (login/register buttons) unchanged.
  return (
    <GradientBackground>
      <SafeAreaView className="flex-1">
        <View
          className="flex-1"
          style={{ paddingTop: 56, paddingBottom: 26, paddingHorizontal: 28 }}
        >
          {/* Top spacer */}
          <View className="flex-1" />

          {/* Logo area */}
          <SplashLogo />

          {/* Spacer between logo and buttons */}
          <View className="flex-1" />

          {/* Action buttons */}
          <View className="gap-4">
            <Button
              title="Inicia sesión"
              icon="log-in-outline"
              variant="primary"
              onPress={() => router.push(LOGIN_ROUTE)}
            />
            <Button
              title="Regístrate"
              icon="person-add-outline"
              variant="primary"
              onPress={() => router.push(REGISTER_ROUTE)}
            />
          </View>

          {/* Spacer between buttons and footer */}
          <View className="flex-1" />

          {/* Footer */}
          <SplashFooter />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}
