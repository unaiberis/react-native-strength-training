import { View, Text } from "react-native";
import type { PrescriptionWeightType } from "@/types/pocketbase";

interface WeightTypeSelectorProps {
  /** The active prescription weight type */
  weightType: PrescriptionWeightType | null;
  /** The computed target weight in kg */
  targetKg: number;
  /** Optional label describing the prescription value */
  label?: string | null;
  /** Optional warning message (e.g., missing 1RM data) */
  warning?: string | null;
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
  targetKg,
  label,
  warning,
  showLabel = true,
}: WeightTypeSelectorProps) {
  return (
    <View className="bg-card rounded-xl border border-border p-3 gap-1">
      {showLabel && weightType && (
        <Text className="text-surface-500 text-xs font-semibold uppercase tracking-wider">
          {WEIGHT_TYPE_LABELS[weightType] ?? "Weight"}
        </Text>
      )}

      {/* Computed target weight */}
      <View className="flex-row items-center gap-2">
        <Text className="text-surface-50 text-lg font-bold">
          {targetKg > 0 ? `${targetKg} kg` : "\u2014 kg"}
        </Text>
        {label && (
          <Text className="text-surface-400 text-sm">
            {label}
          </Text>
        )}
      </View>

      {/* Warning */}
      {warning && (
        <View className="bg-danger/10 rounded-lg px-2 py-1 mt-1">
          <Text className="text-danger text-xs font-medium">
            {warning}
          </Text>
        </View>
      )}
    </View>
  );
}
