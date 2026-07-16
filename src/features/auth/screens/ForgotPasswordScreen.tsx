import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { requestPasswordReset } from "../../../lib/pocketbase/services/auth";

export function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Enter your email address");
      return;
    }

    setError(null);
    setIsSuccess(false);
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(email.trim());
      if (result.error) {
        setError(result.error);
      } else {
        setIsSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="flex-1 justify-center px-7"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-10">
            <Text
              className="text-surface-50"
              style={{ fontSize: 32, fontWeight: "900" }}
            >
              Reset password
            </Text>
            <Text
              className="text-surface-400 mt-2"
              style={{ fontSize: 15, lineHeight: 22 }}
            >
              Enter your email address and we'll send you a link to reset your
              password.
            </Text>
          </View>

          <View className="gap-4">
            {error && (
              <View className="bg-danger/10 border border-danger rounded-xl px-4 py-3">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            )}

            {isSuccess && (
              <View className="bg-success/10 border border-success rounded-xl px-4 py-3">
                <Text className="text-success text-sm">
                  Check your email for the reset link
                </Text>
              </View>
            )}

            <Input
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              editable={!isSubmitting && !isSuccess}
            />

            <Button
              title="Send Reset Link"
              loading={isSubmitting}
              onPress={handleSubmit}
              disabled={isSuccess}
            />

            <Button
              title="Back to login"
              variant="ghost"
              onPress={() => router.back()}
              disabled={isSubmitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}
