/**
 * Prescription Calculation Utilities
 *
 * Pure functions for computing target weights based on prescription config
 * (absolute, body-weight percentage, 1RM percentage, or difficulty/RPE).
 */

import type { PrescriptionConfig } from "@/types/pocketbase";

// ─── Types ───────────────────────────────────────────────────────────────

export type WeightType = "absolute" | "bw_percent" | "one_rm_percent" | "difficulty";

export interface TargetWeightResult {
  targetKg: number;
  label: string;
  warning?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────

/** RPE-to-percent mapping: difficulty 1-10 → fraction of 1RM */
const DIFFICULTY_PERCENT_MAP: readonly number[] = [
  0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95,
];

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Round weight to nearest 0.5 kg (standard plate math). */
function roundWeight(kg: number): number {
  return Math.round(kg * 2) / 2;
}

// ─── Computation ─────────────────────────────────────────────────────────

/**
 * Compute a target weight based on a weight type, value, and user options.
 *
 * @param type    - How to interpret `value` (absolute, %BW, %1RM, difficulty)
 * @param value   - The numeric parameter (kg, percentage, or RPE 1-10)
 * @param options - Optional context: bodyWeightKg, oneRmKg
 */
export function computeTargetWeight(
  type: WeightType,
  value: number,
  options: { bodyWeightKg?: number; oneRmKg?: number } = {},
): TargetWeightResult {
  const { bodyWeightKg, oneRmKg } = options;

  switch (type) {
    case "absolute":
      return { targetKg: value, label: `${value} kg` };

    case "bw_percent": {
      if (!bodyWeightKg || bodyWeightKg <= 0) {
        return {
          targetKg: 0,
          label: `${value}% BW`,
          warning: "No body weight data — enter weight manually",
        };
      }
      const target = roundWeight(bodyWeightKg * (value / 100));
      return { targetKg: target, label: `${value}% BW (${target} kg)` };
    }

    case "one_rm_percent": {
      if (!oneRmKg || oneRmKg <= 0) {
        return {
          targetKg: 0,
          label: `${value}% 1RM`,
          warning: "No 1RM data — enter weight manually",
        };
      }
      const target = roundWeight(oneRmKg * (value / 100));
      return { targetKg: target, label: `${value}% 1RM (${target} kg)` };
    }

    case "difficulty": {
      if (!oneRmKg || oneRmKg <= 0) {
        return {
          targetKg: 0,
          label: `Difficulty ${value}/10`,
          warning: "No 1RM data — enter weight manually",
        };
      }
      const clamped = Math.max(1, Math.min(10, Math.round(value)));
      const percent = DIFFICULTY_PERCENT_MAP[clamped - 1];
      const target = roundWeight(oneRmKg * percent);
      return { targetKg: target, label: `Difficulty ${clamped}/10 (${target} kg)` };
    }

    default:
      return { targetKg: 0, label: "" };
  }
}

/**
 * Compute target weight from a PrescriptionConfig object (as stored on exercises).
 */
export function computeTargetFromConfig(
  config: PrescriptionConfig | null,
  options: { bodyWeightKg?: number; oneRmKg?: number } = {},
): TargetWeightResult {
  if (!config) {
    return { targetKg: 0, label: "No prescription" };
  }
  return computeTargetWeight(config.type, config.value, options);
}
