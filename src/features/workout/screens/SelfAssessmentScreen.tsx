import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import {
  useSaveSelfAssessment,
  validateSelfAssessment,
  type SelfAssessmentInput,
} from "../hooks/useSelfAssessment";

// ─── Constants ──────────────────────────────────────────────────────────

interface LikertOption {
  value: number;
  label: string;
}

const SESSION_RPE_OPTIONS: LikertOption[] = [
  { value: 1, label: "Very Light" },
  { value: 2, label: "Light" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Somewhat Hard" },
  { value: 5, label: "Hard" },
  { value: 6, label: "Hard+" },
  { value: 7, label: "Very Hard" },
  { value: 8, label: "Very Hard+" },
  { value: 9, label: "Extremely Hard" },
  { value: 10, label: "Max Effort" },
];

const SLEEP_OPTIONS: LikertOption[] = [
  { value: 1, label: "Terrible" },
  { value: 2, label: "Poor" },
  { value: 3, label: "Fair" },
  { value: 4, label: "Good" },
  { value: 5, label: "Excellent" },
];

const QUALITY_OPTIONS: LikertOption[] = [
  { value: 1, label: "Very Low" },
  { value: 2, label: "Low" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "High" },
  { value: 5, label: "Very High" },
];

const SORENESS_OPTIONS: LikertOption[] = [
  { value: 1, label: "None" },
  { value: 2, label: "Mild" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Quite Sore" },
  { value: 5, label: "Very Sore" },
];

const MOOD_OPTIONS: LikertOption[] = [
  { value: 1, label: "Very Low" },
  { value: 2, label: "Low" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
];

interface LikertField {
  key: keyof Pick<SelfAssessmentInput, "sleepQuality" | "fatigue" | "soreness" | "mood">;
  question: string;
  options: LikertOption[];
  icon: string;
}

const FIELDS: LikertField[] = [
  { key: "sleepQuality", question: "How well did you sleep last night?", options: SLEEP_OPTIONS, icon: "\uD83C\uDF19" },
  { key: "fatigue", question: "How fatigued do you feel?", options: QUALITY_OPTIONS, icon: "\u26A1" },
  { key: "soreness", question: "How sore are you today?", options: SORENESS_OPTIONS, icon: "\uD83E\uDDB5" },
  { key: "mood", question: "How is your mood today?", options: MOOD_OPTIONS, icon: "\uD83D\uDE0A" },
];

// ─── Likert Row Component ───────────────────────────────────────────────

function LikertRow({
  icon,
  question,
  options,
  value,
  onChange,
}: {
  icon: string;
  question: string;
  options: LikertOption[];
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <Card className="mb-4">
      <View className="flex-row items-center gap-3 mb-3">
        <Text className="text-xl">{icon}</Text>
        <Text className="text-surface-50 text-sm font-semibold flex-1">{question}</Text>
      </View>
      <View className="flex-row justify-between gap-1">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={`flex-1 items-center py-2.5 rounded-xl border ${
                isSelected
                  ? "bg-surface-800 border-surface-400"
                  : "bg-surface-900 border-surface-700 active:bg-surface-800"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isSelected ? "text-surface-50" : "text-surface-400"
                }`}
              >
                {opt.value}
              </Text>
              <Text
                className={`text-[10px] mt-0.5 ${
                  isSelected ? "text-surface-50/80" : "text-surface-500"
                }`}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
}

// ─── RPE Selector ────────────────────────────────────────────────────────

function SessionRpeSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <Card className="mb-4">
      <View className="flex-row items-center gap-3 mb-3">
        <Text className="text-xl">{/* flex emoji */}</Text>
        <View className="flex-1">
          <Text className="text-surface-50 text-sm font-semibold">Session RPE</Text>
          <Text className="text-surface-400 text-xs">Overall difficulty of today's workout</Text>
        </View>
      </View>
      <View className="flex-row justify-between gap-1">
        {SESSION_RPE_OPTIONS.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={`flex-1 items-center py-2 rounded-xl border ${
                isSelected
                  ? "bg-surface-800 border-surface-400"
                  : "bg-surface-900 border-surface-700"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isSelected ? "text-surface-50" : "text-surface-400"
                }`}
              >
                {opt.value}
              </Text>
              <Text
                className={`text-[8px] mt-0.5 leading-tight text-center ${
                  isSelected ? "text-surface-50/80" : "text-surface-500"
                }`}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────

export function SelfAssessmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const saveMutation = useSaveSelfAssessment();

  const [form, setForm] = useState({
    sessionRpe: null as number | null,
    sleepQuality: null as number | null,
    fatigue: null as number | null,
    soreness: null as number | null,
    mood: null as number | null,
  });

  const updateField = useCallback(
    (field: string, value: number) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const isComplete = form.sessionRpe != null
    && form.sleepQuality != null
    && form.fatigue != null
    && form.soreness != null
    && form.mood != null;

  const handleSubmit = useCallback(async () => {
    if (!isComplete) return;

    const validation = validateSelfAssessment({
      sessionRpe: form.sessionRpe!,
      sleepQuality: form.sleepQuality!,
      fatigue: form.fatigue!,
      soreness: form.soreness!,
      mood: form.mood!,
    });

    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      Alert.alert("Validation Error", firstError);
      return;
    }

    try {
      await saveMutation.mutateAsync({
        sessionId: params.sessionId ?? null,
        date: new Date().toISOString().split("T")[0],
        sessionRpe: form.sessionRpe!,
        sleepQuality: form.sleepQuality!,
        fatigue: form.fatigue!,
        soreness: form.soreness!,
        mood: form.mood!,
      });

      Alert.alert("Saved!", "Your assessment has been recorded.", [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (err) {
      Alert.alert("Error", (err as Error).message ?? "Failed to save assessment");
    }
  }, [form, isComplete, saveMutation, params.sessionId, router]);

  const handleSkip = useCallback(() => {
    router.replace("/(tabs)");
  }, [router]);

  return (
    <GradientBackground>
      <View className="flex-1">
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingTop: 80, paddingBottom: 32 }}
        >
          {/* Header */}
          <Text className="text-surface-50 text-2xl font-bold mb-1">
            How was the workout?
          </Text>
          <Text className="text-surface-400 text-sm mb-6">
            Help us understand how you're feeling. This helps adjust future sessions.
          </Text>

          {/* Session RPE */}
          <SessionRpeSelector
            value={form.sessionRpe}
            onChange={(v) => updateField("sessionRpe", v)}
          />

          {/* Wellness fields */}
          {FIELDS.map((field) => (
            <LikertRow
              key={field.key}
              icon={field.icon}
              question={field.question}
              options={field.options}
              value={form[field.key] as number | null}
              onChange={(v) => updateField(field.key, v)}
            />
          ))}

          {/* Success message */}
          {saveMutation.isSuccess && (
            <Card className="mb-4">
              <Text className="text-surface-400 text-sm text-center">
                Assessment saved successfully!
              </Text>
            </Card>
          )}

          {/* Error message */}
          {saveMutation.isError && (
            <Card className="mb-4 border-danger/30">
              <Text className="text-danger text-sm text-center">
                {saveMutation.error?.message ?? "Failed to save assessment"}
              </Text>
            </Card>
          )}

          {/* Actions */}
          <View className="w-full gap-3 mt-2">
            <Button
              title={saveMutation.isSuccess ? "Done" : "Submit Assessment"}
              variant="primary"
              onPress={saveMutation.isSuccess ? handleSkip : handleSubmit}
              disabled={!isComplete && !saveMutation.isSuccess}
              loading={saveMutation.isPending}
            />
            {!saveMutation.isSuccess && (
              <Button
                title="Skip for Now"
                variant="ghost"
                onPress={handleSkip}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}
