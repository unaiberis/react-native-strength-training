import { type ReactNode, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
  type EasingFunction,
} from "react-native-reanimated";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ProgressRingProps {
  /** Diameter of the ring in pixels (default: 64) */
  size?: number;
  /** Width of the ring stroke in pixels (default: 6) */
  strokeWidth?: number;
  /** Color of the progress arc (default: "#B9B9B6" — titanium) */
  color?: string;
  /** Color of the track circle (default: "#222225" — cardSoft) */
  trackColor?: string;
  /** Progress value between 0 and 1 (default: 0) */
  progress?: number;
  /** Duration of the fill animation in ms (default: 1000) */
  duration?: number;
  /** Easing function for the animation (default: Easing.inOut(Easing.ease)) */
  easing?: EasingFunction;
  /** Optional content rendered in the center of the ring */
  children?: ReactNode;
  testID?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * A circular progress ring animated with react-native-reanimated.
 *
 * Uses the two half‑circle clip technique:
 * - A full track circle in `trackColor` sits underneath.
 * - Two clipping containers (right half, left half) each contain a full
 *   circle that rotates into view as progress advances.
 *
 * ```tsx
 * <ProgressRing progress={0.75} size={80} strokeWidth={8}>
 *   <Text style={{ color: "#F4F4F2", fontWeight: "bold" }}>75%</Text>
 * </ProgressRing>
 * ```
 */
function ProgressRing({
  size = 64,
  strokeWidth = 6,
  color = "#B9B9B6",
  trackColor = "#222225",
  progress = 0,
  duration = 1000,
  easing = Easing.inOut(Easing.ease) as unknown as EasingFunction,
  children,
  testID,
}: ProgressRingProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(progress, 1), {
      duration,
      easing,
    });
    // We intentionally run this only when `progress` changes — the shared
    // value persists across renders so it can animate from the current
    // position to the new target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, duration, easing]);

  // Right half rotates from -180° → 0° during progress [0, 0.5]
  const rightRotation = useDerivedValue(() => {
    const p = Math.min(animatedProgress.value * 2, 1);
    return interpolate(p, [0, 1], [-180, 0]);
  });

  // Left half rotates from -180° → 0° during progress [0.5, 1]
  const leftRotation = useDerivedValue(() => {
    const p = Math.max(animatedProgress.value * 2 - 1, 0);
    return interpolate(p, [0, 1], [-180, 0]);
  });

  const rightAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rightRotation.value}deg` }],
  }));

  const leftAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${leftRotation.value}deg` }],
  }));

  const halfSize = size / 2;

  // Style shared by the track and both half-circle progress rings
  const fullCircleStyle = {
    width: size,
    height: size,
    borderRadius: halfSize,
    borderWidth: strokeWidth,
  };

  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Track circle — always fully visible */}

      <View
        style={[
          fullCircleStyle,
          {
            borderColor: trackColor,
            position: "absolute",
          },
        ]}
      />

      {/* Right half clip — visible only when progress > 0 */}

      <View
        style={{
          width: halfSize,
          height: size,
          overflow: "hidden",
          position: "absolute",
          right: 0,
        }}
      >
        <Animated.View
          style={[
            fullCircleStyle,
            {
              borderColor: color,
              position: "absolute",
              left: -halfSize,
              borderRightColor: "transparent",
              borderBottomColor: "transparent",
            },
            rightAnimatedStyle,
          ]}
        />
      </View>

      {/* Left half clip — visible only when progress > 0.5 */}

      <View
        style={{
          width: halfSize,
          height: size,
          overflow: "hidden",
          position: "absolute",
          left: 0,
        }}
      >
        <Animated.View
          style={[
            fullCircleStyle,
            {
              borderColor: color,
              position: "absolute",
              right: -halfSize,
              borderLeftColor: "transparent",
              borderBottomColor: "transparent",
            },
            leftAnimatedStyle,
          ]}
        />
      </View>

      {/* Center content */}
      {children ? (
        <View
          style={{
            width: size - strokeWidth * 3,
            height: size - strokeWidth * 3,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}

export { ProgressRing };
export default ProgressRing;
