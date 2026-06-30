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
          <Text className="text-surface-300 text-sm font-medium mb-1.5">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          placeholderTextColor="#71717a"
          className={`
            bg-surface-800 border rounded-xl px-4 py-3.5 text-surface-100 text-base
            ${isFocused ? "border-brand-500" : "border-surface-700"}
            ${error ? "border-red-500" : ""}
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
          <Text className="text-red-400 text-sm mt-1 ml-1">{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";
