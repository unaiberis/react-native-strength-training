/**
 * Shared type definitions for the offline sync layer.
 *
 * These types mirror the SQLite schema design and are shared across
 * database, change queue, sync engine, and offline services modules.
 */

// ─── Queue Types ────────────────────────────────────────────────────────

export type QueueAction = "create" | "update" | "delete";

export type QueueStatus =
  | "pending"
  | "in_flight"
  | "dead_letter"
  | "auth_error";

export interface QueueEntry {
  id: number;
  action: QueueAction;
  collection: string;
  local_id: string | null;
  record_id: string | null;
  data: Record<string, unknown> | null;
  group_id: string | null;
  status: QueueStatus;
  retry_count: number;
  last_error: string | null;
  created_at: string;
}

// ─── Sync Events ────────────────────────────────────────────────────────

export type SyncEventType =
  | "SYNC_START"
  | "SYNC_COMPLETE"
  | "SYNC_PARTIAL"
  | "AUTH_EXPIRED"
  | "AUTH_CLEARED"
  | "DEAD_LETTER";

export interface SyncEvent {
  type: SyncEventType;
  detail?: {
    deadLetterCount?: number;
    collection?: string;
    error?: string;
  };
}

// ─── Row Types (mirror SQLite tables) ───────────────────────────────────

export interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  equipment: string | null;
  body_region: string | null;
  default_sets: number;
  default_reps: number;
  description: string | null;
  synced_at: string | null;
}

export interface WorkoutTemplateRow {
  id: string;
  local_id: string | null;
  user_id: string;
  name: string;
  description: string | null;
  is_public: number;
  dirty: number;
  synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WorkoutTemplateExerciseRow {
  id: string;
  local_id: string | null;
  template_id: string;
  exercise_id: string;
  sort_order: number;
  target_sets: number;
  target_reps: number;
  rest_seconds: number;
  notes: string | null;
  dirty: number;
  synced_at: string | null;
}

export interface WorkoutSessionRow {
  id: string;
  local_id: string | null;
  user_id: string;
  template_id: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  dirty: number;
  synced_at: string | null;
}

export interface ExerciseSetRow {
  id: string;
  local_id: string | null;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe: number | null;
  rir: number | null;
  is_warmup: number;
  tempo?: string | null;
  dirty: number;
  synced_at: string | null;
}

export interface WorkoutFeedbackRow {
  id: string;
  local_id: string | null;
  session_id: string;
  athlete_id: string;
  coach_id: string | null;
  rating: number;
  notes: string | null;
  synced: number;
  created_at: string;
}

// ─── Offline Service Input Types ────────────────────────────────────────

export interface LogSetInput {
  exerciseId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  rir?: number;
  isWarmup?: boolean;
  loggedAt?: string;
  tempo?: string | null;
}

export interface CompleteSessionInput {
  durationSeconds?: number;
  notes?: string;
}

export interface FeedbackInput {
  sessionId: string;
  athleteId: string;
  coachId?: string | null;
  rating: number;
  notes?: string | null;
}
