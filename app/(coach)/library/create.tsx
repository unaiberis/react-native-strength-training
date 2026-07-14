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
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCreateExercise } from "@/features/coach/hooks/useCoachExercises";
import { useCoachCategories } from "@/features/coach/hooks/useCoachExercises";

export default function ExerciseCreateScreen() {
  const router = useRouter();
  const createMutation = useCreateExercise();
  const { data: categories } = useCoachCategories();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [defaultSets, setDefaultSets] = useState("3");
  const [defaultReps, setDefaultReps] = useState("10");
  const [defaultRest, setDefaultRest] = useState("90");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const allCategories = categories ?? [];

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Exercise name is required");
      return;
    }

    const finalCategory = showCustomCategory
      ? customCategory.trim()
      : category;

    if (!finalCategory) {
      Alert.alert("Required", "Please select or enter a category");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        category: finalCategory,
        description: description.trim() || null,
        videoUrl: videoUrl.trim() || null,
        defaultSets: parseInt(defaultSets, 10) || 3,
        defaultReps: parseInt(defaultReps, 10) || 10,
        defaultRestSeconds: parseInt(defaultRest, 10) || 90,
      });
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to create exercise");
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Create Exercise",
          headerStyle: { backgroundColor: "#050505" },
          headerTintColor: "#F4F4F2",
        }}
      />
      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, backgroundColor: "#050505" }}>
        {/* Name */}
        <Text className="text-surface-400 text-sm font-semibold mb-1.5">
          Exercise Name *
        </Text>
        <TextInput
          className="bg-card border border-border rounded-xl px-4 py-3 text-surface-50 text-base mb-4"
          placeholder="e.g. Barbell Bench Press"
          placeholderTextColor="#707074"
          value={name}
          onChangeText={setName}
        />

        {/* Category */}
        <Text className="text-surface-400 text-sm font-semibold mb-1.5">
          Category *
        </Text>
        {!showCustomCategory ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
            >
              {allCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    category === cat
                      ? "bg-surface-50"
                      : "bg-card border border-border"
                  }`}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      category === cat
                        ? "text-background"
                        : "text-surface-400"
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowCustomCategory(true)}
              className="mb-4"
            >
              <Text className="text-titanium text-sm">+ Custom category</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View className="flex-row items-center gap-2 mb-4">
            <TextInput
              className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-surface-50 text-base"
              placeholder="Enter category name"
              placeholderTextColor="#707074"
              value={customCategory}
              onChangeText={setCustomCategory}
            />
            <TouchableOpacity
              onPress={() => {
                setShowCustomCategory(false);
                setCustomCategory("");
              }}
              className="bg-graphite rounded-xl p-3 min-w-[44px] min-h-[44px] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Cancel custom category"
            >
              <Ionicons name="close" size={18} color="#B9B9B6" />
            </TouchableOpacity>
          </View>
        )}

        {/* Description */}
        <Text className="text-surface-400 text-sm font-semibold mb-1.5">
          Description
        </Text>
        <TextInput
          className="bg-card border border-border rounded-xl px-4 py-3 text-surface-50 text-base mb-4"
          placeholder="Exercise description, cues, tips..."
          placeholderTextColor="#707074"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Video URL */}
        <Text className="text-surface-400 text-sm font-semibold mb-1.5">
          Video URL
        </Text>
        <TextInput
          className="bg-card border border-border rounded-xl px-4 py-3 text-surface-50 text-base mb-4"
          placeholder="https://example.com/demo.mp4"
          placeholderTextColor="#707074"
          value={videoUrl}
          onChangeText={setVideoUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        {/* Parameters row */}
        <Text className="text-surface-400 text-sm font-semibold mb-3">
          Default Parameters
        </Text>
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1">
            <Text className="text-surface-500 text-xs mb-1">Sets</Text>
            <TextInput
              className="bg-card border border-border rounded-xl px-4 py-3 text-surface-50 text-base"
              value={defaultSets}
              onChangeText={setDefaultSets}
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <Text className="text-surface-500 text-xs mb-1">Reps</Text>
            <TextInput
              className="bg-card border border-border rounded-xl px-4 py-3 text-surface-50 text-base"
              value={defaultReps}
              onChangeText={setDefaultReps}
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <Text className="text-surface-500 text-xs mb-1">Rest (s)</Text>
            <TextInput
              className="bg-card border border-border rounded-xl px-4 py-3 text-surface-50 text-base"
              value={defaultRest}
              onChangeText={setDefaultRest}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          className={`bg-surface-50 rounded-2xl py-4 items-center mb-8 ${
            createMutation.isPending ? "opacity-50" : ""
          }`}
          onPress={handleSave}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#050505" />
          ) : (
            <Text className="text-background font-bold text-base">
              Save Exercise
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
