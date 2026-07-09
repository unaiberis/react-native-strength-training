import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Button } from "../../../shared/ui/Button";
import { GradientBackground } from "../../../shared/ui/GradientBackground";
import { useSessionStore } from "../../../stores/session-store";

// ─── Screen ────────────────────────────────────────────────────────────────

/**
 * Full-screen notes editor for an exercise or session.
 *
 * Receives navigation params for context:
 * - mode: "exercise" | "session"
 * - exerciseId (exercise mode): the exercise ID
 * - exerciseName (exercise mode): display name
 * - sessionId: current session ID
 *
 * Auto-saves on back navigation.
 */
export function NotesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode: "exercise" | "session";
    exerciseId?: string;
    exerciseName?: string;
    sessionId?: string;
  }>();

  const exercises = useSessionStore((s) => s.exercises);
  const sessionNotes = useSessionStore((s) => s.sessionNotes);
  const updateExerciseNotes = useSessionStore((s) => s.updateExerciseNotes);
  const updateSessionNotes = useSessionStore((s) => s.updateSessionNotes);

  const isExerciseMode = params.mode === "exercise";

  // Get initial notes from store
  const exerciseNotes = isExerciseMode
    ? exercises.find((ex) => ex.exerciseId === params.exerciseId)?.notes ?? ""
    : "";

  const [text, setText] = useState<string>(
    isExerciseMode ? exerciseNotes : (sessionNotes ?? ""),
  );

  const title = isExerciseMode
    ? (params.exerciseName ?? "Exercise Notes")
    : "Session Notes";

  // Save on unmount / back
  const savedRef = useRef(false);
  const save = useCallback(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    if (isExerciseMode && params.exerciseId) {
      updateExerciseNotes(params.exerciseId, text);
    } else {
      updateSessionNotes(text);
    }
  }, [isExerciseMode, params.exerciseId, text, updateExerciseNotes, updateSessionNotes]);

  const handleBack = useCallback(() => {
    savedRef.current = true;

    if (isExerciseMode && params.exerciseId) {
      updateExerciseNotes(params.exerciseId, text);
    } else {
      updateSessionNotes(text);
    }

    router.back();
  }, [isExerciseMode, params.exerciseId, text, updateExerciseNotes, updateSessionNotes, router]);

  const handleSave = useCallback(() => {
    handleBack();
  }, [handleBack]);

  // Auto-save on back gesture
  useEffect(() => {
    return () => {
      save();
    };
  }, [save]);

  const maxLength = isExerciseMode ? 1000 : 2000;

  return (
    <GradientBackground>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-14 pb-3 bg-surface-950/90">
          <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#A4A4A8" />
          </TouchableOpacity>

          <Text className="text-surface-50 text-lg font-bold flex-1 text-center" numberOfLines={1}>
            {title}
          </Text>

          <View className="w-10" />
        </View>

        {/* Editor */}
        <View className="flex-1 px-4 pt-3">
          <TextInput
            className="bg-card border border-border rounded-xl px-4 py-4 text-surface-50 text-[15px] flex-1"
            placeholder={
              isExerciseMode
                ? "Coach's notes or your own..."
                : "Pre-workout thoughts or post-workout reflections..."
            }
            placeholderTextColor="#707074"
            multiline
            value={text}
            onChangeText={setText}
            maxLength={maxLength}
            textAlignVertical="top"
          />

          {/* Bottom bar */}
          <View className="py-4 gap-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-surface-500 text-xs">
                {text.length}/{maxLength}
              </Text>
            </View>
            <Button
              title="Save Notes"
              variant="primary"
              onPress={handleSave}
            />
          </View>
        </View>
      </View>
    </GradientBackground>
  );
}
