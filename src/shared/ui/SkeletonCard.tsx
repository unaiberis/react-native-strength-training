import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SkeletonCardProps {
  /** Number of shimmer lines (default 3) */
  lines?: number;
  className?: string;
}

// ─── Animated Skeleton Line ─────────────────────────────────────────────────

function SkeletonLine({ width }: { width: string }) {
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
      className="bg-surface-700 rounded-lg h-3.5 mb-2.5"
      style={StyleSheet.flatten([{ width: width as any, opacity: opacity.current }])}
    />
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

function SkeletonCard({ lines = 3, className }: SkeletonCardProps) {
  return (
    <View
      className={`bg-surface-800 rounded-xl p-5 border border-border ${className ?? ""}`}
    >
      {/* Title line */}
      <SkeletonLine width="40%" />
      {/* Content lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </View>
  );
}

export { SkeletonCard };
export default SkeletonCard;
