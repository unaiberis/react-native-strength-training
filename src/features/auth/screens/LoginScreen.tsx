import { useState, useRef } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { loginSchema, loginDefaults, type LoginInput } from "../../../shared/schemas/auth";
import { useAuth } from "../hooks/useAuth";

export function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    getValues,
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
            <Trans>Accede a tu cuenta</Trans>
          </Text>
          <Text
            className="text-surface-400 mt-2"
            style={{ fontSize: 15, lineHeight: 22 }}
          >
            <Trans>Introduce tus credenciales para ver tu planificación.</Trans>
          </Text>
        </View>

        <View className="gap-4">
          {error && (
            <View className="bg-danger/10 border border-danger rounded-xl px-4 py-3">
              <Text className="text-danger text-sm">{error}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t`Email`}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                onSubmitEditing={() => {
                  const { email, password } = getValues();
                  if (email && password) {
                    handleSubmit(onSubmit)();
                  } else {
                    passwordRef.current?.focus();
                  }
                }}
                blurOnSubmit={false}
                returnKeyType="next"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                ref={passwordRef}
                label={t`Password`}
                placeholder={t`Enter your password`}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                onSubmitEditing={handleSubmit(onSubmit)}
                returnKeyType="go"
              />
            )}
          />

          <TouchableOpacity
            onPress={() => router.push("/(auth)/forgot-password")}
            className="items-end -mt-2 mb-4"
            accessibilityRole="button"
            accessibilityLabel={t`Forgot password`}
          >
            <Text className="text-surface-400 text-sm font-semibold">
              <Trans>Forgot password?</Trans>
            </Text>
          </TouchableOpacity>

          <Button
            title={t`Entrar`}
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </GradientBackground>
  );
}
