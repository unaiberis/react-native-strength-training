import { View, Text, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface StatCardProps {
  /** Ionicons icon name displayed top-left */
  icon: keyof typeof Ionicons.glyphMap;
  /** Primary value (number or formatted string) */
  value: string | number;
  /** Descriptive label below the value */
  label: string;
  /** Optional accent color for the value text (defaults to surface-50) */
  color?: string;
  /** Optional additional class names */
  className?: string;
  /** Optional inline style overrides */
  style?: ViewStyle;
}

/**
 * Compact stat card for dashboard grids.
 *
 * Layout: icon top-left → big value → small muted label.
 * Uses the design token surface palette for consistent dark-theme styling.
 */
export function StatCard({
  icon,
  value,
  label,
  color,
  className,
  style,
}: StatCardProps) {
  return (
    <View
      className={`bg-card rounded-xl p-4 border border-border shadow-card ${className ?? ""}`}
      style={style}
    >
      <View className="mb-2">
        <Ionicons name={icon} size={24} color="#B9B9B6" />
      </View>
      <Text
        className={`text-2xl font-extrabold ${color ? "" : "text-surface-50"}`}
        style={color ? { color } : undefined}
      >
        {value}
      </Text>
      <Text className="text-surface-400 text-xs font-medium mt-1">{label}</Text>
    </View>
  );
}
