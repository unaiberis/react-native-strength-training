import { z } from "zod";

/**
 * Feedback input schema for athlete workout evaluation.
 *
 * Rating: integer 1–5 (required)
 * Notes: optional string, max 500 characters (nullified when empty)
 */
export const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  notes: z
    .string()
    .max(500)
    .nullable()
    .optional()
    .default(null)
    .transform((v) => (v === "" ? null : v ?? null)),
});
