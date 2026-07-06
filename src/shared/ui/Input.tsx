import { type ComponentProps, forwardRef, useState } from "react";
import {
  TextInput,
  Text,
  View,
  type ViewStyle,
  type TextInputProps,
} from "react-native";

interface InputProps extends Omit<TextInputProps, "className" | "style"> {
  label?: string;
  /** Pre-translated label — overrides `label` when provided */
  translatedLabel?: string;
  error?: string;
  /** Pre-translated error — overrides `error` when provided */
  translatedError?: string;
  containerClassName?: string;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, translatedLabel, error, translatedError, containerClassName, containerStyle, ...props }, ref) => {
    const displayLabel = translatedLabel ?? label;
    const displayError = translatedError ?? error;
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View className={`mb-4 ${containerClassName ?? ""}`} style={containerStyle}>
        {displayLabel && (
          <Text className="text-surface-400 text-[13px] font-semibold mb-1.5">
            {displayLabel}
          </Text>
        )}
        <TextInput
          ref={ref}
          placeholderTextColor="#707074"
          className={`
            bg-card border rounded-xl px-4 py-3.5 text-surface-50 text-[15px] font-medium
            ${isFocused ? "border-surface-400" : "border-border"}
            ${displayError ? "border-danger" : ""}
          `}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {displayError && (
          <Text className="text-danger text-[13px] font-semibold mt-1 ml-1">{displayError}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";
