import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, type ViewStyle } from "react-native";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SkeletonBaseProps {
  className?: string;
  style?: ViewStyle | ViewStyle[];
}

interface SkeletonBarProps extends SkeletonBaseProps {
  /** Width as percentage (e.g. "75%") or pixel value */
  width?: string | number;
  /** Height in pixels (default 16) */
  height?: number;
}

interface SkeletonCardProps extends SkeletonBaseProps {
  /** Number of lines inside the card (default 3) */
  lines?: number;
  /** Width of the last line for variety (e.g. "60%") */
  lastLineWidth?: string;
}

interface SkeletonCircleProps extends SkeletonBaseProps {
  /** Diameter in pixels (default 48) */
  size?: number;
}

// ─── Animated Skeleton Primitive ───────────────────────────────────────────

function SkeletonPulse({ className, style }: SkeletonBaseProps) {
  const opacity = useRef(new Animated.Value(0.3));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity.current, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity.current, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      className={`bg-surface-700 rounded-lg ${className ?? ""}`}
      style={StyleSheet.flatten([{ opacity: opacity.current }, style])}
    />
  );
}

// ─── Bar Skeleton ──────────────────────────────────────────────────────────

/**
 * A single horizontal skeleton bar with pulsing animation.
 *
 * ```tsx
 * <SkeletonBar width="75%" height={16} />
 * ```
 */
export function SkeletonBar({
  width = "100%",
  height = 16,
  className,
  style,
}: SkeletonBarProps) {
  return (
    <SkeletonPulse
      className={className}
      style={StyleSheet.flatten([{ width: width as any, height }, style])}
    />
  );
}

// ─── Card Skeleton ─────────────────────────────────────────────────────────

/**
 * A card-shaped skeleton with multiple text lines.
 *
 * ```tsx
 * <SkeletonCard lines={4} lastLineWidth="60%" />
 * ```
 */
export function SkeletonCard({
  lines = 3,
  lastLineWidth = "60%",
  className,
  style,
}: SkeletonCardProps) {
  return (
    <View
      className={`bg-card rounded-2xl p-5 border border-border ${className ?? ""}`}
      style={style}
    >
      {/* Title line */}
      <SkeletonBar width="40%" height={20} className="mb-4" />
      {/* Content lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBar
          key={i}
          width={i === lines - 1 ? lastLineWidth : "100%"}
          height={14}
          className={i < lines - 1 ? "mb-2.5" : ""}
        />
      ))}
    </View>
  );
}

// ─── Circle Skeleton ───────────────────────────────────────────────────────

/**
 * A circular skeleton avatar or icon placeholder.
 *
 * ```tsx
 * <SkeletonCircle size={48} />
 * ```
 */
export function SkeletonCircle({ size = 48, className, style }: SkeletonCircleProps) {
  return (
    <SkeletonPulse
      className={className}
      style={StyleSheet.flatten([{ width: size, height: size, borderRadius: size / 2 }, style])}
    />
  );
}

// ─── Page Skeleton ─────────────────────────────────────────────────────────

/**
 * Full-page skeleton with a header and multiple cards — good for initial loads.
 *
 * ```tsx
 * <PageSkeleton />
 * ```
 */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <View className={`flex-1 px-4 pt-16 ${className ?? ""}`}>
      {/* Page title */}
      <SkeletonBar width="50%" height={28} className="mb-6" />
      {/* Cards */}
      <SkeletonCard lines={2} className="mb-4" />
      <SkeletonCard lines={4} className="mb-4" />
      <SkeletonCard lines={3} lastLineWidth="45%" />
    </View>
  );
}

// ─── Dashboard Skeleton ────────────────────────────────────────────────────

/**
 * Dashboard-style skeleton with stat bars and a list skeleton.
 */
export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <View className={`flex-1 px-4 pt-4 ${className ?? ""}`}>
      {/* Stat bar */}
      <View className="flex-row gap-3 mb-5">
        {[1, 2, 3].map((i) => (
          <View key={i} className="flex-1 bg-card rounded-2xl p-4 border border-border">
            <SkeletonBar width="60%" height={28} className="mb-2" />
            <SkeletonBar width="80%" height={12} />
          </View>
        ))}
      </View>
      {/* List items */}
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          className="bg-card rounded-2xl p-4 mb-3 border border-border flex-row items-center gap-3"
        >
          <SkeletonCircle size={40} />
          <View className="flex-1">
            <SkeletonBar width="60%" height={16} className="mb-2" />
            <SkeletonBar width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}
