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
  created: string;
  updated: string;
  video_url?: string | null;
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
  logged_at: string;
  created: string;
  updated: string;
}

// Block Types

export type BlockType = "straight_set" | "amrap" | "emom" | "circuit";

export type PrescriptionWeightType = "absolute" | "bw_percent" | "one_rm_percent" | "difficulty";

export interface PrescriptionConfig {
  type: PrescriptionWeightType;
  value: number; // kg, percentage, or RPE
  minRpe?: number;
  maxRpe?: number;
}

// Wellness

/** User record from PocketBase `users` collection. */
export interface UserRow {
  id: string;
  email: string;
  displayName: string;
  role: "athlete" | "coach";
  coach: string | null;
  created: string;
  updated: string;
}

/** Program assignment row — maps a coach-assigned template to an athlete. */
export interface ProgramAssignmentRow {
  id: string;
  athlete: string;
  coach: string;
  template: string;
  start_date: string;
  status: "active" | "completed" | "cancelled";
  created: string;
  updated: string;
}

/** Athlete summary for coach dashboard. */
export interface AthleteSummary {
  id: string;
  displayName: string;
  email: string;
  lastWorkoutDate: string | null;
  totalWorkouts: number;
  thisWeekWorkouts: number;
  complianceRate: number;
  totalVolumeKg: number;
}

/** Volume data point for coach analytics charts. */
export interface VolumeDataPoint {
  date: string;
  totalVolumeKg: number;
  sessionCount: number;
}

/** Compliance data point for weekly adherence chart. */
export interface ComplianceDataPoint {
  weekStart: string;
  assigned: number;
  completed: number;
  rate: number;
}

/** PR evolution point for a specific exercise. */
export interface PREvolutionPoint {
  date: string;
  value: number;
  exerciseName: string;
}

export interface WorkoutFeedbackRow {
  id: string;
  session_id: string;
  athlete_id: string;
  coach_id: string | null;
  rating: number;
  notes: string | null;
  created_at: string;
  updated: string;
}

export interface WellnessRow {
  id: string;
  user_id: string;
  date: string; // ISO date YYYY-MM-DD
  session_rpe: number | null; // 1-10
  sleep: number | null; // 1-5
  fatigue: number | null; // 1-5
  soreness: number | null; // 1-5
  mood: number | null; // 1-5
  session_id: string | null;
  created_at: string;
}
