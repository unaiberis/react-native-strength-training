import { View, Text, ScrollView, Pressable } from "react-native";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BackButton } from "@/shared/ui/BackButton";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { ScreenLayout } from "@/shared/ui/ScreenLayout";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { useAuthStore } from "@/stores/auth-store";
import { useUpdateProfile } from "../hooks/useUpdateProfile";
import {
  profileSchema,
  type ProfileFormValues,
  type ProfileInput,
} from "@/shared/schemas/profile";

type UnitValue = "metric" | "imperial";
type ExperienceValue = "beginner" | "intermediate" | "advanced";
type GoalValue =
  | "strength"
  | "hypertrophy"
  | "endurance"
  | "general_fitness";

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: ChipOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  error?: string;
}) {
  return (
    <View className="mb-4">
      <Text className="text-surface-400 text-[13px] font-semibold mb-1.5">
        {label}
      </Text>
      <View className="flex-row gap-2 flex-wrap">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={`flex-1 min-w-[45%] py-3 px-4 rounded-xl border ${
                selected
                  ? "border-titanium bg-cardSoft"
                  : "border-border bg-card"
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={opt.label}
            >
              <Text
                className={`text-center font-semibold ${
                  selected ? "text-titanium" : "text-surface-400"
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error && (
        <Text className="text-danger text-[13px] font-semibold mt-1 ml-1">
          {error}
        </Text>
      )}
    </View>
  );
}

const UNIT_OPTIONS: ChipOption<UnitValue>[] = [
  { value: "metric", label: "Metric (kg/cm)" },
  { value: "imperial", label: "Imperial (lb/in)" },
];

const EXPERIENCE_OPTIONS: ChipOption<ExperienceValue>[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const GOAL_OPTIONS: ChipOption<GoalValue>[] = [
  { value: "strength", label: "Strength" },
  { value: "hypertrophy", label: "Hypertrophy" },
  { value: "endurance", label: "Endurance" },
  { value: "general_fitness", label: "General Fitness" },
];

export function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const isOnline = useAuthStore((s) => s.isOnline);
  const { mutate, isPending, error } = useUpdateProfile();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues, unknown, ProfileInput>({
    // zodResolver types the transformed output as the input in this resolver
    // version; the transform (string → number) still runs at runtime.
    resolver: zodResolver(profileSchema) as Resolver<
      ProfileFormValues,
      unknown,
      ProfileInput
    >,
    defaultValues: {
      displayName: user?.displayName ?? "",
      bodyweight: user?.bodyweight != null ? String(user.bodyweight) : "",
      bodyweight_unit: (user?.bodyweight_unit as UnitValue) ?? "metric",
      height: user?.height != null ? String(user.height) : "",
      height_unit: (user?.height_unit as UnitValue) ?? "metric",
      experience: user?.experience as ExperienceValue | undefined,
      goal: user?.goal as GoalValue | undefined,
    },
  });

  const onSubmit = (data: ProfileInput) => mutate(data);

  if (!user) return null;

  return (
    <GradientBackground>
      <ScrollView className="flex-1 px-4 pt-16">
        <ScreenLayout>
          <View className="flex-row items-center mb-6">
            <BackButton fallbackRoute="/(tabs)/profile" />
            <ScreenTitle title="Edit Profile" />
          </View>

          {!isOnline && (
            <View className="bg-amber-900/60 rounded-xl px-4 py-3 mb-4">
              <Text className="text-amber-300 text-sm font-medium">
                You're offline — profile changes need a connection
              </Text>
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
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.displayName?.message}
              />
            )}
          />

          <Input
            label="Email"
            value={user.email}
            editable={false}
            autoCapitalize="none"
          />

          <Controller
            control={control}
            name="bodyweight"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Bodyweight"
                placeholder="e.g. 80"
                keyboardType="decimal-pad"
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.bodyweight?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="bodyweight_unit"
            render={({ field, fieldState }) => (
              <ChipGroup
                label="Bodyweight Unit"
                options={UNIT_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="height"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Height"
                placeholder="e.g. 180"
                keyboardType="decimal-pad"
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.height?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="height_unit"
            render={({ field, fieldState }) => (
              <ChipGroup
                label="Height Unit"
                options={UNIT_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="experience"
            render={({ field, fieldState }) => (
              <ChipGroup
                label="Experience"
                options={EXPERIENCE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="goal"
            render={({ field, fieldState }) => (
              <ChipGroup
                label="Goal"
                options={GOAL_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          {error && (
            <View className="bg-danger/10 border border-danger rounded-xl px-4 py-3 mb-4">
              <Text className="text-danger text-sm">{error.message}</Text>
            </View>
          )}

          <Button
            title="Save"
            loading={isPending}
            disabled={!isOnline}
            onPress={handleSubmit(onSubmit)}
          />
          <BackButton fallbackRoute="/(tabs)/profile" />
        </ScreenLayout>
      </ScrollView>
    </GradientBackground>
  );
}
