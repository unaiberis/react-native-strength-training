import { View, Text } from "react-native";

// ─── Types ─────────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "success" | "warning" | "danger";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

// ─── Variant Styles ─────────────────────────────────────────────────────────

const variantStyles: Record<BadgeVariant, string> = {
  default: "text-surface-400 bg-white/[0.06]",
  success: "text-sacred bg-sacred/10",
  warning: "text-amber-400 bg-amber-400/10",
  danger: "text-danger bg-danger/10",
};

// ─── Component ─────────────────────────────────────────────────────────────

function Badge({ label, variant = "default", className }: BadgeProps) {
  return (
    <View
      className={`self-start px-2.5 py-1 rounded-lg ${variantStyles[variant]} ${className ?? ""}`}
    >
      <Text className={`text-xs font-semibold ${variantStyles[variant].split(" ")[0]}`}>
        {label}
      </Text>
    </View>
  );
}

export { Badge };
export default Badge;
