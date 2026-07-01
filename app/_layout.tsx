import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "../src/stores/auth-store";
import { getSession } from "../src/lib/pocketbase/services/auth";
import { pb, ExpoSecureStoreAuth } from "../src/lib/pocketbase/client";
import "../global.css";
import { View, ActivityIndicator } from "react-native";

const OFFLINE_ENABLED = process.env.EXPO_PUBLIC_OFFLINE_ENABLED === "true";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 2,
    },
  },
});

/** Singleton SyncEngine initialised after DB is ready. */
let syncEngine: any | null = null;

function AuthGate({ children }: { children: React.ReactNode }) {
  const { state, setSession, setState, setIsOnline } = useAuthStore();

  useEffect(() => {
    let unsubNetwork: (() => void) | null = null;
    let cancelled = false;

    async function init() {
      setState("loading");

      if (!OFFLINE_ENABLED) {
        // Standard flow without offline support
        const { session } = await getSession();
        if (!cancelled) setSession(session);
        return;
      }

      // Dynamic imports — expo-sqlite native module crashes on web if loaded statically
      const [
        { initDatabase },
        { NetworkMonitor },
        { createSqlitePersister },
        { SyncEngine, SyncMeta, ChangeQueue, IdMapping },
        { persistQueryClient: persist },
      ] = await Promise.all([
        import("../src/lib/db/init"),
        import("../src/lib/db/network-monitor"),
        import("../src/lib/db/sqlite-storage"),
        import("../src/lib/db"),
        import("@tanstack/react-query-persist-client"),
      ]);

      // 1. Initialise local SQLite database (creates tables, runs migrations)
      const db = await initDatabase();
      const meta = new SyncMeta(db);
      const queue = new ChangeQueue(db);
      const idMapping = new IdMapping(db);
      const monitor = NetworkMonitor.getInstance();

      // 2. Wire React Query persister (reads/writes react_query_cache table)
      const persister = createSqlitePersister(db);
      persist({
        queryClient,
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24h
        buster: process.env.EXPO_PUBLIC_APP_VERSION ?? "1.0.0",
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const key = (query.queryKey as string[])[0];
            return ["exercises", "exercise-categories", "templates"].includes(key);
          },
        },
      });

      // 3. Create the SyncEngine singleton
      syncEngine = new SyncEngine(
        db as any,
        queue,
        idMapping,
        meta,
        pb as any,
        monitor,
      );

      // 4. Restore persisted auth token from SecureStore before checking
      await (pb.authStore as ExpoSecureStoreAuth).loadFromStore().catch(() => {});

      // 5. Auth with offline awareness
      const isOnline = monitor.isOnline;
      if (!cancelled) setIsOnline(isOnline);

      if (isOnline) {
        const result = await getSession();
        if (!cancelled) {
          if (result.error === "Network unavailable") {
            // Transient network failure — don't erase auth, trust stored token
            if (pb.authStore.isValid) {
              setSession({
                user: pb.authStore.record!,
                token: pb.authStore.token,
              });
            }
            // If no stored token, user stays unauthenticated
          } else {
            setSession(result.session);
          }
        }
      } else if (pb.authStore.isValid) {
        // Offline with locally valid token — trust it
        if (!cancelled) {
          setSession({
            user: pb.authStore.record!,
            token: pb.authStore.token,
          });
        }
      } else {
        if (!cancelled) setSession(null);
      }

      // 6. Subscribe to connectivity changes for sync-on-reconnect
      unsubNetwork = monitor.subscribe((online) => {
        setIsOnline(online);
        if (online && syncEngine) {
          syncEngine.syncAll().catch(console.warn);
        }
      });

      // 7. Initial sync if authenticated and online
      if (isOnline && !cancelled) {
        const authState = useAuthStore.getState().state;
        if (authState === "authenticated") {
          await syncEngine.syncAll().catch(console.warn);
        }
      }
    }

    init().catch(console.error);

    return () => {
      cancelled = true;
      if (unsubNetwork) unsubNetwork();
    };
  }, [setSession, setState, setIsOnline]);

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
