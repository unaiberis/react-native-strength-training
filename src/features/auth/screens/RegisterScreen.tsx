import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import {
  getRegisterSchema,
  registerDefaults,
  type RegisterInput,
} from "../../../shared/schemas/auth";
import { useAuth } from "../hooks/useAuth";

export function RegisterScreen() {
  const { t } = useLingui();
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(getRegisterSchema()),
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
            <Trans>Athlete registration</Trans>
          </Text>
          <Text
            className="text-surface-400 mt-2"
            style={{ fontSize: 15, lineHeight: 22 }}
          >
            <Trans>Create your account to start training.</Trans>
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
            name="displayName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t`Display Name`}
                placeholder={t`Your name`}
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
                placeholder={t`At least 8 characters, 1 uppercase`}
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

          <Controller
            control={control}
            name="role"
            render={({ field: { onChange, value } }) => (
              <View>
                <Text className="text-surface-400 text-sm mb-2 font-medium">
                  I am a...
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => onChange("athlete")}
                    className={`flex-1 py-3 px-4 rounded-xl border ${
                      value === "athlete"
                        ? "border-titanium bg-cardSoft"
                        : "border-border bg-card"
                    }`}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        value === "athlete" ? "text-titanium" : "text-surface-400"
                      }`}
                    >
                      Athlete
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onChange("coach")}
                    className={`flex-1 py-3 px-4 rounded-xl border ${
                      value === "coach"
                        ? "border-titanium bg-cardSoft"
                        : "border-border bg-card"
                    }`}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        value === "coach" ? "text-titanium" : "text-surface-400"
                      }`}
                    >
                      Coach
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          />

          <Button
            title={t`Create account`}
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </GradientBackground>
  );
}
