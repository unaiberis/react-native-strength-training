import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/auth-store";

/**
 * Auth layout with role-aware redirect.
 *
 * After login/init, routes authenticated users to the correct tab group:
 * - Coach users  → (coach) route group
 * - Athlete users → (tabs) route group (default)
 */
export default function AuthLayout() {
  const router = useRouter();
  const { state, role } = useAuthStore();

  /**
   * If the user is already authenticated, redirect based on role.
   * Coach → (coach)/, Athlete → (tabs)/
   * Diferido con setTimeout(0) para evitar "navigate before mounting Root Layout".
   */
  useEffect(() => {
    if (state === "authenticated") {
      const destination = role === "coach" ? "/(coach)" : "/(tabs)";
      console.log("[AuthLayout] Authenticated — redirecting to", destination, "role:", role);
      const id = setTimeout(() => router.replace(destination), 0);
      return () => clearTimeout(id);
    }
  }, [state, role, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
