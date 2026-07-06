import { z } from "zod";
import { i18n } from "../../i18n";

export const templateExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  sortOrder: z.number().int().min(0),
  targetSets: z.number().int().min(1).max(20).default(3),
  targetReps: z.number().int().min(1).max(100).default(10),
  targetRpeLow: z.number().min(1).max(10).optional().nullable(),
  targetRpeHigh: z.number().min(1).max(10).optional().nullable(),
  restSeconds: z.number().int().min(0).max(600).default(90),
  notes: z.string().max(500).optional().nullable(),
});

// ─── Factory function (i18n-aware) ──────────────────────────────────────────

export function getWorkoutTemplateSchema() {
  return z.object({
    name: z
      .string()
      .min(1, i18n.t("Template name is required"))
      .max(100, i18n.t("Name must be 100 characters or less")),
    description: z.string().max(500).optional().nullable(),
    programBlockId: z.string().uuid().optional().nullable(),
    isPublic: z.boolean().default(false),
    exercises: z.array(templateExerciseSchema).min(1, i18n.t("At least one exercise is required")),
  });
}

// ─── Legacy schema (backward compatibility) ─────────────────────────────────

export const workoutTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Name must be 100 characters or less"),
  description: z.string().max(500).optional().nullable(),
  programBlockId: z.string().uuid().optional().nullable(),
  isPublic: z.boolean().default(false),
  exercises: z.array(templateExerciseSchema).min(1, "At least one exercise is required"),
});

export type TemplateExerciseInput = z.infer<typeof templateExerciseSchema>;
export type WorkoutTemplateInput = z.infer<typeof workoutTemplateSchema>;

export const templateDefaults: WorkoutTemplateInput = {
  name: "",
  description: null,
  programBlockId: null,
  isPublic: false,
  exercises: [],
};
