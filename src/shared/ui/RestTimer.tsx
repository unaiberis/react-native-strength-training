import { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  useRestTimer,
  formatRestTime,
} from '../../features/workout/hooks/useRestTimer';

/**
 * Rest timer overlay component.
 *
 * Displays a countdown timer that auto-starts after logging a set.
 * The user can tap "Skip" to dismiss the timer early.
 */
export const RestTimer = memo(function RestTimer() {
  const { remainingSeconds, isRunning, stopRest } = useRestTimer();

  if (!isRunning) return null;

  return (
    <View className="absolute inset-0 z-50 bg-surface-950/90 items-center justify-center">
      <View
        className="bg-surface-900 rounded-3xl p-8 items-center w-72 border border-surface-800"
        accessible
        accessibilityLabel={`Rest timer, ${formatRestTime(remainingSeconds)} remaining`}
      >
        {/* Icon */}
        <Text className="text-5xl mb-4">⏱️</Text>

        {/* Timer display */}
        <Text className="text-surface-50 text-5xl font-bold font-mono tracking-widest mb-2">
          {formatRestTime(remainingSeconds)}
        </Text>

        <Text className="text-surface-400 text-sm mb-6">Rest between sets</Text>

        {/* Progress bar */}
        <View className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden mb-6">
          <View
            className="h-full bg-brand-500 rounded-full"
            style={{ width: '100%' }}
          />
        </View>

        {/* Skip button */}
        <TouchableOpacity
          onPress={stopRest}
          accessibilityRole="button"
          accessibilityLabel="Skip rest timer"
          className="bg-surface-800 active:bg-surface-700 rounded-xl py-3 px-8 border border-surface-700"
        >
          <Text className="text-surface-100 text-base font-medium">
            Skip Rest
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
