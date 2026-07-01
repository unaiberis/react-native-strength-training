import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/auth-store";

export default function AuthLayout() {
  const router = useRouter();
  const { state } = useAuthStore();

  /**
   * If the user is already authenticated, redirect to the tabs.
   * This prevents showing the login screen to a signed-in user.
   * Diferido con setTimeout(0) para evitar "navigate before mounting Root Layout".
   */
  useEffect(() => {
    if (state === "authenticated") {
      const id = setTimeout(() => router.replace("/(tabs)"), 0);
      return () => clearTimeout(id);
    }
  }, [state, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
