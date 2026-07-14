import { View, Text } from "react-native";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ScreenTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

function ScreenTitle({ title, subtitle, className }: ScreenTitleProps) {
  return (
    <View className={className}>
      <Text className="text-[34px] font-black tracking-[-0.8] text-surface-50 mb-4">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-surface-400 font-normal mt-1">{subtitle}</Text>
      )}
    </View>
  );
}

export { ScreenTitle };
export default ScreenTitle;
