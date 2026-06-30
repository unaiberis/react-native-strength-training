import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "../src/stores/auth-store";
import { getSession } from "../src/lib/supabase/services/auth";
import "../../global.css";
import { View, ActivityIndicator } from "react-native";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 2,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { state, setSession, setState } = useAuthStore();

  useEffect(() => {
    async function init() {
      setState("loading");
      const { session } = await getSession();
      setSession(session);
    }
    init();
  }, [setSession, setState]);

  if (state === "loading") {
    return (
      <View className="flex-1 bg-surface-950 items-center justify-center">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="exercises/index" options={{ headerShown: true, headerTitle: "Exercise Library", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
          <Stack.Screen name="exercises/[id]" options={{ headerShown: true, headerTitle: "Exercise Details", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
          <Stack.Screen name="routines/index" options={{ headerShown: true, headerTitle: "Routines", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
          <Stack.Screen name="routines/new" options={{ headerShown: true, headerTitle: "New Routine", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
          <Stack.Screen name="routines/[id]/edit" options={{ headerShown: true, headerTitle: "Edit Routine", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
          <Stack.Screen name="history/index" options={{ headerShown: true, headerTitle: "Workout History", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
          <Stack.Screen name="history/[id]" options={{ headerShown: true, headerTitle: "Workout Details", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
          <Stack.Screen name="(workout)/active" options={{ headerShown: false, presentation: "fullScreenModal" }} />
        </Stack>
      </AuthGate>
    </QueryClientProvider>
  );
}
