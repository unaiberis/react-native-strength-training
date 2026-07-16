import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Linking, Platform } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";

// ─── Types ─────────────────────────────────────────────────────────────────

interface VideoPlayerProps {
  videoUrl: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

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
 * Check if a URL can be played inline by expo-video.
 * Direct video files (.mp4, .mov, .m4v) and HLS (.m3u8) work.
 * YouTube and most other platforms don't.
 */
function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|m3u8|webm|avi|mkv)(\?|$)/i.test(url);
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * VideoPlayer displays an inline video playback card for exercise tutorial videos.
 *
 * - Direct video URLs (.mp4, .m3u8, etc.): Plays inline using expo-video.
 * - YouTube URLs: Shows a playable card that opens via Linking on native,
 *   or embeds as iframe on web.
 * - Falls back to Linking.openURL if expo-video fails.
 * - Aspect ratio 16:9, rounded corners, dark theme.
 */
export function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  const [mode, setMode] = useState<"thumbnail" | "playing" | "errored">("thumbnail");
  const [error, setError] = useState<string | null>(null);

  const canPlayInline = videoUrl
    ? isDirectVideoUrl(videoUrl) || (Platform.OS === "web" && isYouTubeUrl(videoUrl))
    : false;

  // Create player only when entering playing mode with a compatible URL
  const player = useVideoPlayer(
    canPlayInline && mode === "playing" ? videoUrl ?? "" : null,
    (player) => {
      player.loop = false;
      player.muted = false;
      player.play();
    },
  );

  const handleOpenUrl = useCallback(() => {
    if (!videoUrl) return;
    Linking.openURL(videoUrl).catch(() => {
      setError("Could not open video URL");
      setMode("errored");
    });
  }, [videoUrl]);

  const handlePlay = useCallback(() => {
    if (!videoUrl) return;

    if (canPlayInline) {
      setMode("playing");
    } else {
      // Fallback to Linking for YouTube etc.
      handleOpenUrl();
    }
  }, [videoUrl, canPlayInline, handleOpenUrl]);

  // Web: YouTube iframe embed (reuse existing pattern)
  if (Platform.OS === "web" && videoUrl) {
    const youtubeId = parseYouTubeId(videoUrl);
    if (youtubeId) {
      return (
        <View className="mb-4 rounded-xl overflow-hidden" style={{ aspectRatio: 16 / 9, maxHeight: 240 }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
            style={{ width: "100%", height: "100%", border: 0 }}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="Exercise video"
          />
        </View>
      );
    }
  }

  // Nothing to render
  if (!videoUrl) return null;

  // Playing mode — inline video with expo-video
  if (mode === "playing" && canPlayInline) {
    return (
      <View className="mb-4 rounded-xl overflow-hidden bg-card" style={{ aspectRatio: 16 / 9 }}>
        <VideoView
          player={player}
          style={{ flex: 1, width: "100%" }}
          contentFit="contain"
          nativeControls
          onFirstFrameRender={() => {
            // First frame rendered — thumbnail is already gone
          }}
        />
      </View>
    );
  }

  // Errored state
  if (mode === "errored") {
    return (
      <TouchableOpacity
        className="mb-4 bg-card border border-border rounded-xl overflow-hidden"
        activeOpacity={0.7}
        onPress={handleOpenUrl}
        accessibilityLabel="Tap to retry video"
        accessibilityRole="link"
      >
        <View className="flex-row items-center px-4 py-4">
          <View className="w-12 h-12 rounded-full bg-danger/20 items-center justify-center mr-4">
            <Ionicons name="alert-circle-outline" size={24} color="#D65F5F" />
          </View>
          <View className="flex-1">
            <Text className="text-surface-50 text-sm font-semibold">
              Video unavailable
            </Text>
            <Text className="text-surface-400 text-xs mt-0.5">
              {error ?? "Tap to open in browser"}
            </Text>
          </View>
          <Ionicons name="open-outline" size={20} color="#707074" />
        </View>
      </TouchableOpacity>
    );
  }

  // Thumbnail mode — play button overlay (default)
  return (
    <TouchableOpacity
      className="mb-4 bg-card border border-border rounded-xl overflow-hidden"
      activeOpacity={0.8}
      onPress={handlePlay}
      accessibilityLabel={
        isYouTubeUrl(videoUrl) ? "Watch tutorial on YouTube" : "Play video"
      }
      accessibilityRole="button"
    >
      <View className="flex-row items-center px-4 py-4">
        {/* Play icon */}
        <View className="w-12 h-12 rounded-full bg-titanium/20 items-center justify-center mr-4">
          <View className="ml-0.5">
            <Ionicons name="play" size={22} color="#B9B9B6" />
          </View>
        </View>

        {/* Text */}
        <View className="flex-1">
          <Text className="text-surface-50 text-sm font-semibold">
            {isYouTubeUrl(videoUrl) ? "Watch on YouTube" : "Watch Tutorial"}
          </Text>
          <Text className="text-surface-400 text-xs mt-0.5">
            {canPlayInline ? "Tap to play inline" : "Tap to open"}
          </Text>
        </View>

        {/* Icon */}
        {canPlayInline ? (
          <Ionicons name="play-circle-outline" size={22} color="#B9B9B6" />
        ) : (
          <Ionicons name="open-outline" size={20} color="#707074" />
        )}
      </View>
    </TouchableOpacity>
  );
}
