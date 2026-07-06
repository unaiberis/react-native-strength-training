import { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useLingui } from "@lingui/react/macro";

interface RpeSliderProps {
  /** Current RPE value (1-10, in 0.5 increments), or null for unset */
  value: number | null;
  /** Called when the user selects an RPE value */
  onChange: (rpe: number | null) => void;
  /** Optional RPE target range for reference display */
  targetLow?: number | null;
  targetHigh?: number | null;
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
 * The user taps a value to select it; tapping again clears it.
 * Shows target range guidance when targetLow/targetHigh are provided.
 */
export function RpeSlider({
  value,
  onChange,
  targetLow,
  targetHigh,
}: RpeSliderProps) {
  const { t } = useLingui();

  const handlePress = useCallback(
    (rpe: number) => {
      if (value === rpe) {
        onChange(null);
      } else {
        onChange(rpe);
      }
    },
    [value, onChange],
  );

  const isInTarget =
    value != null &&
    targetLow != null &&
    targetHigh != null &&
    value >= targetLow &&
    value <= targetHigh;

  return (
    <View className="gap-2">
      {/* Label row */}
      <View className="flex-row justify-between items-center">
        <Text className="text-surface-400 text-xs font-semibold">
          {t`RPE (1-10)`}
        </Text>
        {value != null && (
          <Text
            className={`text-xs font-bold ${
              isInTarget ? "text-success" : "text-surface-100"
            }`}
          >
            {value} — {RPE_LABELS[value] ?? ""}
          </Text>
        )}
      </View>

      {/* Target range hint */}
      {targetLow != null && targetHigh != null && (
        <Text className="text-surface-500 text-xs">
          {t`Target: ${targetLow}–${targetHigh}`}
          {value != null && !isInTarget && value > 0
            ? value > targetHigh
              ? t` (above target)`
              : t` (below target)`
            : ""}
        </Text>
      )}

      {/* RPE buttons row */}
      <View className="flex-row gap-1.5">
        {RPE_VALUES.map((rpe) => {
          const isSelected = value === rpe;
          const isInRange =
            targetLow != null &&
            targetHigh != null &&
            rpe >= targetLow &&
            rpe <= targetHigh;

          return (
            <TouchableOpacity
              key={rpe}
              onPress={() => handlePress(rpe)}
              className={`flex-1 items-center py-2.5 rounded-xl border ${
                isSelected
                  ? "bg-brand-500/30 border-brand-500"
                  : isInRange
                    ? "bg-surface-800 border-surface-600"
                    : "bg-surface-900 border-surface-800"
              }`}
              accessibilityLabel={t`RPE ${rpe}`}
            >
              <Text
                className={`text-sm font-bold ${
                  isSelected ? "text-brand-400" : "text-surface-300"
                }`}
              >
                {rpe}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Clear button */}
      {value != null && (
        <TouchableOpacity
          onPress={() => onChange(null)}
          className="self-end"
        >
          <Text className="text-surface-500 text-xs">{t`Clear RPE`}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
