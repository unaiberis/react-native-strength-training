import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CoachLibraryPlaceholder() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-16 h-16 rounded-full bg-graphite items-center justify-center mb-6">
        <Ionicons name="barbell-outline" size={28} color="#B9B9B6" />
      </View>
      <Text className="text-surface-50 text-2xl font-bold mb-2">
        Exercise Library
      </Text>
      <Text className="text-surface-400 text-base text-center leading-6">
        Coach exercise management coming in PR 2.
      </Text>
    </View>
  );
}
