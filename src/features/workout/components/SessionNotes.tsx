import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../../shared/ui/Card";

// ─── Props ─────────────────────────────────────────────────────────────────

interface SessionNotesProps {
  sessionId: string;
  notes: string | null;
  onNotesChange: (notes: string) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Overall session notes (pre-workout thoughts or post-workout reflections).
 *
 * Collapsed by default with "Session Notes" header.
 * Auto-saves (debounced, 500ms).
 * Styled to match the design system.
 */
export function SessionNotes({
  sessionId,
  notes,
  onNotesChange,
}: SessionNotesProps) {
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
        onNotesChange(text);
      }, 500);
    },
    [onNotesChange],
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
    <Card className="w-full">
      {/* Header / toggle */}
      <TouchableOpacity
        onPress={() => setExpanded((prev) => !prev)}
        className="flex-row items-center justify-between"
        activeOpacity={0.7}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons
            name="document-text-outline"
            size={18}
            color="#A4A4A8"
          />
          <Text className="text-surface-50 text-base font-bold">
            Session Notes
          </Text>
          {hasNotes && !expanded && (
            <View className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          )}
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#707074"
        />
      </TouchableOpacity>

      {/* Expandable text area */}
      {expanded && (
        <View className="mt-3">
          <TextInput
            className="bg-surface-900 border border-surface-700 rounded-xl px-4 py-3 text-surface-50 text-[15px] min-h-[100px]"
            placeholder="Pre-workout thoughts or post-workout reflections..."
            placeholderTextColor="#707074"
            multiline
            value={localNotes}
            onChangeText={handleChangeText}
            maxLength={2000}
            textAlignVertical="top"
          />
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-surface-500 text-xs">
              {localNotes.length}/2000
            </Text>
            {hasNotes && (
              <Text className="text-surface-500 text-xs">
                Auto-saved
              </Text>
            )}
          </View>
        </View>
      )}
    </Card>
  );
}
