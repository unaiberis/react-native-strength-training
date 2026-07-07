import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCoachDashboard } from "@/features/coach/hooks/useCoachDashboard";
import { useAssignProgram } from "@/features/coach/hooks/useProgramAssignment";
import { useTemplates } from "@/features/routines/hooks/useTemplates";

export default function ProgramAssignmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    athleteId?: string;
    athleteName?: string;
  }>();
  const [selectedAthlete, setSelectedAthlete] = useState(
    params.athleteId ?? "",
  );
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [step, setStep] = useState<"athlete" | "template" | "confirm">(
    params.athleteId ? "template" : "athlete",
  );

  const assignMutation = useAssignProgram();
  const { athletes } = useCoachDashboard();
  const { data: templates } = useTemplates();

  const athleteName = params.athleteName
    ? decodeURIComponent(params.athleteName)
    : athletes.find((a) => a.id === selectedAthlete)?.displayName ?? "";

  const selectedTemplateName = (templates ?? []).find(
    (t: any) => t.id === selectedTemplate,
  )?.name;

  const handleConfirm = async () => {
    if (!selectedAthlete || !selectedTemplate || !startDate) {
      Alert.alert("Required", "Please select athlete, template, and date.");
      return;
    }

    try {
      await assignMutation.mutateAsync({
        athleteId: selectedAthlete,
        templateId: selectedTemplate,
        startDate,
      });
      Alert.alert("Done", "Program assigned successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to assign program");
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Assign Program",
          headerStyle: { backgroundColor: "#050505" },
          headerTintColor: "#F4F4F2",
        }}
      />
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Step indicator */}
        <View className="flex-row items-center justify-center mb-6 gap-2">
          {["athlete", "template", "confirm"].map((s, i) => (
            <View key={s} className="flex-row items-center">
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  step === s
                    ? "bg-surface-50"
                    : ["athlete", "template", "confirm"].indexOf(step) >= i
                      ? "bg-green-900/40"
                      : "bg-graphite"
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    step === s
                      ? "text-background"
                      : ["athlete", "template", "confirm"].indexOf(step) >= i
                        ? "text-green-400"
                        : "text-surface-500"
                  }`}
                >
                  {i + 1}
                </Text>
              </View>
              {i < 2 && (
                <View
                  className={`w-8 h-0.5 mx-1 ${
                    ["athlete", "template", "confirm"].indexOf(step) > i
                      ? "bg-green-900/40"
                      : "bg-graphite"
                  }`}
                />
              )}
            </View>
          ))}
        </View>

        {/* Step 1: Select Athlete */}
        {step === "athlete" && (
          <>
            <Text className="text-surface-50 text-lg font-bold mb-4">
              Select Athlete
            </Text>
            {athletes.length === 0 ? (
              <View className="bg-card border border-border rounded-2xl p-8 items-center">
                <Text className="text-surface-400 text-sm">
                  No athletes available
                </Text>
              </View>
            ) : (
              athletes.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  className={`bg-card border rounded-2xl p-4 mb-3 ${
                    selectedAthlete === a.id
                      ? "border-surface-50"
                      : "border-border"
                  }`}
                  onPress={() => {
                    setSelectedAthlete(a.id);
                    setStep("template");
                  }}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-graphite items-center justify-center">
                      <Text className="text-surface-50 font-bold">
                        {a.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-surface-50 font-semibold">
                        {a.displayName}
                      </Text>
                      <Text className="text-surface-400 text-xs">
                        {a.totalWorkouts} workouts
                      </Text>
                    </View>
                    {selectedAthlete === a.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4ade80"
                        className="ml-auto"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* Step 2: Select Template */}
        {step === "template" && (
          <>
            <Text className="text-surface-50 text-lg font-bold mb-4">
              Select Program for {athleteName}
            </Text>
            {(templates ?? []).map((t: any) => (
              <TouchableOpacity
                key={t.id}
                className={`bg-card border rounded-2xl p-4 mb-3 ${
                  selectedTemplate === t.id
                    ? "border-surface-50"
                    : "border-border"
                }`}
                onPress={() => {
                  setSelectedTemplate(t.id);
                  setStep("confirm");
                }}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-surface-50 font-semibold">
                    {t.name}
                  </Text>
                  {selectedTemplate === t.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#4ade80"
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              className="mt-2"
              onPress={() => setStep("athlete")}
            >
              <Text className="text-titanium text-sm text-center">
                ← Back to athlete selection
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <>
            <Text className="text-surface-50 text-lg font-bold mb-4">
              Confirm Assignment
            </Text>

            <View className="bg-card border border-border rounded-2xl p-5 mb-4">
              <View className="mb-4">
                <Text className="text-surface-500 text-xs font-semibold mb-1">
                  ATHLETE
                </Text>
                <Text className="text-surface-50 font-semibold text-base">
                  {athleteName}
                </Text>
              </View>
              <View className="mb-4">
                <Text className="text-surface-500 text-xs font-semibold mb-1">
                  PROGRAM
                </Text>
                <Text className="text-surface-50 font-semibold text-base">
                  {selectedTemplateName}
                </Text>
              </View>
              <View>
                <Text className="text-surface-500 text-xs font-semibold mb-1">
                  START DATE
                </Text>
                <TextInput
                  className="bg-backgroundSoft border border-border rounded-xl px-4 py-3 text-surface-50 text-base mt-1"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#707074"
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-card border border-border rounded-2xl py-4 items-center"
                onPress={() => setStep("template")}
              >
                <Text className="text-surface-400 font-semibold">Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 bg-surface-50 rounded-2xl py-4 items-center ${
                  assignMutation.isPending ? "opacity-50" : ""
                }`}
                onPress={handleConfirm}
                disabled={assignMutation.isPending}
              >
                {assignMutation.isPending ? (
                  <ActivityIndicator size="small" color="#050505" />
                ) : (
                  <Text className="text-background font-bold">
                    Confirm Assignment
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}
