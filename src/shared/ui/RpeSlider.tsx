import { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface RpeSliderProps {
  /** Current RPE value (1-10, in 0.5 increments), or null for unset */
  value: number | null;
  /** Called when the user selects an RPE value */
  onChange: (rpe: number) => void;
  /** Whether the slider is disabled */
  disabled?: boolean;
}

const RPE_LABELS: Record<number, string> = {
  1: "Very Light",
  2: "Light",
  3: "Moderate",
  4: "Somewhat Hard",
  5: "Hard",
  6: "Hard+",
  7: "Very Hard",
  8: "Very Hard+",
  9: "Extremely Hard",
  10: "Max Effort",
};

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * RPE (Rate of Perceived Exertion) slider component.
 *
 * Displays a horizontal row of touchable RPE values (1-10).
 * The user taps a value to select it.
 */
export function RpeSlider({
  value,
  onChange,
  disabled = false,
}: RpeSliderProps) {
  const handlePress = useCallback(
    (rpe: number) => {
      if (!disabled) {
        onChange(rpe);
      }
    },
    [disabled, onChange],
  );

  return (
    <View className="gap-2">
      {/* Label row */}
      <View className="flex-row justify-between items-center">
        <Text className="text-surface-400 text-xs font-semibold">
          RPE (1-10)
        </Text>
        {value != null && (
          <Text className="text-surface-50 text-xs font-bold">
            {value} \u2014 {RPE_LABELS[value] ?? ""}
          </Text>
        )}
      </View>

      {/* RPE buttons row */}
      <View className="flex-row gap-1.5">
        {RPE_VALUES.map((rpe) => {
          const isSelected = value === rpe;

          return (
            <TouchableOpacity
              key={rpe}
              onPress={() => handlePress(rpe)}
              disabled={disabled}
              className={`flex-1 items-center py-2.5 rounded-xl border ${
                isSelected
                  ? "bg-surface-800 border-surface-400"
                  : "bg-surface-900 border-surface-800"
              } ${disabled ? "opacity-50" : ""}`}
            >
              <Text
                className={`text-sm font-bold ${
                  isSelected ? "text-surface-50" : "text-surface-300"
                }`}
              >
                {rpe}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
