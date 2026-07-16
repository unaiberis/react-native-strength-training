import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/auth-store";
import { Text, View, Pressable, type LayoutChangeEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "../../src/shared/ui/GradientBackground";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

// ─── Sync Banner ────────────────────────────────────────────────────────────

function SyncBanner() {
  const isOnline = useAuthStore((s) => s.isOnline);
  const syncStatus = useAuthStore((s) => s.syncStatus);

  const banner = useMemo(() => {
    if (!isOnline) return { text: "You're offline — changes sync when connected", bg: "bg-amber-900/60", textColor: "text-amber-300" };
    if (syncStatus === "syncing") return { text: "Syncing\u2026", bg: "bg-brand-900/40", textColor: "text-brand-300" };
    if (syncStatus === "dead-letters") return { text: "Some changes couldn't sync", bg: "bg-red-900/40", textColor: "text-red-300" };
    if (syncStatus === "auth-expired") return { text: "Session expired. Log in again to sync.", bg: "bg-red-900/40", textColor: "text-red-300" };
    if (syncStatus === "error") return { text: "Sync error", bg: "bg-amber-900/40", textColor: "text-amber-300" };
    return null;
  }, [isOnline, syncStatus]);

  if (!banner) return null;

  return (
    <View className={`${banner.bg} py-1.5 px-4`}>
      <Text className={`${banner.textColor} text-xs text-center font-medium`}>
        {banner.text}
      </Text>
    </View>
  );
}

// ─── Icon map ────────────────────────────────────────────────────────────────

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  calendar: "calendar-outline",
  home: "home-outline",
  train: "barbell-outline",
  analytics: "stats-chart-outline",
  profile: "person-outline",
};

/** Order of visible tabs in the tab bar. */
const VISIBLE_TABS = ["calendar", "home", "train", "analytics", "profile"] as const;

/** Width of the sliding indicator bar in px. */
const INDICATOR_WIDTH = 22;

// ─── Animated Tab Icon ──────────────────────────────────────────────────────
// Scales from 0.92 → 1.0 with a spring when focused.

function AnimatedTabIcon({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) {
  const scale = useSharedValue(focused ? 1 : 0.92);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.92, {
      damping: 12,
      stiffness: 120,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={name}
        size={22}
        color={focused ? "#B9B9B6" : "#71717a"}
      />
    </Animated.View>
  );
}

// ─── Custom Tab Bar ─────────────────────────────────────────────────────────
// Renders the 5 visible tabs with spring‑scale icons + a sliding indicator bar.

function CustomTabBar({
  state,
  descriptors,
  navigation,
}: {
  state: any;
  descriptors: any;
  navigation: any;
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const tabWidth = containerWidth / VISIBLE_TABS.length;

  const indicatorOffset = useSharedValue(0);

  const activeIndex = state.index;

  useEffect(() => {
    if (containerWidth <= 0) return;
    const center =
      tabWidth * activeIndex + tabWidth / 2 - INDICATOR_WIDTH / 2;
    indicatorOffset.value = withSpring(center, {
      damping: 15,
      stiffness: 120,
    });
  }, [activeIndex, containerWidth, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorOffset.value }],
    width: INDICATOR_WIDTH,
  }));

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  return (
    <View
      onLayout={handleContainerLayout}
      style={{
        backgroundColor: "#0B0B0C",
        borderTopColor: "#343437",
        borderTopWidth: 1,
        height: 56,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          flex: 1,
          paddingTop: 4,
        }}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];

          // Skip hidden routes (href: null)
          if (options.href === null) return null;

          const isFocused = activeIndex === index;
          const iconName = tabIcons[route.name];
          const label = options.title ?? route.name;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => navigation.navigate(route.name, route.params)}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {iconName ? (
                <AnimatedTabIcon name={iconName} focused={isFocused} />
              ) : null}
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: isFocused ? "#B9B9B6" : "#707074",
                  marginTop: 2,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Sliding indicator bar */}
      <Animated.View
        style={[
          indicatorStyle,
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 2,
            backgroundColor: "#B9B9B6",
            borderRadius: 1,
          },
        ]}
      />
    </View>
  );
}

// ─── Tabs Layout ────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const router = useRouter();
  const { state, role, isTeamCoach } = useAuthStore();

  /**
   * Auth guards:
   * 1. Unauthenticated → redirect to login
   * 2. Coach user in athlete tabs → redirect to coach tabs
   * Diferido con setTimeout(0) para que el navegador esté montado
   * antes de intentar la navegación (evita "navigate before mounting Root Layout").
   */
  useEffect(() => {
    if (state === "unauthenticated") {
      const id = setTimeout(() => router.replace("/(auth)/login"), 0);
      return () => clearTimeout(id);
    }
    if (state === "authenticated" && (role === "coach" || isTeamCoach)) {
      const id = setTimeout(() => router.replace("/(coach)"), 0);
      return () => clearTimeout(id);
    }
  }, [state, role, isTeamCoach, router]);

  return (
    <GradientBackground>
      <View className="flex-1">
        <SyncBanner />
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name="calendar"
            options={{
              title: "Calendar",
            }}
          />
          <Tabs.Screen
            name="home"
            options={{
              title: "Home",
            }}
          />
          <Tabs.Screen
            name="train"
            options={{
              title: "Train",
            }}
          />
          <Tabs.Screen
            name="analytics"
            options={{
              title: "Analytics",
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
            }}
          />
          {/* Hidden routes — navigated to from other screens, not shown in tab bar */}
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="exercises/index" options={{ href: null, headerShown: true, headerTitle: "Exercise Library", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
          <Tabs.Screen name="exercises/[id]" options={{ href: null, headerShown: true, headerTitle: "Exercise Details", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
          <Tabs.Screen name="history/index" options={{ href: null, headerShown: true, headerTitle: "Workout History", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
          <Tabs.Screen name="history/[id]" options={{ href: null, headerShown: true, headerTitle: "Workout Details", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
          <Tabs.Screen name="analytics/exercise/[id]" options={{ href: null, headerShown: true, headerTitle: "Exercise Progress", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
          <Tabs.Screen name="wellness" options={{ href: null, headerShown: true, headerTitle: "Wellness", headerStyle: { backgroundColor: "#18181b" }, headerTintColor: "#fafafa" }} />
          <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
          <Tabs.Screen name="notification/[id]" options={{ href: null, headerShown: false }} />
          <Tabs.Screen name="unit-preferences" options={{ href: null, headerShown: false }} />
        </Tabs>
      </View>
    </GradientBackground>
  );
}
