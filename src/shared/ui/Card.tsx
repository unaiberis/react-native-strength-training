import { type ReactNode } from "react";
import { View, Text, TouchableOpacity, type ViewStyle } from "react-native";

// ─── Types ─────────────────────────────────────────────────────────────────

type CardVariant = "default" | "soft" | "elevated";

interface CardProps {
  children: ReactNode;
  title?: string;
  variant?: CardVariant;
  onPress?: () => void;
  className?: string;
  style?: ViewStyle;
}

// ─── Variant Styles ─────────────────────────────────────────────────────────

const variantStyles: Record<CardVariant, string> = {
  default: "bg-card border border-border rounded-xl shadow-card",
  soft: "bg-cardSoft border border-border rounded-xl shadow-card",
  elevated: "bg-card border border-border rounded-xl shadow-elevated",
};

// ─── Component ─────────────────────────────────────────────────────────────

function Card({
  children,
  title,
  variant = "default",
  onPress,
  className,
  style,
}: CardProps) {
  const baseStyles = `p-5 ${variantStyles[variant]} ${className ?? ""}`;

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        className={baseStyles}
        style={style}
        activeOpacity={0.7}
      >
        {title && (
          <Text className="text-surface-50 text-[23px] font-extrabold mb-5">
            {title}
          </Text>
        )}
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={baseStyles} style={style}>
      {title && (
        <Text className="text-surface-50 text-[23px] font-extrabold mb-5">
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

export { Card };
export default Card;
