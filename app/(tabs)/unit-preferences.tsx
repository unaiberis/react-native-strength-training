import { useRouter } from "expo-router";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { GradientBackground } from "../../src/shared/ui/GradientBackground";
import { ScreenTitle } from "../../src/shared/ui/ScreenTitle";
import { Card } from "../../src/shared/ui/Card";
import { Button } from "../../src/shared/ui/Button";
import { useUnitPreferences } from "../../src/features/profile/hooks/useUnitPreferences";
import type { WeightUnit } from "../../src/features/profile/hooks/useUnitPreferences";

export default function UnitPreferencesRoute() {
  const router = useRouter();
  const { unit, setUnit } = useUnitPreferences();

  const handleSelect = (selected: WeightUnit) => {
    setUnit(selected);
  };

  const options: { value: WeightUnit; label: string; description: string }[] = [
    {
      value: "kg",
      label: "Kilograms (kg)",
      description: "Metric — used by most of the world",
    },
    {
      value: "lbs",
      label: "Pounds (lbs)",
      description: "Imperial — commonly used in the US",
    },
  ];

  return (
    <GradientBackground>
      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 64, backgroundColor: "#050505" }}>
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3"
            accessibilityLabel="Go back"
          >
            <Text className="text-titanium text-2xl">{"<"}</Text>
          </TouchableOpacity>
          <ScreenTitle title="Unit Preferences" />
        </View>

        <Card className="mb-6">
          <Text className="text-surface-400 text-sm mb-4 leading-5">
            Choose your preferred weight unit for displaying exercises,
            personal records, and bodyweight throughout the app.
          </Text>

          <View className="gap-3">
            {options.map((option) => {
              const isSelected = unit === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                  className={`flex-row items-center justify-between p-4 rounded-xl border ${
                    isSelected
                      ? "bg-titanium/10 border-titanium"
                      : "bg-cardSoft border-border"
                  }`}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={option.label}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-[17px] font-semibold ${
                        isSelected ? "text-titanium" : "text-surface-100"
                      }`}
                    >
                      {option.label}
                    </Text>
                    <Text className="text-surface-500 text-xs mt-1">
                      {option.description}
                    </Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      isSelected ? "border-titanium" : "border-border"
                    }`}
                  >
                    {isSelected && (
                      <View className="w-3 h-3 rounded-full bg-titanium" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Button
          title="Done"
          variant="primary"
          onPress={() => router.back()}
        />
      </ScrollView>
    </GradientBackground>
  );
}
