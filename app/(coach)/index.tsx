import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/auth-store";

/**
 * Coach entry — redirects to the Athletes list.
 */
export default function CoachEntry() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login");
    } else {
      router.replace("/(coach)/athletes");
    }
  }, [user, router]);

  return null;
}
