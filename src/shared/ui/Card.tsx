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
      className={`bg-card rounded-2xl p-5 border border-border ${className ?? ""}`}
      style={style}
    >
      {title && (
        <Text className="text-surface-50 text-[23px] font-extrabold mb-5">
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}
