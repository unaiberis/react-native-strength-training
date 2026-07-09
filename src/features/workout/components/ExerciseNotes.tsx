import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ─── Props ─────────────────────────────────────────────────────────────────

interface ExerciseNotesProps {
  exerciseId: string;
  exerciseName: string;
  notes: string | null;
  onNotesChange: (exerciseId: string, notes: string) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Expandable notes section attached to an exercise in the active workout.
 *
 * Shows a note icon button — tapping expands a text input.
 * Auto-saves to local state (debounced, 500ms).
 * Shows an indicator dot if notes exist.
 */
export function ExerciseNotes({
  exerciseId,
  exerciseName,
  notes,
  onNotesChange,
}: ExerciseNotesProps) {
  const [expanded, setExpanded] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when notes prop changes externally
  useEffect(() => {
    setLocalNotes(notes ?? "");
  }, [notes]);

  // Debounced save
  const handleChangeText = useCallback(
    (text: string) => {
      setLocalNotes(text);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onNotesChange(exerciseId, text);
      }, 500);
    },
    [exerciseId, onNotesChange],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const hasNotes = notes !== null && notes.trim().length > 0;

  return (
    <View className="mt-2">
      {/* Toggle button */}
      <TouchableOpacity
        onPress={() => setExpanded((prev) => !prev)}
        className="flex-row items-center gap-2 py-1"
        activeOpacity={0.7}
      >
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#707074"
        />
        <Text className="text-surface-400 text-xs font-semibold">
          {expanded ? "Hide notes" : hasNotes ? "Edit notes" : "Add note"}
        </Text>
        {hasNotes && !expanded && (
          <View className="w-1.5 h-1.5 rounded-full bg-brand-500" />
        )}
      </TouchableOpacity>

      {/* Expandable input */}
      {expanded && (
        <View className="bg-card border border-border rounded-xl p-3 mt-1">
          <TextInput
            className="bg-surface-900 border border-surface-700 rounded-lg px-3 py-2.5 text-surface-50 text-sm min-h-[72px]"
            placeholder="Coach's notes or your own..."
            placeholderTextColor="#707074"
            multiline
            numberOfLines={3}
            value={localNotes}
            onChangeText={handleChangeText}
            maxLength={1000}
            textAlignVertical="top"
          />
          <View className="flex-row justify-between items-center mt-1.5">
            <Text className="text-surface-500 text-xs">
              {localNotes.length}/1000
            </Text>
            {hasNotes && (
              <Text className="text-surface-500 text-xs">
                Auto-saved
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
