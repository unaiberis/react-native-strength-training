import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";

export default function AuthLayout() {
  const router = useRouter();
  const { state, role, isTeamCoach, isPendingSignupInfo } = useAuthStore();

  /**
   * If the user is already authenticated, redirect based on role.
   * Coach or team coach → (coach)/, Athlete → (tabs)/
   * Skip redirect if the user just registered and needs to complete signup info.
   * Diferido con setTimeout(0) para evitar "navigate before mounting Root Layout".
   */
  useEffect(() => {
    if (state === "authenticated" && !isPendingSignupInfo) {
      const effectiveCoach = role === "coach" || isTeamCoach;
      const destination = effectiveCoach ? "/(coach)" : "/(tabs)";
      const id = setTimeout(() => router.replace(destination), 0);
      return () => clearTimeout(id);
    }
  }, [state, role, isTeamCoach, isPendingSignupInfo, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="signup-info" />
      <Stack.Screen name="join-team" />
    </Stack>
  );
}
