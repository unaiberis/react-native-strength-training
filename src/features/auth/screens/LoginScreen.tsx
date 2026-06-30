import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { Card } from "../../../shared/ui/Card";
import { loginSchema, loginDefaults, type LoginInput } from "../../../shared/schemas/auth";
import { useAuth } from "../hooks/useAuth";

export function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaults,
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await login(data);
      if (result.error) {
        setError(result.error);
      }
      // On success, the auth state listener in (auth)/_layout will redirect
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface-950"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-10">
          <Text className="text-surface-50 text-3xl font-bold text-center">
            Strength Training
          </Text>
          <Text className="text-surface-400 text-base text-center mt-2">
            Log your lifts. Track your progress.
          </Text>
        </View>

        <Card>
          <Text className="text-surface-100 text-xl font-semibold mb-6">Sign In</Text>

          {error && (
            <View className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />

          <Button
            title="Sign In"
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />

          <Button
            title="Don't have an account? Register"
            variant="ghost"
            onPress={() => router.push("/(auth)/register")}
            className="mt-3"
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
