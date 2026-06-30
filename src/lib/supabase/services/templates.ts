import { supabase } from "../client";
import type { WorkoutTemplateInput } from "../../../shared/schemas/template";

export interface TemplateRow {
  id: string;
  user_id: string;
  program_block_id: string | null;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateExerciseRow {
  id: string;
  workout_template_id: string;
  exercise_id: string;
  sort_order: number;
  target_sets: number;
  target_reps: number;
  target_rpe_low: number | null;
  target_rpe_high: number | null;
  rest_seconds: number;
  notes: string | null;
}

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
  // Insert the template record
  const { data: template, error: templateError } = await supabase
    .from("workout_templates")
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description ?? null,
      program_block_id: input.programBlockId ?? null,
      is_public: input.isPublic,
    })
    .select()
    .single();

  if (templateError) throw new Error(templateError.message);
  if (!template) throw new Error("Failed to create template");

  // Insert all exercises
  const exerciseRows = input.exercises.map((ex) =>
    exerciseInputToRow(template.id, ex),
  );

  const { data: exercises, error: exercisesError } = await supabase
    .from("workout_template_exercises")
    .insert(exerciseRows)
    .select()
    .order("sort_order", { ascending: true });

  if (exercisesError) throw new Error(exercisesError.message);

  return {
    ...(template as TemplateRow),
    exercises: (exercises ?? []) as TemplateExerciseRow[],
  };
}

/**
 * List all templates for the current user.
 */
export async function listTemplates(
  userId: string,
): Promise<TemplateWithExercises[]> {
  const { data: templates, error } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const templateRows = (templates ?? []) as TemplateRow[];

  // Fetch exercises for each template
  const templatesWithExercises = await Promise.all(
    templateRows.map(async (template) => {
      const exercises = await getTemplateExercises(template.id);
      return { ...template, exercises };
    }),
  );

  return templatesWithExercises;
}

/**
 * Get a single template with its exercises.
 */
export async function getTemplate(
  id: string,
): Promise<TemplateWithExercises | null> {
  const { data: template, error } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  const exercises = await getTemplateExercises(template.id);

  return {
    ...(template as TemplateRow),
    exercises,
  };
}

/**
 * Get exercises for a specific template, ordered by sort_order.
 */
async function getTemplateExercises(
  templateId: string,
): Promise<TemplateExerciseRow[]> {
  const { data, error } = await supabase
    .from("workout_template_exercises")
    .select("*")
    .eq("workout_template_id", templateId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TemplateExerciseRow[];
}

/**
 * Update a template (name, description, etc.) and replace its exercises.
 */
export async function updateTemplate(
  id: string,
  input: WorkoutTemplateInput,
): Promise<TemplateWithExercises> {
  // Update template metadata
  const { data: template, error: templateError } = await supabase
    .from("workout_templates")
    .update({
      name: input.name,
      description: input.description ?? null,
      program_block_id: input.programBlockId ?? null,
      is_public: input.isPublic,
    })
    .eq("id", id)
    .select()
    .single();

  if (templateError) throw new Error(templateError.message);
  if (!template) throw new Error("Template not found");

  // Delete existing exercises and re-insert
  const { error: deleteError } = await supabase
    .from("workout_template_exercises")
    .delete()
    .eq("workout_template_id", id);

  if (deleteError) throw new Error(deleteError.message);

  const exerciseRows = input.exercises.map((ex) =>
    exerciseInputToRow(id, ex),
  );

  const { data: exercises, error: exercisesError } = await supabase
    .from("workout_template_exercises")
    .insert(exerciseRows)
    .select()
    .order("sort_order", { ascending: true });

  if (exercisesError) throw new Error(exercisesError.message);

  return {
    ...(template as TemplateRow),
    exercises: (exercises ?? []) as TemplateExerciseRow[],
  };
}

/**
 * Delete a template and its exercises (cascade handled by DB).
 */
export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from("workout_templates")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * Reorder exercises within a template.
 * Accepts an array of exercise IDs in the new desired order.
 * Updates sort_order values in a batch.
 */
export async function reorderTemplateExercises(
  templateId: string,
  exerciseIdsInOrder: string[],
): Promise<void> {
  const updates = exerciseIdsInOrder.map((exerciseId, index) => ({
    id: exerciseId,
    workout_template_id: templateId,
    sort_order: index,
  }));

  // Update each exercise's sort_order
  for (const update of updates) {
    const { error } = await supabase
      .from("workout_template_exercises")
      .update({ sort_order: update.sort_order })
      .eq("id", update.id)
      .eq("workout_template_id", templateId);

    if (error) throw new Error(error.message);
  }
}
