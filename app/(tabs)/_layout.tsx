import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/auth-store";
import { Text } from "react-native";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: "🏠",
    train: "💪",
    programs: "📋",
    progress: "📈",
    profile: "👤",
  };

  return (
    <Text className={focused ? "text-brand-500" : "text-surface-500"}>
      {icons[name] ?? "•"}
    </Text>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const { state } = useAuthStore();

  /**
   * If the user is not authenticated, redirect to the auth flow.
   */
  useEffect(() => {
    if (state === "unauthenticated") {
      router.replace("/(auth)/login");
    }
  }, [state, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#18181b",
          borderTopColor: "#27272a",
          borderTopWidth: 1,
          paddingTop: 4,
        },
        tabBarActiveTintColor: "#22c55e",
        tabBarInactiveTintColor: "#71717a",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: "Train",
          tabBarIcon: ({ focused }) => <TabIcon name="train" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: "Programs",
          tabBarIcon: ({ focused }) => <TabIcon name="programs" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ focused }) => <TabIcon name="progress" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
