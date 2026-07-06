import type { PrescriptionWeightType } from "../../types/pocketbase";

// ─── Types ───────────────────────────────────────────────────────────────

export interface PrescriptionInput {
  weightType: PrescriptionWeightType;
  weightValue: number;
  userBWKg?: number;
  exercise1RMKg?: number | null;
  difficulty1RM?: number;
}

export interface PrescriptionResult {
  targetKg: number;
  label: string;
  warning?: string;
}

// ─── Prescription Calculation ────────────────────────────────────────────

/**
 * Compute the target weight for an exercise based on prescription parameters.
 *
 * Supports four weight types:
 * - `one_rm_percent`: Percentage of estimated 1RM (e.g., 80% of 200kg = 160kg)
 * - `bw_percent`: Percentage of body weight (e.g., 50% BW at 80kg = 40kg)
 * - `absolute`: Fixed weight value in kg (ignores user data)
 * - `difficulty`: Based on difficulty rating (1-10) mapped to %1RM
 *
 * @returns The computed target weight in kg and a display label.
 *          Includes a `warning` if input data is missing.
 */
export function computeTargetWeight(input: PrescriptionInput): PrescriptionResult {
  const { weightType, weightValue, userBWKg, exercise1RMKg, difficulty1RM } = input;

  switch (weightType) {
    case "one_rm_percent": {
      if (!exercise1RMKg || exercise1RMKg <= 0) {
        return {
          targetKg: 0,
          label: `${weightValue}% 1RM`,
          warning: "No 1RM data — enter weight manually",
        };
      }
      const target = roundWeight(exercise1RMKg * (weightValue / 100));
      return {
        targetKg: target,
        label: `${weightValue}% 1RM (${target} kg)`,
      };
    }

    case "bw_percent": {
      if (!userBWKg || userBWKg <= 0) {
        return {
          targetKg: 0,
          label: `${weightValue}% BW`,
          warning: "No body weight data — enter weight manually",
        };
      }
      const target = roundWeight(userBWKg * (weightValue / 100));
      return {
        targetKg: target,
        label: `${weightValue}% BW (${target} kg)`,
      };
    }

    case "absolute": {
      return {
        targetKg: weightValue,
        label: `${weightValue} kg`,
      };
    }

    case "difficulty": {
      if (!difficulty1RM && !exercise1RMKg) {
        return {
          targetKg: 0,
          label: `Difficulty ${weightValue}/10`,
          warning: "No 1RM data — enter weight manually",
        };
      }
      const oneRM = difficulty1RM ?? exercise1RMKg ?? 100;
      // Map difficulty 1-10 to %1RM: difficulty 1 = 50%, 10 = 95%
      const percentMap = [
        0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95,
      ];
      const clampedDifficulty = Math.max(1, Math.min(10, Math.round(weightValue)));
      const percent = percentMap[clampedDifficulty - 1];
      const target = roundWeight(oneRM * percent);
      return {
        targetKg: target,
        label: `Difficulty ${clampedDifficulty}/10 (${target} kg)`,
      };
    }

    default:
      return { targetKg: 0, label: "" };
  }
}

/**
 * Compute target weight from a PrescriptionConfig stored on an exercise.
 */
export function computeTargetFromConfig(
  config: { weight_type: PrescriptionWeightType; value: number } | null,
  options: { userBWKg?: number; exercise1RMKg?: number | null; difficulty1RM?: number },
): PrescriptionResult {
  if (!config) {
    return { targetKg: 0, label: "No prescription" };
  }
  return computeTargetWeight({
    weightType: config.weight_type,
    weightValue: config.value,
    ...options,
  });
}

/**
 * Round weight to nearest 0.5 kg (standard plate math).
 */
function roundWeight(kg: number): number {
  return Math.round(kg * 2) / 2;
}
