import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { pb } from "@/lib/pocketbase/client";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { ScreenTitle } from "@/shared/ui/ScreenTitle";
import { KickerLabel } from "@/shared/ui/KickerLabel";
import { GradientBackground } from "@/shared/ui/GradientBackground";

// ─── Types ─────────────────────────────────────────────────────────────────

type UnitSystem = "metric" | "imperial";
type Experience = "beginner" | "intermediate" | "advanced";
type Goal = "strength" | "hypertrophy" | "endurance" | "general_fitness";

// ─── Constants ─────────────────────────────────────────────────────────────

const EXPERIENCE_OPTIONS: { label: string; value: Experience }[] = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const GOAL_OPTIONS: { label: string; value: Goal }[] = [
  { label: "Strength", value: "strength" },
  { label: "Hypertrophy", value: "hypertrophy" },
  { label: "Endurance", value: "endurance" },
  { label: "General Fitness", value: "general_fitness" },
];

// ─── ChipSelector ──────────────────────────────────────────────────────────

interface ChipOption<T extends string> {
  label: string;
  value: T;
}

function ChipSelector<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: ChipOption<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onSelect(opt.value)}
          className={`px-4 py-2.5 rounded-xl border ${
            selected === opt.value
              ? "border-titanium bg-cardSoft"
              : "border-border bg-card"
          }`}
        >
          <Text
            className={`text-[15px] font-semibold ${
              selected === opt.value ? "text-titanium" : "text-surface-400"
            }`}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── UnitToggle ────────────────────────────────────────────────────────────

function UnitToggle({
  unit,
  onToggle,
  metricLabel,
  imperialLabel,
}: {
  unit: UnitSystem;
  onToggle: (unit: UnitSystem) => void;
  metricLabel: string;
  imperialLabel: string;
}) {
  return (
    <View className="flex-row gap-2">
      <Pressable
        onPress={() => onToggle("metric")}
        className={`flex-1 py-2 rounded-xl border ${
          unit === "metric"
            ? "border-titanium bg-cardSoft"
            : "border-border bg-card"
        }`}
      >
        <Text
          className={`text-center text-[13px] font-bold ${
            unit === "metric" ? "text-titanium" : "text-surface-400"
          }`}
        >
          {metricLabel}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onToggle("imperial")}
        className={`flex-1 py-2 rounded-xl border ${
          unit === "imperial"
            ? "border-titanium bg-cardSoft"
            : "border-border bg-card"
        }`}
      >
        <Text
          className={`text-center text-[13px] font-bold ${
            unit === "imperial" ? "text-titanium" : "text-surface-400"
          }`}
        >
          {imperialLabel}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────

export function SignUpInfoScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setPendingSignupInfo = useAuthStore((s) => s.setPendingSignupInfo);

  const [bodyweight, setBodyweight] = useState("");
  const [height, setHeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<UnitSystem>("metric");
  const [heightUnit, setHeightUnit] = useState<UnitSystem>("metric");
  const [experience, setExperience] = useState<Experience | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigateHome = useCallback(() => {
    setPendingSignupInfo(false);
    router.replace("/(tabs)");
  }, [router, setPendingSignupInfo]);

  const skipToHome = useCallback(() => {
    navigateHome();
  }, [navigateHome]);

  const handleCompleteSetup = useCallback(async () => {
    if (!bodyweight || !height || !experience || !goal) {
      setError("Please fill in all fields or skip for now");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (user?.id) {
        await pb.collection("users").update(user.id, {
          bodyweight: parseFloat(bodyweight),
          bodyweight_unit: weightUnit,
          height: parseFloat(height),
          height_unit: heightUnit,
          experience,
          goal,
          onboarding_completed: true,
        });
      }
      navigateHome();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save profile information");
    } finally {
      setIsSubmitting(false);
    }
  }, [bodyweight, height, weightUnit, heightUnit, experience, goal, user, navigateHome]);

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="flex-grow px-7 py-12"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="items-center mb-10">
            <KickerLabel className="mb-2">WELCOME</KickerLabel>
            <ScreenTitle title="Let's get to know you" />
          </View>

          {/* Error */}
          {error && (
            <View className="bg-danger/10 border border-danger rounded-xl px-4 py-3 mb-6">
              <Text className="text-danger text-sm">{error}</Text>
            </View>
          )}

          {/* Bodyweight */}
          <Card className="mb-4">
            <Text className="text-surface-50 text-[17px] font-bold mb-3">
              Bodyweight
            </Text>
            <TextInput
              className="bg-card border border-border rounded-xl px-4 py-3.5 text-surface-50 text-[15px] font-medium mb-3"
              placeholder="Enter your weight"
              placeholderTextColor="#707074"
              keyboardType="decimal-pad"
              value={bodyweight}
              onChangeText={(text) => {
                setBodyweight(text);
                setError(null);
              }}
            />
            <UnitToggle
              unit={weightUnit}
              onToggle={setWeightUnit}
              metricLabel="kg"
              imperialLabel="lbs"
            />
          </Card>

          {/* Height */}
          <Card className="mb-4">
            <Text className="text-surface-50 text-[17px] font-bold mb-3">
              Height
            </Text>
            <TextInput
              className="bg-card border border-border rounded-xl px-4 py-3.5 text-surface-50 text-[15px] font-medium mb-3"
              placeholder="Enter your height"
              placeholderTextColor="#707074"
              keyboardType="decimal-pad"
              value={height}
              onChangeText={(text) => {
                setHeight(text);
                setError(null);
              }}
            />
            <UnitToggle
              unit={heightUnit}
              onToggle={setHeightUnit}
              metricLabel="cm"
              imperialLabel="in"
            />
          </Card>

          {/* Training Experience */}
          <Card className="mb-4">
            <Text className="text-surface-50 text-[17px] font-bold mb-3">
              Training Experience
            </Text>
            <ChipSelector
              options={EXPERIENCE_OPTIONS}
              selected={experience}
              onSelect={(value) => {
                setExperience(value);
                setError(null);
              }}
            />
          </Card>

          {/* Primary Goal */}
          <Card className="mb-4">
            <Text className="text-surface-50 text-[17px] font-bold mb-3">
              Primary Goal
            </Text>
            <ChipSelector
              options={GOAL_OPTIONS}
              selected={goal}
              onSelect={(value) => {
                setGoal(value);
                setError(null);
              }}
            />
          </Card>

          {/* Actions */}
          <View className="mt-6 gap-3">
            <Button
              title="Complete Setup"
              loading={isSubmitting}
              onPress={handleCompleteSetup}
            />
            <Button
              title="Skip for now"
              variant="ghost"
              onPress={skipToHome}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}
