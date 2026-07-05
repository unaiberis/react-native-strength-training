import { type ComponentProps } from "react";
import {
  TouchableOpacity,
  Text,
  type ViewStyle,
  ActivityIndicator,
} from "react-native";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ComponentProps<typeof TouchableOpacity> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: "bg-card-soft active:bg-surface-800 border border-border",
    text: "text-surface-50 font-bold",
  },
  secondary: {
    container: "bg-surface-900 active:bg-card-soft border border-border",
    text: "text-surface-100 font-bold",
  },
  ghost: {
    container: "bg-transparent active:bg-surface-800",
    text: "text-surface-400 font-bold",
  },
  danger: {
    container: "bg-danger active:bg-red-700",
    text: "text-surface-50 font-bold",
  },
};

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  className,
  style,
  ...props
}: ButtonProps) {
  const styles = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      disabled={isDisabled}
      className={`
        min-h-[58px] rounded-xl py-3.5 px-5 items-center justify-center flex-row gap-2.5
        ${styles.container}
        ${isDisabled ? "opacity-50" : ""}
        ${className ?? ""}
      `}
      style={style as ViewStyle}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          className="mr-2"
          color={variant === "primary" ? "#F4F4F2" : "#A4A4A8"}
          size="small"
        />
      )}
      <Text className={`text-[17px] font-extrabold ${styles.text}`}>{title}</Text>
    </TouchableOpacity>
  );
}
