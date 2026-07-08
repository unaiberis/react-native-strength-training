import { type ReactNode, useCallback, useRef } from "react";
import { Animated, Pressable, type PressableProps } from "react-native";

interface PressScaleProps extends PressableProps {
  children: ReactNode;
  /** Scale factor when pressed (default: 0.97) */
  scaleTo?: number;
  /** Duration of the scale animation in ms (default: 100) */
  duration?: number;
  className?: string;
}

/**
 * Wraps children with a scaled press animation.
 * Scales down to `scaleTo` when pressed, springs back on release.
 */
export function PressScale({
  children,
  scaleTo = 0.97,
  duration = 100,
  className,
  style,
  ...rest
}: PressScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(scale, {
      toValue: scaleTo,
      duration,
      useNativeDriver: true,
    }).start();
  }, [scale, scaleTo, duration]);

  const handlePressOut = useCallback(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }).start();
  }, [scale, duration]);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={className}
      style={style}
      {...rest}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
