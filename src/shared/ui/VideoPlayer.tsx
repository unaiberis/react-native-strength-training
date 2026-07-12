import React from "react";
import { View, Text, TouchableOpacity, Linking, Platform } from "react-native";

interface VideoPlayerProps {
  videoUrl: string | null;
}

/**
 * Determines whether a URL is from YouTube.
 */
function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

/**
 * Parse the video URL into an embeddable ID (YouTube only).
 * Returns null for non-YouTube URLs or if ID can't be extracted.
 */
function parseYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
    /(?:youtube\.com\/embed\/)([\w-]+)/,
  ];
  for (const re of patterns) {
    const match = url.match(re);
    if (match) return match[1];
  }
  return null;
}

/**
 * VideoPlayer displays a styled tap-to-play card for exercise tutorial videos.
 *
 * - If `videoUrl` is null/empty → renders nothing (no layout shift).
 * - On web with a YouTube watch URL → renders an embedded YouTube iframe.
 * - All other cases → renders a styled "▶ Watch Tutorial" card that opens
 *   the URL via `Linking.openURL` on tap.
 *
 * No external dependencies required — uses built-in Linking and (on web) iframe.
 */
export function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  const [errored, setErrored] = React.useState(false);

  if (!videoUrl) return null;

  // Web: embed YouTube iframe directly (no WebView dependency needed)
  if (Platform.OS === "web") {
    const youtubeId = parseYouTubeId(videoUrl);
    if (youtubeId && !errored) {
      return (
        <View className="mb-4 rounded-xl overflow-hidden" style={{ aspectRatio: 16 / 9, maxHeight: 240 }}>
          {/* on native, this doesn't exist — covered by the else path below */}
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
            style={{ width: "100%", height: "100%", border: 0 }}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            onError={() => setErrored(true)}
            title="Exercise video"
          />
        </View>
      );
    }
  }

  // Native (or non-YouTube URL, or errored): styled play button card
  return (
    <TouchableOpacity
      className="mb-4 bg-card border border-border rounded-xl overflow-hidden"
      activeOpacity={0.7}
      onPress={() => {
        Linking.openURL(videoUrl).catch(() => setErrored(true));
      }}
      accessibilityLabel={isYouTubeUrl(videoUrl) ? "Watch tutorial on YouTube" : "Watch video"}
      accessibilityRole="link"
    >
      <View className="flex-row items-center px-4 py-4">
        {/* Play icon */}
        <View className="w-12 h-12 rounded-full bg-titanium/20 items-center justify-center mr-4">
          <Text className="text-titanium text-xl ml-0.5" style={{ marginTop: 1 }}>
            ▶
          </Text>
        </View>

        {/* Text */}
        <View className="flex-1">
          <Text className="text-surface-50 text-sm font-semibold">
            {isYouTubeUrl(videoUrl) ? "Watch on YouTube" : "Watch Tutorial"}
          </Text>
          <Text className="text-surface-400 text-xs mt-0.5">
            {errored ? "Tap to retry" : "Tap to play"}
          </Text>
        </View>

        {/* External link indicator */}
        <Text className="text-surface-500 text-lg">↗</Text>
      </View>
    </TouchableOpacity>
  );
}
