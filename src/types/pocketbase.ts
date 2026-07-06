/**
 * PocketBase record type mappings.
 *
 * These map the snake_case column names from PocketBase collections
 * to TypeScript interfaces. Each corresponds to a PocketBase collection
 * that mirrors the Supabase tables being migrated.
 */

export interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  equipment: string[] | null;
  body_region: string | null;
  description: string | null;
  default_sets: number;
  default_reps: number;
  default_rest_seconds: number;
  is_public: boolean;
  video_url: string | null;
  created: string;
  updated: string;
}

export interface TemplateRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  program_block_id: string | null;
  is_public: boolean;
  created: string;
  updated: string;
}

export type BlockType = "straight_set" | "amrap" | "emom" | "circuit";

export type PrescriptionWeightType = "absolute" | "bw_percent" | "one_rm_percent" | "difficulty";

export interface PrescriptionConfig {
  weight_type: PrescriptionWeightType;
  value: number;
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
  block_type: BlockType;
  prescription: PrescriptionConfig | null;
  round: number | null;
  timer_minutes: number | null;
}

export interface SessionRow {
  id: string;
  user_id: string;
  workout_template_id: string | null;
  program_block_id: string | null;
  status: "in_progress" | "completed" | "cancelled";
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  created: string;
  updated: string;
}

export interface ExerciseSetRow {
  id: string;
  workout_session_id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe: number | null;
  rir: number | null;
  is_warmup: boolean;
  tempo?: string | null;
  round: number | null;
  timer_remaining: number | null;
  logged_at: string;
  created: string;
  updated: string;
}
