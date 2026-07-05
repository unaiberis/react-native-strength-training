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
  error?: string;
  containerClassName?: string;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, containerClassName, containerStyle, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View className={`mb-4 ${containerClassName ?? ""}`} style={containerStyle}>
        {label && (
          <Text className="text-surface-400 text-[13px] font-semibold mb-1.5">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          placeholderTextColor="#707074"
          className={`
            bg-card border rounded-xl px-4 py-3.5 text-surface-50 text-[15px] font-medium
            ${isFocused ? "border-surface-400" : "border-border"}
            ${error ? "border-danger" : ""}
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
        {error && (
          <Text className="text-danger text-[13px] font-semibold mt-1 ml-1">{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";
