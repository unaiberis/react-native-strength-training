import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { Card } from "../../../shared/ui/Card";
import {
  registerSchema,
  registerDefaults,
  type RegisterInput,
} from "../../../shared/schemas/auth";
import { useAuth } from "../hooks/useAuth";

export function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: registerDefaults,
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await register(data);
      if (result.error) {
        setError(result.error);
      }
      // On success, the auth state listener redirects to tabs
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
            Create Account
          </Text>
          <Text className="text-surface-400 text-base text-center mt-2">
            Start tracking your strength journey
          </Text>
        </View>

        <Card>
          <Text className="text-surface-100 text-xl font-semibold mb-6">
            Register
          </Text>

          {error && (
            <View className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="displayName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Display Name"
                placeholder="Your name"
                autoCapitalize="words"
                autoComplete="name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.displayName?.message}
              />
            )}
          />

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
                placeholder="At least 8 characters, 1 uppercase"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />

          <Button
            title="Create Account"
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />

          <Button
            title="Already have an account? Sign In"
            variant="ghost"
            onPress={() => router.push("/(auth)/login")}
            className="mt-3"
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
