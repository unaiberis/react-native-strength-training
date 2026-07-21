import { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { Text, View, Pressable, type LayoutChangeEvent, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import {
  TAB_BAR_BG,
  TAB_BAR_BORDER,
  TAB_BAR_HEIGHT,
  TAB_BAR_ACTIVE_TINT,
  TAB_BAR_INACTIVE_TINT,
  TAB_BAR_INDICATOR,
  DETAIL_HEADER,
} from "@/constants/theme";

// ─── Sync Banner ────────────────────────────────────────────────────────────

function SyncBanner() {
  const isOnline = useAuthStore((s) => s.isOnline);
  const syncStatus = useAuthStore((s) => s.syncStatus);

  const banner = useMemo(() => {
    if (!isOnline) return { text: t`You're offline — changes sync when connected`, bg: "bg-amber-900/60", textColor: "text-amber-300" };
    if (syncStatus === "syncing") return { text: t`Syncing\u2026`, bg: "bg-brand-900/40", textColor: "text-brand-300" };
    if (syncStatus === "dead-letters") return { text: t`Some changes couldn't sync`, bg: "bg-red-900/40", textColor: "text-red-300" };
    if (syncStatus === "auth-expired") return { text: t`Session expired. Log in again to sync.`, bg: "bg-red-900/40", textColor: "text-red-300" };
    if (syncStatus === "error") return { text: t`Sync error`, bg: "bg-amber-900/40", textColor: "text-amber-300" };
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
  wellness: "heart-outline",
  analytics: "stats-chart-outline",
  profile: "person-outline",
};

/** Order of visible tabs in the tab bar. */
const VISIBLE_TABS = ["calendar", "home", "train", "wellness", "analytics", "profile"] as const;

/** Labels for the visible tabs (mirrors Tabs.Screen title options). */
const VISIBLE_TAB_LABELS: Record<string, string> = {
  calendar: t`Calendar`,
  home: t`Home`,
  train: t`Train`,
  wellness: t`Wellness`,
  analytics: t`Analytics`,
  profile: t`Profile`,
};

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
        color={focused ? TAB_BAR_ACTIVE_TINT : TAB_BAR_INACTIVE_TINT}
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

  // Which VISIBLE_TABS slot is currently focused (0‑4), or -1 if hidden.
  const currentTabName = state.routes[state.index]?.name;
  const activeVisibleIndex = VISIBLE_TABS.indexOf(currentTabName);
  const hasVisibleTab = activeVisibleIndex >= 0;

  const indicatorLeft = useMemo(() => {
    if (containerWidth <= 0 || !hasVisibleTab) return 0;
    return tabWidth * activeVisibleIndex + tabWidth / 2 - INDICATOR_WIDTH / 2;
  }, [activeVisibleIndex, containerWidth, tabWidth, hasVisibleTab]);

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  return (
    <View
      onLayout={handleContainerLayout}
      role="tablist"
      style={{
        backgroundColor: TAB_BAR_BG,
        borderTopColor: TAB_BAR_BORDER,
        borderTopWidth: 1,
        height: TAB_BAR_HEIGHT,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          flex: 1,
          paddingTop: 4,
        }}
      >
        {VISIBLE_TABS.map((tabName, index) => {
          // Find the actual route entry for this tab name.
          const route = state.routes.find((r: any) => r.name === tabName);
          if (!route) return null;

          const isFocused = activeVisibleIndex === index;
          const iconName = tabIcons[tabName];

          return (
            <Pressable
              key={tabName}
              role="tab"
              aria-selected={isFocused}
              onPress={() => {
                if (Platform.OS !== "web") {
                  impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
                }
                navigation.navigate(route.name, route.params);
              }}
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
                  color: isFocused ? TAB_BAR_ACTIVE_TINT : TAB_BAR_INACTIVE_TINT,
                  marginTop: 2,
                }}
              >
                {VISIBLE_TAB_LABELS[tabName] ?? tabName}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Indicator bar — hidden when a hidden route is active */}
      {hasVisibleTab ? (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: indicatorLeft,
            width: INDICATOR_WIDTH,
            height: 2,
            backgroundColor: TAB_BAR_INDICATOR,
            borderRadius: 1,
          }}
        />
      ) : null}
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
      <View className="flex-1 bg-soft">
        <SyncBanner />
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
          backBehavior="history"
        >
          <Tabs.Screen
            name="calendar"
            options={{
              title: t`Calendar`,
            }}
          />
          <Tabs.Screen
            name="home"
            options={{
              title: t`Home`,
            }}
          />
          <Tabs.Screen
            name="train"
            options={{
              title: t`Train`,
            }}
          />
          <Tabs.Screen
            name="wellness"
            options={{
              title: t`Wellness`,
            }}
          />
          <Tabs.Screen
            name="analytics"
            options={{
              title: t`Analytics`,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: t`Profile`,
            }}
          />
          {/* Hidden routes — navigated to from other screens, not shown in tab bar */}
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="exercises/index" options={{ href: null, headerShown: true, headerTitle: t`Exercise Library`, ...DETAIL_HEADER }} />
          <Tabs.Screen name="exercises/[id]" options={{ href: null, headerShown: true, headerTitle: t`Exercise Details`, ...DETAIL_HEADER }} />
          <Tabs.Screen name="history/index" options={{ href: null, headerShown: true, headerTitle: t`Workout History`, ...DETAIL_HEADER }} />
          <Tabs.Screen name="history/[id]" options={{ href: null, headerShown: true, headerTitle: t`Workout Details`, ...DETAIL_HEADER }} />
          <Tabs.Screen name="analytics/exercise/[id]" options={{ href: null, headerShown: true, headerTitle: t`Exercise Progress`, ...DETAIL_HEADER }} />
          <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
          <Tabs.Screen name="notification/[id]" options={{ href: null, headerShown: false }} />
          <Tabs.Screen name="team/[id]" options={{ href: null, headerShown: false }} />
          <Tabs.Screen name="edit-profile" options={{ href: null, headerShown: false }} />
        </Tabs>
      </View>
    </GradientBackground>
  );
}
