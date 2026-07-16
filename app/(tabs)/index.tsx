import { Redirect } from "expo-router";

/**
 * Root `/ (tabs)` redirect — routes to the Home tab.
 *
 * The original `index.tsx` was merged into `home.tsx` during the
 * frontend-consistency PR #1 (import alignment + dead-code removal).
 * Expo Router requires this file to resolve the group root; without it
 * `https://entrenamentua.musikak.com/(tabs)` would 404 or redirect
 * unpredictably.
 */
export default function TabsIndexRedirect() {
  return <Redirect href="/(tabs)/home" />;
}
