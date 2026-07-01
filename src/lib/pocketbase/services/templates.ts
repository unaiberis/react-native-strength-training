import { pb } from "../client";
import type { TemplateRow, TemplateExerciseRow } from "../../../types/pocketbase";
import type { WorkoutTemplateInput } from "../../../shared/schemas/template";

export interface TemplateWithExercises extends TemplateRow {
  exercises: TemplateExerciseRow[];
}

/**
 * Convert an input exercise config to the DB column format.
 */
function exerciseInputToRow(
  templateId: string,
  input: { exerciseId: string; sortOrder: number; targetSets: number; targetReps: number; targetRpeLow?: number | null; targetRpeHigh?: number | null; restSeconds: number; notes?: string | null },
) {
  return {
    workout_template_id: templateId,
    exercise_id: input.exerciseId,
    sort_order: input.sortOrder,
    target_sets: input.targetSets,
    target_reps: input.targetReps,
    target_rpe_low: input.targetRpeLow ?? null,
    target_rpe_high: input.targetRpeHigh ?? null,
    rest_seconds: input.restSeconds,
    notes: input.notes ?? null,
  };
}

/**
 * Create a workout template with its exercises.
 */
export async function createTemplate(
  userId: string,
  input: WorkoutTemplateInput,
): Promise<TemplateWithExercises> {
  try {
    // Insert the template record
    const template = await pb.collection("workout_templates").create({
      user_id: userId,
      name: input.name,
      description: input.description ?? null,
      program_block_id: input.programBlockId ?? null,
      is_public: input.isPublic,
    });

    if (!template) throw new Error("Failed to create template");
    const templateRow = template as unknown as TemplateRow;

    // Insert all exercises
    const exerciseRows = input.exercises.map((ex) =>
      exerciseInputToRow(templateRow.id, ex),
    );

    const exercises: TemplateExerciseRow[] = [];
    for (const row of exerciseRows) {
      const created = await pb.collection("workout_template_exercises").create(row);
      if (created) {
        exercises.push(created as unknown as TemplateExerciseRow);
      }
    }

    return {
      ...templateRow,
      exercises,
    };
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to create template");
  }
}

/**
 * Get exercises for a specific template, ordered by sort_order.
 */
async function getTemplateExercises(
  templateId: string,
): Promise<TemplateExerciseRow[]> {
  const records = await pb.collection("workout_template_exercises").getFullList({
    filter: `workout_template_id = '${templateId}'`,
    sort: "sort_order",
  });
  return (records ?? []) as unknown as TemplateExerciseRow[];
}

/**
 * List all templates for the current user.
 */
export async function listTemplates(
  userId: string,
): Promise<TemplateWithExercises[]> {
  try {
    const records = await pb.collection("workout_templates").getFullList({
      filter: `user_id = '${userId}'`,
      sort: "-created",
    });

    const templateRows = (records ?? []) as unknown as TemplateRow[];

    // Fetch exercises for each template
    const templatesWithExercises = await Promise.all(
      templateRows.map(async (template) => {
        const exercises = await getTemplateExercises(template.id);
        return { ...template, exercises };
      }),
    );

    return templatesWithExercises;
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to list templates");
  }
}

/**
 * Get a single template with its exercises.
 */
export async function getTemplate(
  id: string,
): Promise<TemplateWithExercises | null> {
  try {
    const template = await pb.collection("workout_templates").getOne(id);
    const templateRow = template as unknown as TemplateRow;
    const exercises = await getTemplateExercises(templateRow.id);
    return { ...templateRow, exercises };
  } catch (err: any) {
    if (
      err?.status === 404 ||
      err?.message?.includes("The requested resource wasn't found")
    ) {
      return null;
    }
    throw new Error(err.message ?? "Failed to get template");
  }
}

/**
 * Update a template (name, description, etc.) and replace its exercises.
 */
export async function updateTemplate(
  id: string,
  input: WorkoutTemplateInput,
): Promise<TemplateWithExercises> {
  try {
    // Update template metadata
    const template = await pb.collection("workout_templates").update(id, {
      name: input.name,
      description: input.description ?? null,
      program_block_id: input.programBlockId ?? null,
      is_public: input.isPublic,
    });

    if (!template) throw new Error("Template not found");
    const templateRow = template as unknown as TemplateRow;

    // Delete existing exercises
    const existing = await getTemplateExercises(id);
    for (const ex of existing) {
      await pb.collection("workout_template_exercises").delete(ex.id);
    }

    // Create new exercises
    const exerciseRows = input.exercises.map((ex) =>
      exerciseInputToRow(id, ex),
    );

    const exercises: TemplateExerciseRow[] = [];
    for (const row of exerciseRows) {
      const created = await pb.collection("workout_template_exercises").create(row);
      if (created) {
        exercises.push(created as unknown as TemplateExerciseRow);
      }
    }

    return {
      ...templateRow,
      exercises,
    };
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to update template");
  }
}

/**
 * Delete a template. Cascade deletion of exercises is handled by
 * PocketBase if the collection relationship is configured.
 */
export async function deleteTemplate(id: string): Promise<void> {
  try {
    await pb.collection("workout_templates").delete(id);
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to delete template");
  }
}

/**
 * Reorder exercises within a template.
 * Accepts an array of exercise record IDs in the new desired order.
 * Updates sort_order values sequentially.
 */
export async function reorderTemplateExercises(
  templateId: string,
  exerciseIdsInOrder: string[],
): Promise<void> {
  try {
    for (let i = 0; i < exerciseIdsInOrder.length; i++) {
      await pb.collection("workout_template_exercises").update(exerciseIdsInOrder[i], {
        sort_order: i,
      });
    }
  } catch (err: any) {
    throw new Error(err.message ?? "Failed to reorder exercises");
  }
}
