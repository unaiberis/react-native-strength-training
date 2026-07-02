import { memo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, type ViewStyle } from 'react-native';

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card = memo(function Card({
  children,
  title,
  className,
  style,
  onPress,
}: CardProps) {
  const content = (
    <>
      {title && (
        <Text className="text-surface-100 text-lg font-semibold mb-3">
          {title}
        </Text>
      )}
      {children}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={title ?? 'Card'}
        className={`bg-surface-900 rounded-2xl p-4 border border-surface-800 ${className ?? ''}`}
        style={style}
        activeOpacity={0.8}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      className={`bg-surface-900 rounded-2xl p-4 border border-surface-800 ${className ?? ''}`}
      style={style}
    >
      {content}
    </View>
  );
});
