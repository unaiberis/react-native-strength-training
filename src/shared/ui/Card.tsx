import { type ReactNode } from "react";
import { View, Text, type ViewStyle } from "react-native";

interface CardProps {
  children: ReactNode;
  title?: string;
  /** Pre-translated title — overrides `title` when provided */
  translatedTitle?: string;
  className?: string;
  style?: ViewStyle;
}

export function Card({ children, title, translatedTitle, className, style }: CardProps) {
  const displayTitle = translatedTitle ?? title;
  return (
    <View
      className={`bg-card rounded-2xl p-5 border border-border ${className ?? ""}`}
      style={style}
    >
      {displayTitle && (
        <Text className="text-surface-50 text-[23px] font-extrabold mb-5">
          {displayTitle}
        </Text>
      )}
      {children}
    </View>
  );
}
