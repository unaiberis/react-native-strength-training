import { useEffect } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Coach tab entry point.
 * Redirects to the first coach sub-route (athletes).
 * The actual coach UI lives in (coach)/ — this screen is just
 * a tab anchor so the Coach tab appears in the main tab bar.
 */
export default function CoachTabScreen() {
  const router = useRouter();
  const { role, isTeamCoach } = useAuthStore();

  useEffect(() => {
    // Only coaches should see this tab
    if (role === "coach" || isTeamCoach) {
      router.replace("/(coach)/athletes");
    }
  }, [role, isTeamCoach, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#050505" }}>
      <Text style={{ color: "#707074" }}>Loading coach panel...</Text>
    </View>
  );
}
