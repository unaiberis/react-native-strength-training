import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { getLoginSchema, loginDefaults, type LoginInput } from "../../../shared/schemas/auth";
import { useAuth } from "../hooks/useAuth";

export function LoginScreen() {
  const { t } = useLingui();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(getLoginSchema()),
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
            <Trans>Sign in to your account</Trans>
          </Text>
          <Text
            className="text-surface-400 mt-2"
            style={{ fontSize: 15, lineHeight: 22 }}
          >
            <Trans>Enter your credentials to view your plan.</Trans>
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
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t`Password`}
                placeholder={t`Enter your password`}
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
            title={t`Sign in`}
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </GradientBackground>
  );
}
