import { type ReactNode } from "react";
import { View, Text, type ViewStyle } from "react-native";

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  style?: ViewStyle;
}

export function Card({ children, title, className, style }: CardProps) {
  return (
    <View
      className={`bg-surface-900 rounded-2xl p-4 border border-surface-800 ${className ?? ""}`}
      style={style}
    >
      {title && (
        <Text className="text-surface-100 text-lg font-semibold mb-3">
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}
