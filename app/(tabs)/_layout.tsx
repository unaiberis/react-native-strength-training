import { useEffect, useMemo } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { Text, View } from 'react-native';

function SyncBanner() {
  const isOnline = useAuthStore((s) => s.isOnline);
  const syncStatus = useAuthStore((s) => s.syncStatus);

  const banner = useMemo(() => {
    if (!isOnline)
      return {
        text: "You're offline — changes sync when connected",
        bg: 'bg-amber-900/60',
        textColor: 'text-amber-300',
      };
    if (syncStatus === 'syncing')
      return {
        text: 'Syncing\u2026',
        bg: 'bg-brand-900/40',
        textColor: 'text-brand-300',
      };
    if (syncStatus === 'dead-letters')
      return {
        text: "Some changes couldn't sync",
        bg: 'bg-red-900/40',
        textColor: 'text-red-300',
      };
    if (syncStatus === 'auth-expired')
      return {
        text: 'Session expired. Log in again to sync.',
        bg: 'bg-red-900/40',
        textColor: 'text-red-300',
      };
    if (syncStatus === 'error')
      return {
        text: 'Sync error',
        bg: 'bg-amber-900/40',
        textColor: 'text-amber-300',
      };
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

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: '🏠',
    train: '💪',
    programs: '📋',
    progress: '📈',
    profile: '👤',
  };

  return (
    <Text className={focused ? 'text-brand-500' : 'text-surface-500'}>
      {icons[name] ?? '•'}
    </Text>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const { state } = useAuthStore();

  /**
   * If the user is not authenticated, redirect to the auth flow.
   * Diferido con setTimeout(0) para que el navegador esté montado
   * antes de intentar la navegación (evita "navigate before mounting Root Layout").
   */
  useEffect(() => {
    if (state === 'unauthenticated') {
      const id = setTimeout(() => router.replace('/(auth)/login'), 0);
      return () => clearTimeout(id);
    }
  }, [state, router]);

  return (
    <View className="flex-1 bg-surface-950">
      <SyncBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#18181b',
            borderTopColor: '#27272a',
            borderTopWidth: 1,
            paddingTop: 4,
          },
          tabBarActiveTintColor: '#22c55e',
          tabBarInactiveTintColor: '#71717a',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="index" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="train"
          options={{
            title: 'Train',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="train" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="programs"
          options={{
            title: 'Programs',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="programs" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="progress" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="profile" focused={focused} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
