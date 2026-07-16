import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { BackButton } from "@/shared/ui/BackButton";
import { useAuthStore } from "@/stores/auth-store";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";

export default function JoinTeamScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert("Required", "Please enter an invite code.");
      return;
    }
    if (!userId) {
      Alert.alert("Error", "You must be logged in to join a team.");
      return;
    }

    setLoading(true);
    try {
      const { joinTeamByInvite } = await import(
        "@/lib/pocketbase/services/team-invites"
      );
      const result = await joinTeamByInvite(trimmed, userId);
      if (result) {
        Alert.alert("Success", "You've joined the team!", [
          { text: "OK", onPress: () => router.replace("/(tabs)") },
        ]);
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.message ?? "Failed to join team. Check your invite code and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [code, userId, router]);

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        className="flex-1 justify-center px-6"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Card className="mb-6">
          <Text className="text-surface-50 text-2xl font-bold mb-2">
            Join a Team
          </Text>
          <Text className="text-surface-400 text-sm mb-6">
            Enter the invite code shared by your coach or team admin.
          </Text>

          <TextInput
            className="bg-card-soft text-surface-100 text-lg font-mono tracking-widest rounded-xl px-4 py-3 border border-border mb-6 text-center uppercase"
            placeholder="XXXX-XXXX"
            placeholderTextColor="#707074"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
            accessibilityLabel="Invite code"
          />

          <Button
            title="Join Team"
            variant="primary"
            onPress={handleJoin}
            loading={loading}
            disabled={loading}
          />

          <View className="mt-4 items-center">
            <BackButton fallbackRoute="/(auth)" />
          </View>
        </Card>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}
