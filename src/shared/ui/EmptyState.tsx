import { type ReactNode } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";

// ─── Props ─────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** Ionicons name for the icon */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Optional emoji instead of Ionicons (overrides icon) */
  emoji?: string;
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
  /** Optional additional children */
  children?: ReactNode;
  /** Additional class name */
  className?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Reusable empty state component with icon, title, subtitle, and optional action.
 *
 * ```tsx
 * <EmptyState
 *   icon="barbell-outline"
 *   title="No Workouts Yet"
 *   subtitle="Start your first workout to see your training calendar."
 *   action={{ label: "Start Workout", onPress: () => router.push("/train") }}
 * />
 * ```
 */
export function EmptyState({
  icon,
  emoji,
  title,
  subtitle,
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <View
      className={`flex-1 items-center justify-center px-8 ${className ?? ""}`}
    >
      {emoji ? (
        <Text className="text-4xl mb-4">{emoji}</Text>
      ) : icon ? (
        <View className="w-16 h-16 rounded-full bg-graphite items-center justify-center mb-4">
          <Ionicons name={icon} size={28} color="#B9B9B6" />
        </View>
      ) : null}
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
      {children}
    </View>
  );
}
