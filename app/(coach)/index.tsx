import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/auth-store";

/**
 * Coach Dashboard entry — redirects to the real dashboard screen.
 * The tab bar points to "index" which immediately re-routes.
 */
export default function CoachDashboardEntry() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login");
    } else {
      router.replace("/(coach)/dashboard");
    }
  }, [user, router]);

  return null;
}
