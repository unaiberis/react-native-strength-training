import { View, Text, TextInput, TouchableOpacity } from "react-native";

interface AmrapResultInputProps {
  /** Number of completed rounds */
  rounds: number;
  /** Number of partial reps in the final round */
  partialReps: number;
  /** Called when rounds value changes */
  onRoundsChange: (rounds: number) => void;
  /** Called when partial reps value changes */
  onPartialRepsChange: (reps: number) => void;
}

/**
 * Input component for recording AMRAP results.
 *
 * Takes the number of completed rounds and any partial reps
 * from the incomplete final round.
 */
export function AmrapResultInput({
  rounds,
  partialReps,
  onRoundsChange,
  onPartialRepsChange,
}: AmrapResultInputProps) {
  const handleRoundsChange = (text: string) => {
    const val = parseInt(text, 10);
    if (!isNaN(val) && val >= 0) {
      onRoundsChange(val);
    } else if (text === "") {
      onRoundsChange(0);
    }
  };

  const handlePartialRepsChange = (text: string) => {
    const val = parseInt(text, 10);
    if (!isNaN(val) && val >= 0) {
      onPartialRepsChange(val);
    } else if (text === "") {
      onPartialRepsChange(0);
    }
  };

  return (
    <View className="bg-card rounded-2xl border border-border p-4 gap-4">
      <Text className="text-surface-50 text-base font-bold">
        AMRAP Result
      </Text>

      <View className="flex-row gap-4">
        {/* Rounds Input */}
        <View className="flex-1">
          <Text className="text-surface-400 text-xs font-semibold mb-2">
            Completed Rounds
          </Text>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => onRoundsChange(Math.max(0, rounds - 1))}
              className="w-10 h-10 items-center justify-center rounded-xl bg-surface-800 active:opacity-60"
            >
              <Text className="text-surface-50 text-lg">\u2212</Text>
            </TouchableOpacity>
            <TextInput
              className="flex-1 h-10 bg-surface-900 rounded-xl border border-surface-700 text-surface-50 text-center text-lg font-bold"
              value={String(rounds)}
              onChangeText={handleRoundsChange}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              onPress={() => onRoundsChange(rounds + 1)}
              className="w-10 h-10 items-center justify-center rounded-xl bg-surface-800 active:opacity-60"
            >
              <Text className="text-surface-50 text-lg">+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Partial Reps Input */}
        <View className="flex-1">
          <Text className="text-surface-400 text-xs font-semibold mb-2">
            Partial Reps
          </Text>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => onPartialRepsChange(Math.max(0, partialReps - 1))}
              className="w-10 h-10 items-center justify-center rounded-xl bg-surface-800 active:opacity-60"
            >
              <Text className="text-surface-50 text-lg">\u2212</Text>
            </TouchableOpacity>
            <TextInput
              className="flex-1 h-10 bg-surface-900 rounded-xl border border-surface-700 text-surface-50 text-center text-lg font-bold"
              value={String(partialReps)}
              onChangeText={handlePartialRepsChange}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              onPress={() => onPartialRepsChange(partialReps + 1)}
              className="w-10 h-10 items-center justify-center rounded-xl bg-surface-800 active:opacity-60"
            >
              <Text className="text-surface-50 text-lg">+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
