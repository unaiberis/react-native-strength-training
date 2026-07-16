import { type ComponentProps, useCallback } from "react";
import {
  TouchableOpacity,
  Text,
  type ViewStyle,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";

// ─── Types ─────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "lg" | "md" | "sm";

interface ButtonProps extends ComponentProps<typeof TouchableOpacity> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

// ─── Variant Styles ─────────────────────────────────────────────────────────

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: "bg-titanium border border-surface-400/30 shadow-button",
    text: "text-background font-extrabold",
  },
  secondary: {
    container: "bg-card border border-border shadow-button",
    text: "text-surface-50 font-extrabold",
  },
  ghost: {
    container: "bg-transparent",
    text: "text-surface-400 font-extrabold",
  },
  danger: {
    container: "bg-danger/10 shadow-button",
    text: "text-danger font-extrabold",
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  lg: "h-14 min-h-[58px] w-full",
  md: "h-12 min-h-[48px]",
  sm: "h-10 min-h-[40px]",
};

// ─── Component ─────────────────────────────────────────────────────────────

function Button({
  title,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled,
  icon,
  className,
  style,
  onPress,
  ...props
}: ButtonProps) {
  const styles = variantStyles[variant];
  const isDisabled = disabled || loading;

  const handlePress = useCallback(
    (e: any) => {
      // Trigger haptic feedback on primary & danger buttons (native only)
      if (Platform.OS !== "web" && (variant === "primary" || variant === "danger")) {
        try {
          impactAsync(
            variant === "danger" ? ImpactFeedbackStyle.Heavy : ImpactFeedbackStyle.Medium,
          ).catch(() => {});
        } catch {
          // Haptics unavailable — silently skip
        }
      }
      onPress?.(e);
    },
    [onPress, variant],
  );

  return (
    <TouchableOpacity
      disabled={isDisabled}
      className={`
        rounded-xl py-3.5 px-5 items-center justify-center flex-row gap-2.5
        ${styles.container}
        ${sizeStyles[size]}
        ${isDisabled ? "opacity-50" : ""}
        ${className ?? ""}
      `}
      style={style as ViewStyle}
      activeOpacity={0.7}
      onPress={handlePress}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          color={variant === "primary" ? "#050505" : variant === "ghost" ? "#A4A4A8" : "#F4F4F2"}
          size="small"
        />
      )}
      {!loading && icon && (
        <Ionicons
          name={icon}
          size={20}
          color={
            variant === "primary"
              ? "#050505"
              : variant === "ghost"
                ? "#A4A4A8"
                : "#F4F4F2"
          }
        />
      )}
      <Text className={`text-[17px] font-extrabold ${styles.text}`}>{title}</Text>
    </TouchableOpacity>
  );
}

export { Button };
export default Button;
