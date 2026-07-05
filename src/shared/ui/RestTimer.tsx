import { View, Text, TouchableOpacity } from "react-native";
import { useRestTimer, formatRestTime } from "../../features/workout/hooks/useRestTimer";

/**
 * Rest timer overlay component.
 *
 * Displays a countdown timer that auto-starts after logging a set.
 * The user can tap "Skip" to dismiss the timer early.
 */
export function RestTimer() {
  const { remainingSeconds, isRunning, stopRest } = useRestTimer();

  if (!isRunning) return null;

  const progress = 1;

  return (
    <View className="absolute inset-0 z-50 bg-[#050505]/90 items-center justify-center">
      <View className="bg-card rounded-2xl p-8 items-center w-72 border border-border">
        {/* Icon */}
        <Text className="text-5xl mb-4">⏱️</Text>

        {/* Timer display */}
        <Text className="text-surface-50 text-5xl font-extrabold tracking-widest mb-2">
          {formatRestTime(remainingSeconds)}
        </Text>

        <Text className="text-surface-400 text-[13px] font-semibold mb-6">Rest between sets</Text>

        {/* Progress bar */}
        <View className="w-full h-1.5 bg-card-soft rounded-full overflow-hidden mb-6">
          <View
            className="h-full bg-surface-400 rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </View>

        {/* Skip button */}
        <TouchableOpacity
          onPress={stopRest}
          className="bg-card-soft active:bg-surface-800 rounded-xl py-3 px-8 border border-border"
        >
          <Text className="text-surface-50 text-[15px] font-bold">Skip Rest</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
