import { useState, useMemo } from "react";
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
import { useUserTeams } from "@/features/coach/hooks/useTeams";
import { useTemplates } from "@/features/routines/hooks/useTemplates";

export function CoachAssignmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    athleteId?: string;
    athleteName?: string;
    teamId?: string;
    date?: string;
  }>();
  const [selectedAthlete, setSelectedAthlete] = useState(
    params.athleteId ?? "",
  );
  const [selectedTeam, setSelectedTeam] = useState(params.teamId ?? "");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [startDate, setStartDate] = useState(
    params.date ?? new Date().toISOString().split("T")[0],
  );
  const [step, setStep] = useState<"athlete" | "team" | "template" | "confirm">(
    params.athleteId ? (params.teamId ? "template" : "team") : "athlete",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAthletes = useMemo(() => {
    if (!searchQuery.trim()) return athletes;
    const q = searchQuery.toLowerCase();
    return athletes.filter(
      (a) =>
        a.displayName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q),
    );
  }, [athletes, searchQuery]);

  const assignMutation = useAssignProgram();
  const { athletes } = useCoachDashboard();
  const { data: teams = [] } = useUserTeams();
  const { data: templates } = useTemplates();

  const athleteName = params.athleteName
    ? decodeURIComponent(params.athleteName)
    : athletes.find((a) => a.id === selectedAthlete)?.displayName ?? "";

  const selectedTeamName = teams.find(
    (t) => t.id === selectedTeam,
  )?.name ?? "";

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
        startedAt: startDate,
        teamId: selectedTeam || undefined,
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
      <ScrollView className="flex-1 px-4 pt-4 bg-soft">
        {/* Step indicator */}
        <View className="flex-row items-center justify-center mb-6 gap-2">
          {["athlete", "team", "template", "confirm"].map((s, i) => (
            <View key={s} className="flex-row items-center">
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  step === s
                    ? "bg-sacred"
                    : ["athlete", "team", "template", "confirm"].indexOf(step) >= i
                      ? "bg-card border border-sacred/30"
                      : "bg-graphite"
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    step === s
                      ? "text-background"
                      : ["athlete", "team", "template", "confirm"].indexOf(step) >= i
                        ? "text-sacred"
                        : "text-surface-500"
                  }`}
                >
                  {i + 1}
                </Text>
              </View>
              {i < 3 && (
                <View
                  className={`w-8 h-0.5 mx-1 ${
                    ["athlete", "team", "template", "confirm"].indexOf(step) > i
                      ? "bg-sacred/30"
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
                <View className="bg-card border border-border rounded-2xl p-8 items-center shadow-card">
                <Text className="text-surface-400 text-sm">
                  No athletes available
                </Text>
              </View>
            ) : (
              <>
                {/* Search bar */}
                <View className="flex-row items-center bg-card border border-border rounded-xl px-3 mb-4 min-h-[44px]">
                  <Ionicons name="search-outline" size={18} color="#707074" />
                  <TextInput
                    className="flex-1 text-surface-50 text-sm ml-2"
                    placeholder="Search athletes..."
                    placeholderTextColor="#707074"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    accessibilityLabel="Search athletes"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery("")}
                      className="min-w-[44px] min-h-[44px] items-center justify-center"
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                    >
                      <Ionicons name="close-circle" size={18} color="#707074" />
                    </TouchableOpacity>
                  )}
                </View>
              {filteredAthletes.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  className={`bg-card border rounded-2xl p-4 mb-3 shadow-button ${
                  selectedAthlete === a.id
                    ? "border-surface-50"
                    : "border-border"
                  }`}
                  onPress={() => {
                    setSelectedAthlete(a.id);
                    setStep("team");
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
                        color="#D7D7D2"
                        className="ml-auto"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </>
            )}
          </>
        )}

        {/* Step 2: Select Team */}
        {step === "team" && (
          <>
            <Text className="text-surface-50 text-lg font-bold mb-4">
              Select Team for {athleteName}
            </Text>
            {teams.length === 0 ? (
                <View className="bg-card border border-border rounded-2xl p-8 items-center shadow-card">
                <Text className="text-surface-400 text-sm">
                  No teams available
                </Text>
              </View>
            ) : (
              teams.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  className={`bg-card border rounded-2xl p-4 mb-3 shadow-button ${
                  selectedTeam === t.id
                    ? "border-surface-50"
                    : "border-border"
                  }`}
                  onPress={() => {
                    setSelectedTeam(t.id);
                    setStep("template");
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-surface-50 font-semibold">
                        {t.name}
                      </Text>
                      {t.description ? (
                        <Text className="text-surface-400 text-xs mt-0.5">
                          {t.description}
                        </Text>
                      ) : null}
                      <View className="flex-row items-center gap-3 mt-1">
                        <Text className="text-surface-500 text-xs">
                          {t.member_count} members
                        </Text>
                        <Text className="text-surface-500 text-xs">
                          {t.athlete_count} athletes
                        </Text>
                      </View>
                    </View>
                    {selectedTeam === t.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#D7D7D2"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
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

        {/* Step 3: Select Template */}
        {step === "template" && (
          <>
            <Text className="text-surface-50 text-lg font-bold mb-4">
              Select Program for {athleteName}
            </Text>
            {(templates ?? []).map((t: any) => (
              <TouchableOpacity
                key={t.id}
                className={`bg-card border rounded-2xl p-4 mb-3 shadow-button ${
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
                  <View className="flex-1 mr-2">
                    <Text className="text-surface-50 font-semibold">
                      {t.name}
                    </Text>
                    <View className="flex-row items-center gap-3 mt-1">
                      <Text className="text-surface-500 text-xs">
                        {t.exercises.length} exercises
                      </Text>
                      {t.description ? (
                        <Text className="text-surface-500 text-xs flex-1" numberOfLines={1}>
                          {t.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {selectedTemplate === t.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#D7D7D2"
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              className="mt-2"
              onPress={() => setStep("team")}
            >
              <Text className="text-titanium text-sm text-center">
                ← Back to team selection
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && (
          <>
            <Text className="text-surface-50 text-lg font-bold mb-4">
              Confirm Assignment
            </Text>

            <View className="bg-card border border-border rounded-2xl p-5 mb-4 shadow-card">
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
                  TEAM
                </Text>
                <Text className="text-surface-50 font-semibold text-base">
                  {selectedTeamName || "No team"}
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
                  className="bg-soft border border-border rounded-xl px-4 py-3 text-surface-50 text-base mt-1"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#707074"
                  inputMode="numeric"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
              className="flex-1 bg-card border border-border rounded-2xl py-4 items-center shadow-button"
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
