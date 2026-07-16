import { z } from "zod";

const BODYWEIGHT_MAX = 500;
const HEIGHT_MAX = 300;

/**
 * Optional numeric field stored as a string in the form (so <Input> works)
 * and coerced to `number` by the schema. An empty string or undefined is
 * treated as "unchanged" (transformed to `undefined`).
 */
const optionalPositiveNumber = (max: number, label: string) =>
  z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || v === "" || (Number(v) > 0 && Number(v) <= max),
      `${label} must be between 0 and ${max}`,
    )
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v)));

export const profileSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be 50 characters or less"),
  bodyweight: optionalPositiveNumber(BODYWEIGHT_MAX, "Bodyweight"),
  bodyweight_unit: z.enum(["metric", "imperial"]).optional(),
  height: optionalPositiveNumber(HEIGHT_MAX, "Height"),
  height_unit: z.enum(["metric", "imperial"]).optional(),
  experience: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  goal: z
    .enum(["strength", "hypertrophy", "endurance", "general_fitness"])
    .optional(),
});

/** Validated/payload type — numeric fields are `number | undefined`. */
export type ProfileInput = z.infer<typeof profileSchema>;

/** Form-values type — numeric fields are strings in the UI. */
export type ProfileFormValues = z.input<typeof profileSchema>;
