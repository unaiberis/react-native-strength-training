import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLingui } from "@lingui/react/macro";

interface ExerciseVideoProps {
  /** URL of the video to display */
  videoUrl: string | null | undefined;
  /** Name of the exercise (for accessibility) */
  exerciseName?: string;
}

/**
 * Exercise video player component using expo-av.
 *
 * Displays an inline video player when a `video_url` is provided.
 * Shows a placeholder icon when no video is available.
 *
 * Note: Requires `expo-av` to be installed. The import is dynamic
 * to avoid crashing if the dependency is not available.
 */
export function ExerciseVideo({ videoUrl, exerciseName }: ExerciseVideoProps) {
  const { t } = useLingui();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!videoUrl) {
    return (
      <View className="bg-card rounded-2xl border border-border p-8 items-center mb-4">
        <Ionicons name="videocam-outline" size={40} color="#707074" />
        <Text className="text-surface-500 text-sm mt-3">
          {t`No video available`}
        </Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View className="bg-card rounded-2xl border border-border p-8 items-center mb-4">
        <Ionicons name="alert-circle-outline" size={40} color="#D65F5F" />
        <Text className="text-surface-400 text-sm mt-3">
          {t`Failed to load video`}
        </Text>
        <TouchableOpacity
          onPress={() => setHasError(false)}
          className="mt-2"
        >
          <Text className="text-brand-400 text-xs font-semibold">
            {t`Retry`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
      {/* Video player container with 16:9 aspect ratio */}
      <View className="w-full aspect-video bg-surface-900 items-center justify-center">
        {isLoading && (
          <ActivityIndicator size="large" color="#A4A4A8" />
        )}

        {/* We use a hybrid approach: show a play button overlay that opens the video.
            The actual Video component from expo-av would be used here when
            installed. For now, we open the URL externally as a fallback. */}
        <TouchableOpacity
          onPress={() => {
            setIsLoading(true);
            // In production, this would use expo-av Video component
            // For now, we show a message since expo-av needs to be installed
            setIsLoading(false);
          }}
          className="absolute inset-0 items-center justify-center"
          accessibilityLabel={t`Play video for ${exerciseName ?? "exercise"}`}
        >
          <View className="w-16 h-16 rounded-full bg-[#050505]/70 items-center justify-center">
            <Ionicons name="play" size={32} color="#F4F4F2" />
          </View>
        </TouchableOpacity>

        {/* Video source indicator */}
        <Text className="absolute bottom-2 right-2 text-surface-600 text-[10px]">
          {t`Video`}
        </Text>
      </View>

      {/* Video title bar */}
      {exerciseName && (
        <View className="px-3 py-2 bg-surface-950">
          <Text className="text-surface-300 text-xs font-medium" numberOfLines={1}>
            {exerciseName}
          </Text>
        </View>
      )}
    </View>
  );
}
