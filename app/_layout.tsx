import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "../src/stores/auth-store";
import { getSession } from "../src/lib/pocketbase/services/auth";
import { pb } from "../src/lib/pocketbase/client";
import "../global.css";
import { View, ActivityIndicator, Text, Platform } from "react-native";
import { GradientBackground } from "../src/shared/ui/GradientBackground";
import { useColorScheme } from "nativewind";
import { I18nProvider } from "@lingui/react";
import { i18n, initI18n } from "../src/i18n";

const OFFLINE_ENABLED = process.env.EXPO_PUBLIC_OFFLINE_ENABLED === "true";
const IS_WEB = Platform.OS === "web";

/** Force dark mode — this app is dark-only by design. */
function ForceDarkMode({ children }: { children: React.ReactNode }) {
  const { setColorScheme } = useColorScheme();
  useEffect(() => {
    setColorScheme("dark");
  }, []);
  return <>{children}</>;
}

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
  const { state, initMessage, setSession, setState, setIsOnline } = useAuthStore();

  useEffect(() => {
    let unsubNetwork: (() => void) | null = null;
    let cancelled = false;

    async function init() {
      setState("loading");
      const msg = useAuthStore.getState().setInitMessage;

      if (!OFFLINE_ENABLED || IS_WEB) {
        // Standard flow without offline support
        // Also skip on web — expo-sqlite hangs in browser
        // Auth store auto-restores from localStorage (web) or SecureStore (native)
        msg("Checking session\u2026");
        console.log("[AuthGate] Web flow — getSession start, pb.authStore.isValid:", pb.authStore.isValid);
        const { session, error } = await getSession();
        console.log("[AuthGate] getSession result:", session ? { userId: session.user?.id, email: session.user?.email } : "null", "error:", error);
        if (!cancelled) setSession(session);
        return;
      }

      // Offline initialisation — wrap in try/catch so any failure
      // (expo-sqlite unavailable on web, DB permissions, etc.)
      // falls back gracefully to online-only auth instead of hanging
      // in the loading state forever.
      try {
        // Dynamic imports — expo-sqlite native module crashes on web if loaded statically
        msg("Loading offline engine\u2026");
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
        msg("Setting up local database\u2026");
        const db = await initDatabase();
        const meta = new SyncMeta(db);
        const queue = new ChangeQueue(db);
        const idMapping = new IdMapping(db);
        const monitor = NetworkMonitor.getInstance();

        // 2. Wire React Query persister (reads/writes react_query_cache table)
        msg("Preparing offline cache\u2026");
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
        msg("Starting sync engine\u2026");
        syncEngine = new SyncEngine(
          db as any,
          queue,
          idMapping,
          meta,
          pb as any,
          monitor,
        );

        // Wire sync status events to the auth store so the UI shows
        // banners when syncing, on errors, or when auth expires.
        if (typeof syncEngine.on === "function") {
          const setSync = useAuthStore.getState().setSyncStatus;
          syncEngine.on("SYNC_START", () => setSync("syncing"));
          syncEngine.on("SYNC_COMPLETE", () => setSync("idle"));
          syncEngine.on("SYNC_PARTIAL", () => setSync("dead-letters"));
          syncEngine.on("AUTH_EXPIRED", () => setSync("auth-expired"));
          syncEngine.on("DEAD_LETTER", () => setSync("dead-letters"));
          syncEngine.on("AUTH_CLEARED", () => setSync("idle"));
        }

        // 4. Auth store auto-restores from SecureStore — no manual load needed
        // 5. Auth with offline awareness
        const isOnline = monitor.isOnline;
        if (!cancelled) setIsOnline(isOnline);

        if (isOnline) {
          msg("Verifying credentials\u2026");
          const result = await getSession();
          if (!cancelled) {
            if (result.error === "Network unavailable") {
              if (pb.authStore.isValid) {
                msg("Continuing offline\u2026");
                setSession({
                  user: pb.authStore.record!,
                  token: pb.authStore.token,
                });
              }
            } else {
              if (result.session) msg("Welcome back!");
              setSession(result.session);
            }
          }
        } else if (pb.authStore.isValid) {
          msg("Working offline\u2026");
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
            useAuthStore.getState().setInitMessage("Syncing\u2026");
            syncEngine.syncAll().catch(console.warn);
          }
        });

        // 7. Initial sync if authenticated and online
        if (isOnline && !cancelled) {
          const authState = useAuthStore.getState().state;
          if (authState === "authenticated") {
            msg("Syncing your data\u2026");
            await syncEngine.syncAll().catch(console.warn);
          }
        }
      } catch (err) {
        // Offline init failed — fall back to standard auth so the
        // app doesn't hang in loading state. Common on web where
        // expo-sqlite native module is unavailable.
        if (cancelled) return;
        console.error("[AuthGate] Offline init failed, falling back to standard auth", err);
        msg("Offline unavailable, switching to online mode\u2026");
        setIsOnline(false);
        const { session } = await getSession().catch(() => ({ session: null, error: null }));
        if (!cancelled) setSession(session);
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
      <GradientBackground>
        <View className="items-center justify-center px-8">
        <ActivityIndicator size="large" color="#B9B9B6" />
        {initMessage ? (
          <Text className="text-surface-400 text-sm mt-4 text-center">
            {initMessage}
          </Text>
        ) : null}
        </View>
      </GradientBackground>
    );
  }

  return <GradientBackground>{children}</GradientBackground>;
}

export default function RootLayout() {
  // Initialize i18n on mount — detects locale and loads common catalog
  useEffect(() => {
    initI18n();
  }, []);

  return (
    <ForceDarkMode>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <I18nProvider i18n={i18n} defaultComponent={({ children }: { children: React.ReactNode }) => <Text>{children}</Text>}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(workout)/active" options={{ headerShown: false, presentation: "fullScreenModal" }} />
            </Stack>
          </I18nProvider>
        </AuthGate>
      </QueryClientProvider>
    </ForceDarkMode>
  );
}
