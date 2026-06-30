import { supabase } from "../client";

// ─── Row Types ───────────────────────────────────────────────────────────

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
  logged_at: string;
}

/** A set as logged by the user (camelCase, before DB insert) */
export interface LogSetInput {
  exerciseId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number | null;
  rir?: number | null;
  isWarmup?: boolean;
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

interface TemplateExerciseJoined {
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

// ─── Session detail (session + sets + exercise names) ────────────────────

export interface SessionDetail extends SessionRow {
  sets: ExerciseSetRow[];
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
  options?: { workoutTemplateId?: string; programBlockId?: string },
): Promise<CreateSessionResult> {
  // Insert the session row
  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      workout_template_id: options?.workoutTemplateId ?? null,
      program_block_id: options?.programBlockId ?? null,
      status: "in_progress",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!session) throw new Error("Failed to create session");

  const sessionRow = session as SessionRow;

  // If a template was specified, fetch its exercises
  let exercises: SessionExercise[] = [];
  if (options?.workoutTemplateId) {
    exercises = await fetchTemplateExercises(options.workoutTemplateId);
  }

  return { session: sessionRow, exercises };
}

/**
 * Fetch exercises from a workout template, enriched with exercise names.
 */
async function fetchTemplateExercises(templateId: string): Promise<SessionExercise[]> {
  // Step 1: get template exercise rows
  const { data: rows, error } = await supabase
    .from("workout_template_exercises")
    .select("*")
    .eq("workout_template_id", templateId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  const templateExercises = (rows ?? []) as TemplateExerciseJoined[];

  if (templateExercises.length === 0) return [];

  // Step 2: fetch exercise names
  const exerciseIds = templateExercises.map((r) => r.exercise_id);
  const { data: exercises, error: exError } = await supabase
    .from("exercises")
    .select("id, name")
    .in("id", exerciseIds);

  if (exError) throw new Error(exError.message);

  const nameMap = new Map(
    (exercises ?? []).map((ex: { id: string; name: string }) => [ex.id, ex.name]),
  );

  return templateExercises.map((r) => ({
    exerciseId: r.exercise_id,
    exerciseName: nameMap.get(r.exercise_id) ?? "Unknown Exercise",
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
  input: LogSetInput,
): Promise<ExerciseSetRow> {
  const { data, error } = await supabase
    .from("exercise_sets")
    .insert({
      workout_session_id: sessionId,
      exercise_id: input.exerciseId,
      set_number: input.setNumber,
      weight_kg: input.weightKg,
      reps: input.reps,
      rpe: input.rpe ?? null,
      rir: input.rir ?? null,
      is_warmup: input.isWarmup ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to log set");

  return data as ExerciseSetRow;
}

// ─── Complete a Session ──────────────────────────────────────────────────

export interface CompleteSessionInput {
  notes?: string | null;
}

export async function completeSession(
  sessionId: string,
  input?: CompleteSessionInput & { startedAt?: string },
): Promise<SessionRow> {
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    status: "completed",
    completed_at: now,
    notes: input?.notes ?? null,
  };

  // Compute duration in minutes if we have a startedAt
  if (input?.startedAt) {
    const diffMs = new Date(now).getTime() - new Date(input.startedAt).getTime();
    updateData.duration_minutes = Math.round(diffMs / 60000);
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .update(updateData)
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Session not found");

  return data as SessionRow;
}

// ─── Cancel a Session ────────────────────────────────────────────────────

export async function cancelSession(sessionId: string): Promise<SessionRow> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Session not found");

  return data as SessionRow;
}

// ─── Get Session ─────────────────────────────────────────────────────────

export async function getSession(id: string): Promise<SessionDetail | null> {
  const { data: session, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  const { data: sets, error: setsError } = await supabase
    .from("exercise_sets")
    .select("*")
    .eq("workout_session_id", id)
    .order("set_number", { ascending: true });

  if (setsError) throw new Error(setsError.message);

  return {
    ...(session as SessionRow),
    sets: (sets ?? []) as ExerciseSetRow[],
  };
}

// ─── Get Session with Exercise Names ──────────────────────────────────────

export interface ExerciseNameMap {
  [exerciseId: string]: string;
}

export interface SessionDetailWithExercises extends SessionDetail {
  exerciseNames: ExerciseNameMap;
  groupedSets: Record<string, ExerciseSetRow[]>;
}

/**
 * Get a session with full set data, enriched with exercise names and
 * sets grouped by exercise.
 */
export async function getSessionDetail(
  id: string,
): Promise<SessionDetailWithExercises | null> {
  const session = await getSession(id);
  if (!session) return null;

  // Collect unique exercise IDs
  const exerciseIds = [...new Set(session.sets.map((s) => s.exercise_id))];

  // Fetch exercise names
  const { data: exercises, error: exError } = await supabase
    .from("exercises")
    .select("id, name")
    .in("id", exerciseIds);

  if (exError) throw new Error(exError.message);

  const exerciseNames: ExerciseNameMap = {};
  for (const ex of exercises ?? []) {
    exerciseNames[ex.id] = ex.name;
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
  };
}

// ─── List Sessions (for history) ──────────────────────────────────────────

export interface SessionListItem {
  id: string;
  workout_template_id: string | null;
  status: "in_progress" | "completed" | "cancelled";
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
 * When `exerciseId` is provided, only sessions containing that exercise are
 * returned (via a join to exercise_sets).
 */
export async function listSessions(
  userId: string,
  options?: ListSessionsOptions,
): Promise<{ data: SessionListItem[]; count: number }> {
  const {
    status = "completed",
    exerciseId,
    fromDate,
    toDate,
    page = 0,
    pageSize = 20,
  } = options ?? {};

  const from = page * pageSize;
  const to = from + pageSize - 1;

  // Build the base query for count
  let countQuery = supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (status) countQuery = countQuery.eq("status", status);
  if (fromDate) countQuery = countQuery.gte("started_at", fromDate);
  if (toDate) countQuery = countQuery.lte("started_at", toDate);

  // If filtering by exercise, we need to join through exercise_sets
  let sessionIds: string[] | undefined;
  if (exerciseId) {
    const { data: setSessions, error: setError } = await supabase
      .from("exercise_sets")
      .select("workout_session_id")
      .eq("exercise_id", exerciseId);

    if (setError) throw new Error(setError.message);

    const ids = [
      ...new Set((setSessions ?? []).map((s) => s.workout_session_id)),
    ];
    if (ids.length === 0) return { data: [], count: 0 };

    sessionIds = ids;
    countQuery = countQuery.in("id", ids);
  }

  const { count: totalCount, error: countError } = await countQuery;
  if (countError) throw new Error(countError.message);

  // Fetch the page data
  let dataQuery = supabase
    .from("workout_sessions")
    .select("*, workout_templates!left(name)")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .range(from, to);

  if (status) dataQuery = dataQuery.eq("status", status);
  if (fromDate) dataQuery = dataQuery.gte("started_at", fromDate);
  if (toDate) dataQuery = dataQuery.lte("started_at", toDate);
  if (sessionIds) dataQuery = dataQuery.in("id", sessionIds);

  const { data, error } = await dataQuery;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as (SessionRow & {
    workout_templates: { name: string } | null;
  })[];

  // Enrich each session with exercise + set counts
  const enriched: SessionListItem[] = await Promise.all(
    rows.map(async (row) => {
      const { count: setsCount, error: setsError } = await supabase
        .from("exercise_sets")
        .select("id", { count: "exact", head: true })
        .eq("workout_session_id", row.id);

      if (setsError) throw new Error(setsError.message);

      // Count distinct exercises in this session
      const { data: exerciseData, error: exError } = await supabase
        .from("exercise_sets")
        .select("exercise_id")
        .eq("workout_session_id", row.id);

      if (exError) throw new Error(exError.message);

      const uniqueExercises = [
        ...new Set((exerciseData ?? []).map((e) => e.exercise_id)),
      ];

      return {
        id: row.id,
        workout_template_id: row.workout_template_id,
        status: row.status,
        started_at: row.started_at,
        completed_at: row.completed_at,
        duration_minutes: row.duration_minutes,
        notes: row.notes,
        templateName: row.workout_templates?.name ?? undefined,
        exerciseCount: uniqueExercises.length,
        totalSets: setsCount ?? 0,
      };
    }),
  );

  return { data: enriched, count: totalCount ?? 0 };
}

// ─── Update duration ─────────────────────────────────────────────────────

export async function updateSessionDuration(
  sessionId: string,
  durationMinutes: number,
): Promise<void> {
  const { error } = await supabase
    .from("workout_sessions")
    .update({ duration_minutes: durationMinutes })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
}
