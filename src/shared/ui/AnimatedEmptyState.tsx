import React, { useCallback, useState, type ComponentType } from "react";
import { View, Text, Platform } from "react-native";
import { EmptyState } from "./EmptyState";
import { Button } from "./Button";

// ─── Dynamic Lottie import (safe fallback if unavailable) ────────────────

let LottieView: ComponentType<any> | null = null;

try {
  // Dynamic require so bundler includes it but import won't throw at module level
  const LottieModule = require("lottie-react-native");
  LottieView = LottieModule.default ?? LottieModule;
} catch {
  // Lottie not available — fall back to EmptyState
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface AnimatedEmptyStateProps {
  /** Lottie animation JSON source (required object or require'd asset) */
  source?: unknown;
  /** Title text */
  title: string;
  /** Subtitle / description */
  subtitle?: string;
  /** Optional action button */
  action?: {
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary";
  };
  /** Width/height of the Lottie animation (default: 160) */
  animationSize?: number;
  /** Additional class name */
  className?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * AnimatedEmptyState — An empty state with a Lottie animation background.
 *
 * Wraps `lottie-react-native` animations in the familiar EmptyState layout.
 * Falls back to the static EmptyState if Lottie is unavailable or fails to
 * load the animation source.
 *
 * ```tsx
 * <AnimatedEmptyState
 *   source={require("@/assets/animations/workout-complete.json")}
 *   title="Workout Complete!"
 *   subtitle="Great job today!"
 *   action={{ label: "View Summary", onPress: () => {} }}
 * />
 * ```
 */
export function AnimatedEmptyState({
  source,
  title,
  subtitle,
  action,
  animationSize = 160,
  className,
}: AnimatedEmptyStateProps) {
  const [lottieError, setLottieError] = useState(false);

  const handleLottieError = useCallback(() => {
    setLottieError(true);
  }, []);

  // Fall back to static empty state when:
  // - Lottie is not installed
  // - No source provided
  // - Lottie errored (e.g. invalid JSON)
  // - On web where Lottie may not work reliably
  if (!LottieView || !source || lottieError || Platform.OS === "web") {
    return (
      <EmptyState
        title={title}
        subtitle={subtitle}
        action={action}
        className={className}
      />
    );
  }

  return (
    <View
      className={`flex-1 items-center justify-center px-8 ${className ?? ""}`}
    >
      {/* Lottie animation */}
      <View style={{ width: animationSize, height: animationSize }} className="mb-4">
        <LottieView
          source={source}
          autoPlay
          loop={false}
          style={{ width: "100%", height: "100%" }}
          onAnimationFailure={handleLottieError}
        />
      </View>

      <Text className="text-surface-50 text-lg font-semibold mb-2 text-center">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-surface-400 text-sm text-center leading-5 mb-6">
          {subtitle}
        </Text>
      )}
      {action && (
        <Button
          title={action.label}
          variant={action.variant ?? "primary"}
          onPress={action.onPress}
        />
      )}
    </View>
  );
}
