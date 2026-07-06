import { View, Text } from "react-native";
import { useLingui } from "@lingui/react/macro";
import type { PrescriptionWeightType } from "../../types/pocketbase";
import type { PrescriptionResult } from "../utils/prescription";

interface WeightTypeSelectorProps {
  /** The active prescription weight type */
  weightType: PrescriptionWeightType | null;
  /** The computed prescription result */
  result: PrescriptionResult;
  /** Whether to show the label inline */
  showLabel?: boolean;
}

const WEIGHT_TYPE_LABELS: Record<PrescriptionWeightType, string> = {
  absolute: "Absolute",
  bw_percent: "% BW",
  one_rm_percent: "% 1RM",
  difficulty: "Difficulty",
};

/**
 * Displays the current weight type prescription and computed target weight.
 *
 * Shows the weight type name, prescription value, and computed target.
 * If a warning is present (e.g., missing 1RM data), it's displayed prominently.
 */
export function WeightTypeSelector({
  weightType,
  result,
  showLabel = true,
}: WeightTypeSelectorProps) {
  const { t } = useLingui();

  return (
    <View className="bg-card rounded-xl border border-border p-3 gap-1">
      {showLabel && weightType && (
        <Text className="text-surface-500 text-xs font-semibold uppercase tracking-wider">
          {WEIGHT_TYPE_LABELS[weightType] ?? t`Weight`}
        </Text>
      )}

      {/* Computed target weight */}
      <View className="flex-row items-center gap-2">
        <Text className="text-surface-50 text-lg font-bold">
          {result.targetKg > 0 ? `${result.targetKg} kg` : t`— kg`}
        </Text>
        {result.label && (
          <Text className="text-surface-400 text-sm">
            {result.label}
          </Text>
        )}
      </View>

      {/* Warning */}
      {result.warning && (
        <View className="bg-danger/10 rounded-lg px-2 py-1 mt-1">
          <Text className="text-danger text-xs font-medium">
            {result.warning}
          </Text>
        </View>
      )}
    </View>
  );
}
