import { useEffect, useMemo } from "react";
import { View, Text, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { Button } from "@/shared/ui/Button";

// ─── Confetti Particle ────────────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PARTICLE_COUNT = 40;
const COLORS = ["#B9B9B6", "#D7D7D2", "#F4F4F2", "#A4A4A8", "#707074"];

interface ParticleConfig {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
}

function generateParticles(): ParticleConfig[] {
  const particles: ParticleConfig[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const isLeft = i < PARTICLE_COUNT / 2;
    particles.push({
      startX: isLeft
        ? Math.random() * SCREEN_WIDTH * 0.3
        : SCREEN_WIDTH * 0.7 + Math.random() * SCREEN_WIDTH * 0.3,
      startY: -40,
      endX: isLeft
        ? Math.random() * SCREEN_WIDTH * 0.4
        : SCREEN_WIDTH * 0.6 + Math.random() * SCREEN_WIDTH * 0.4,
      endY: SCREEN_HEIGHT * (0.3 + Math.random() * 0.6),
      size: 4 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 400,
      duration: 1500 + Math.random() * 1500,
      rotation: Math.random() * 360,
    });
  }
  return particles;
}

function Particle({
  config,
  index,
}: {
  config: ParticleConfig;
  index: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withTiming(1, {
        duration: config.duration,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: interpolate(
      progress.value,
      [0, 1],
      [config.startX, config.endX],
    ),
    top: interpolate(
      progress.value,
      [0, 1],
      [config.startY, config.endY],
    ),
    width: config.size,
    height: config.size,
    borderRadius: config.size / 2,
    backgroundColor: config.color,
    opacity: interpolate(progress.value, [0, 0.7, 1], [1, 1, 0]),
    transform: [
      {
        rotate: `${interpolate(
          progress.value,
          [0, 1],
          [0, config.rotation],
        )}deg`,
      },
      {
        scale: interpolate(progress.value, [0, 0.2, 1], [0, 1, 0.8]),
      },
    ],
  }));

  return <Animated.View style={animatedStyle} pointerEvents="none" />;
}

// ─── Animated Value Display ───────────────────────────────────────────────

function AnimatedValue({
  value,
  unit = "kg",
  delay = 0,
}: {
  value: number;
  unit?: string;
  delay?: number;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 8, stiffness: 80 }),
    );
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle} className="items-center">
      <Text className="text-titanium text-6xl font-black tracking-tight">
        {value}
      </Text>
      <Text className="text-surface-400 text-base font-semibold mt-1">
        {unit}
      </Text>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────

/**
 * PRCelebrationScreen — Full-screen overlay shown when a user hits a new
 * personal record. Displays confetti particles, the new PR value, comparison
 * with the previous PR, and action buttons.
 *
 * Params:
 * - `exerciseName`: Name of the exercise
 * - `newPR`: The new PR value (number)
 * - `previousPR`: Previous PR value (number, optional)
 * - `unit`: Unit string (default "kg")
 */
export function PRCelebrationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    exerciseName?: string;
    newPR?: string;
    previousPR?: string;
    unit?: string;
  }>();

  const exerciseName = params.exerciseName ?? "Exercise";
  const newPR = parseFloat(params.newPR ?? "0");
  const previousPR = params.previousPR ? parseFloat(params.previousPR) : null;
  const unit = params.unit ?? "kg";

  const particles = useMemo(() => generateParticles(), []);

  const handleContinue = () => {
    router.back();
  };

  const handleShare = () => {
    // Share functionality — placeholder
    // In a real app this would use expo-sharing or the Share API
    handleContinue();
  };

  return (
    <View className="flex-1 bg-background">
      {/* Confetti layer */}
      {particles.map((config, index) => (
        <Particle key={index} config={config} index={index} />
      ))}

      {/* Content */}
      <GradientBackground>
        <View className="flex-1 items-center justify-center px-8">
          {/* Trophy icon */}
          <Animated.View className="mb-6">
            <View className="w-20 h-20 rounded-full bg-titanium/20 items-center justify-center">
              <Ionicons name="trophy" size={40} color="#B9B9B6" />
            </View>
          </Animated.View>

          {/* Title */}
          <Text className="text-surface-50 text-2xl font-black mb-2 text-center">
            New Personal Record!
          </Text>

          {/* Exercise name */}
          <Text className="text-surface-400 text-base mb-8 text-center">
            {exerciseName}
          </Text>

          {/* PR Value */}
          <AnimatedValue value={newPR} unit={unit} delay={200} />

          {/* Previous PR comparison */}
          {previousPR != null && previousPR > 0 && (
            <View className="flex-row items-center gap-2 mt-4 mb-8">
              <Text className="text-surface-500 text-sm">Previous:</Text>
              <Text className="text-surface-400 text-base font-semibold line-through">
                {previousPR} {unit}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#D7D7D2" />
              <Text className="text-titanium text-base font-bold">
                {newPR} {unit}
              </Text>
            </View>
          )}

          {/* Spacer */}
          <View className="flex-1" />

          {/* Actions */}
          <View className="w-full gap-3 pb-10">
            <Button
              title="Continue"
              variant="primary"
              onPress={handleContinue}
            />
            <Button
              title="Share"
              variant="secondary"
              onPress={handleShare}
              icon="share-outline"
            />
          </View>
        </View>
      </GradientBackground>
    </View>
  );
}
