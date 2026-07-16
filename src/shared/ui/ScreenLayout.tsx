import { type ReactNode, type ReactElement, Children, useEffect } from "react";
import { View, type ViewProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ScreenLayoutProps extends ViewProps {
  children: ReactNode;
  /** Delay in ms between each child's animation start (default: 60) */
  staggerDelay?: number;
  /** Duration of each child's fade+slide animation in ms (default: 350) */
  duration?: number;
}

// ─── Animated Item ─────────────────────────────────────────────────────────

/**
 * Internal wrapper that animates a single child with a staggered delay.
 * Each instance reads its own shared values so that remounts re-trigger.
 */
function StaggeredItem({
  children,
  index,
  staggerDelay,
  duration,
}: {
  children: ReactNode;
  index: number;
  staggerDelay: number;
  duration: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    const delay = index * staggerDelay;
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(0, { duration, easing: Easing.out(Easing.cubic) }));
    // Run once on mount — if children reorder, keys should be used
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

// ─── ScreenLayout ──────────────────────────────────────────────────────────

/**
 * Screen-level wrapper that applies a staggered fade + slide-up entry
 * animation to each of its direct children.
 *
 * ```tsx
 * <ScreenLayout>
 *   <ScreenTitle title="Home" />
 *   <Card>...</Card>
 *   <Card>...</Card>
 * </ScreenLayout>
 * ```
 */
function ScreenLayout({
  children,
  staggerDelay = 60,
  duration = 350,
  className,
  style,
  ...rest
}: ScreenLayoutProps) {
  const items = Children.toArray(children).filter(
    (child): child is ReactElement => child !== null && child !== undefined,
  );

  return (
    <View className={className} style={style} {...rest}>
      {items.map((child, index) => (
        <StaggeredItem
          key={child.key ?? index}
          index={index}
          staggerDelay={staggerDelay}
          duration={duration}
        >
          {child}
        </StaggeredItem>
      ))}
    </View>
  );
}

export { ScreenLayout };
export default ScreenLayout;
