import { pb } from '../client';
import type { SessionRow, ExerciseSetRow } from '../../../types/pocketbase';

// ─── Row Types ───────────────────────────────────────────────────────────

/** A set as logged by the user (camelCase, before DB insert) */
export interface LogSetInput {
  exerciseId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number | null;
  rir?: number | null;
  isWarmup?: boolean;
  tempo?: string | null;
}

// ─── Pre-built exercise from a template ──────────────────────────────────

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  targetRpeLow: number | null;
  targetRpeHigh: number | null;
  restSeconds: number;
  notes: string | null;
}

// ─── Session detail (session + sets + exercise names) ────────────────────

export interface SessionDetail extends SessionRow {
  sets: ExerciseSetRow[];
}

// ─── Detail with exercise names and grouped sets ─────────────────────────

export interface ExerciseNameMap {
  [exerciseId: string]: string;
}

export interface SessionDetailWithExercises extends SessionDetail {
  exerciseNames: ExerciseNameMap;
  groupedSets: Record<string, ExerciseSetRow[]>;
  /** Name of the workout template, if this session was created from one. */
  templateName?: string;
}

// ─── Create Session ──────────────────────────────────────────────────────

export interface CreateSessionResult {
  session: SessionRow;
  exercises: SessionExercise[];
}

/**
 * Create a new workout session.
 *
 * If `workoutTemplateId` is provided, the template's exercises are fetched and
 * returned so the UI can pre-fill target sets/reps/rest.
 */
export async function createSession(
  userId: string,
  options?: { workoutTemplateId?: string; programBlockId?: string }
): Promise<CreateSessionResult> {
  try {
    // Insert the session row
    const session = await pb.collection('workout_sessions').create({
      user_id: userId,
      workout_template_id: options?.workoutTemplateId ?? null,
      program_block_id: options?.programBlockId ?? null,
      status: 'in_progress',
    });

    if (!session) throw new Error('Failed to create session');
    const sessionRow = session as unknown as SessionRow;

    // If a template was specified, fetch its exercises
    let exercises: SessionExercise[] = [];
    if (options?.workoutTemplateId) {
      exercises = await fetchTemplateExercises(options.workoutTemplateId);
    }

    return { session: sessionRow, exercises };
  } catch (err: any) {
    throw new Error(err.message ?? 'Failed to create session');
  }
}

/**
 * Fetch exercises from a workout template, enriched with exercise names.
 */
async function fetchTemplateExercises(
  templateId: string
): Promise<SessionExercise[]> {
  // Step 1: get template exercise rows
  const rows = await pb.collection('workout_template_exercises').getFullList({
    filter: `workout_template_id = '${templateId}'`,
    sort: 'sort_order',
  });

  const templateExercises = (rows ?? []) as unknown as Array<{
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
  }>;

  if (templateExercises.length === 0) return [];

  // Step 2: fetch exercise names
  const exerciseIds = templateExercises.map((r) => r.exercise_id);
  const exerciseRecords = await pb.collection('exercises').getFullList({
    filter: exerciseIds.map((id) => `id = '${id}'`).join(' || '),
    fields: 'id,name',
  });

  const nameMap = new Map<string, string>();
  for (const ex of exerciseRecords ?? []) {
    const record = ex as unknown as { id: string; name: string };
    nameMap.set(record.id, record.name);
  }

  return templateExercises.map((r) => ({
    exerciseId: r.exercise_id,
    exerciseName: nameMap.get(r.exercise_id) ?? 'Unknown Exercise',
    targetSets: r.target_sets,
    targetReps: r.target_reps,
    targetRpeLow: r.target_rpe_low,
    targetRpeHigh: r.target_rpe_high,
    restSeconds: r.rest_seconds,
    notes: r.notes,
  }));
}

// ─── Log a Set ────────────────────────────────────────────────────────────

export async function logSet(
  sessionId: string,
  input: LogSetInput
): Promise<ExerciseSetRow> {
  try {
    const record = await pb.collection('exercise_sets').create({
      workout_session_id: sessionId,
      exercise_id: input.exerciseId,
      set_number: input.setNumber,
      weight_kg: input.weightKg,
      reps: input.reps,
      rpe: input.rpe ?? null,
      rir: input.rir ?? null,
      is_warmup: input.isWarmup ?? false,
      tempo: input.tempo ?? null,
    });

    if (!record) throw new Error('Failed to log set');
    return record as unknown as ExerciseSetRow;
  } catch (err: any) {
    throw new Error(err.message ?? 'Failed to log set');
  }
}

// ─── Complete a Session ──────────────────────────────────────────────────

export interface CompleteSessionInput {
  notes?: string | null;
}

export async function completeSession(
  sessionId: string,
  input?: CompleteSessionInput & { startedAt?: string }
): Promise<SessionRow> {
  try {
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      status: 'completed',
      completed_at: now,
      notes: input?.notes ?? null,
    };

    // Compute duration in minutes if we have a startedAt
    if (input?.startedAt) {
      const diffMs =
        new Date(now).getTime() - new Date(input.startedAt).getTime();
      updateData.duration_minutes = Math.round(diffMs / 60000);
    }

    const record = await pb
      .collection('workout_sessions')
      .update(sessionId, updateData);
    if (!record) throw new Error('Session not found');
    return record as unknown as SessionRow;
  } catch (err: any) {
    throw new Error(err.message ?? 'Failed to complete session');
  }
}

// ─── Cancel a Session ────────────────────────────────────────────────────

export async function cancelSession(sessionId: string): Promise<SessionRow> {
  try {
    const record = await pb.collection('workout_sessions').update(sessionId, {
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    });

    if (!record) throw new Error('Session not found');
    return record as unknown as SessionRow;
  } catch (err: any) {
    throw new Error(err.message ?? 'Failed to cancel session');
  }
}

// ─── Get Workout Session ─────────────────────────────────────────────────

export async function getWorkoutSession(
  id: string
): Promise<SessionDetail | null> {
  try {
    const session = await pb.collection('workout_sessions').getOne(id);
    const sessionRow = session as unknown as SessionRow;

    const sets = await pb.collection('exercise_sets').getFullList({
      filter: `workout_session_id = '${id}'`,
      sort: 'set_number',
    });

    return {
      ...sessionRow,
      sets: (sets ?? []) as unknown as ExerciseSetRow[],
    };
  } catch (err: any) {
    if (
      err?.status === 404 ||
      err?.message?.includes("The requested resource wasn't found")
    ) {
      return null;
    }
    throw new Error(err.message ?? 'Failed to get session');
  }
}

// ─── Get Session with Exercise Names ──────────────────────────────────────

/**
 * Get a session with full set data, enriched with exercise names and
 * sets grouped by exercise.
 */
export async function getSessionDetail(
  id: string
): Promise<SessionDetailWithExercises | null> {
  try {
    const session = await getWorkoutSession(id);
    if (!session) return null;

    // Collect unique exercise IDs
    const exerciseIds = [...new Set(session.sets.map((s) => s.exercise_id))];

    // Fetch template name if the session references a template
    let templateName: string | undefined;
    if (session.workout_template_id) {
      try {
        const tmpl = await pb
          .collection('workout_templates')
          .getOne(session.workout_template_id, {
            fields: 'name',
          });
        templateName = (tmpl as unknown as { name: string }).name;
      } catch {
        // template might have been deleted; silently skip
      }
    }

    if (exerciseIds.length === 0) {
      return {
        ...session,
        exerciseNames: {},
        groupedSets: {},
        templateName,
      };
    }

    // Fetch exercise names
    const exerciseRecords = await pb.collection('exercises').getFullList({
      filter: exerciseIds.map((eid) => `id = '${eid}'`).join(' || '),
      fields: 'id,name',
    });

    const exerciseNames: ExerciseNameMap = {};
    for (const ex of exerciseRecords ?? []) {
      const record = ex as unknown as { id: string; name: string };
      exerciseNames[record.id] = record.name;
    }

    // Group sets by exercise (preserving set_number order)
    const groupedSets: Record<string, ExerciseSetRow[]> = {};
    for (const set of session.sets) {
      const group = groupedSets[set.exercise_id] ?? [];
      group.push(set);
      groupedSets[set.exercise_id] = group;
    }

    return {
      ...session,
      exerciseNames,
      groupedSets,
      templateName,
    };
  } catch (err: any) {
    throw new Error(err.message ?? 'Failed to get session detail');
  }
}

// ─── List Sessions (for history) ──────────────────────────────────────────

export interface SessionListItem {
  id: string;
  workout_template_id: string | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  templateName?: string;
  exerciseCount?: number;
  totalSets?: number;
}

export interface ListSessionsOptions {
  status?: string;
  exerciseId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

/**
 * List workout sessions with pagination and optional filters.
 *
 * Default: returns completed sessions in reverse chronological order.
 */
export async function listSessions(
  userId: string,
  options?: ListSessionsOptions
): Promise<{ data: SessionListItem[]; count: number }> {
  const {
    status = 'completed',
    exerciseId,
    fromDate,
    toDate,
    page = 0,
    pageSize = 20,
  } = options ?? {};

  try {
    // If filtering by exercise, look up matching session IDs first
    let sessionIds: string[] | undefined;
    if (exerciseId) {
      const sets = await pb.collection('exercise_sets').getFullList({
        filter: `exercise_id = '${exerciseId}'`,
        fields: 'workout_session_id',
      });

      const setList = (sets ?? []) as unknown as Array<{
        workout_session_id: string;
      }>;
      const ids = [...new Set(setList.map((s) => s.workout_session_id))];
      if (ids.length === 0) return { data: [], count: 0 };
      sessionIds = ids;
    }

    // Build filter conditions
    const conditions: string[] = [`user_id = '${userId}'`];
    if (status) conditions.push(`status = '${status}'`);
    if (fromDate) conditions.push(`started_at >= '${fromDate}'`);
    if (toDate) conditions.push(`started_at <= '${toDate}'`);
    if (sessionIds) {
      conditions.push(
        `(${sessionIds.map((id) => `id = '${id}'`).join(' || ')})`
      );
    }

    const filter = conditions.join(' && ');

    const result = await pb
      .collection('workout_sessions')
      .getList(page + 1, pageSize, {
        filter,
        sort: '-started_at',
      });

    const rows = (result.items ?? []) as unknown as SessionRow[];

    // Enrich each session with exercise + set counts and template name
    const enriched: SessionListItem[] = await Promise.all(
      rows.map(async (row) => {
        const sets = await pb.collection('exercise_sets').getFullList({
          filter: `workout_session_id = '${row.id}'`,
          fields: 'id,exercise_id',
        });

        const setList = (sets ?? []) as unknown as Array<{
          id: string;
          exercise_id: string;
        }>;
        const uniqueExercises = [...new Set(setList.map((s) => s.exercise_id))];

        // Fetch template name if the session references a template
        let templateName: string | undefined;
        if (row.workout_template_id) {
          try {
            const tmpl = await pb
              .collection('workout_templates')
              .getOne(row.workout_template_id, {
                fields: 'name',
              });
            templateName = (tmpl as unknown as { name: string }).name;
          } catch {
            // template might have been deleted; silently skip
          }
        }

        return {
          id: row.id,
          workout_template_id: row.workout_template_id,
          status: row.status,
          started_at: row.started_at,
          completed_at: row.completed_at,
          duration_minutes: row.duration_minutes,
          notes: row.notes,
          templateName,
          exerciseCount: uniqueExercises.length,
          totalSets: setList.length,
        };
      })
    );

    return { data: enriched, count: result.totalItems };
  } catch (err: any) {
    throw new Error(err.message ?? 'Failed to list sessions');
  }
}

// ─── Update duration ─────────────────────────────────────────────────────

export async function updateSessionDuration(
  sessionId: string,
  durationMinutes: number
): Promise<void> {
  try {
    await pb.collection('workout_sessions').update(sessionId, {
      duration_minutes: durationMinutes,
    });
  } catch (err: any) {
    throw new Error(err.message ?? 'Failed to update session duration');
  }
}
