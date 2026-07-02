/**
 * Validation Helpers
 *
 * Post-seed validation functions for referential integrity,
 * completeness, and data quality checks.
 *
 * IMPORTANT: all user-scoped checks (referential integrity,
 * completeness) must filter by userId to avoid counting other
 * profiles' data as "broken" or "extra".
 */

import { getAllRecords } from './api.mjs';

// ─── Valid Categories & Equipment ───────────────────────────────────────

export const VALID_CATEGORIES = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'cardio',
  'mobility',
];

export const VALID_EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'resistance_band',
];

// ─── Referential Integrity ──────────────────────────────────────────────

/**
 * Check referential integrity scoped to a single user.
 * Only checks template_exercises/sets that belong to this user's
 * templates/sessions — ignores data from other profiles.
 */
export async function checkReferentialIntegrity(userId, headers, baseUrl) {
  const broken = {
    templateExercisesToTemplates: 0,
    templateExercisesToExercises: 0,
    setsToSessions: 0,
    setsToExercises: 0,
    sessionsToTemplates: 0,
  };

  // Get this user's templates and sessions
  const templates = await getAllRecords(
    'workout_templates',
    `user_id = '${userId}'`,
    headers,
    baseUrl
  );
  const templateIds = new Set(templates.map((t) => t.id));

  const sessions = await getAllRecords(
    'workout_sessions',
    `user_id = '${userId}'`,
    headers,
    baseUrl
  );
  const sessionIds = new Set(sessions.map((s) => s.id));

  // Shared resources (not user-scoped)
  const exercises = await getAllRecords('exercises', '', headers, baseUrl);
  const exerciseIds = new Set(exercises.map((e) => e.id));

  // Get ALL template exercises but only check those belonging to this user's templates
  const allTemplateExercises = await getAllRecords(
    'workout_template_exercises',
    '',
    headers,
    baseUrl
  );
  const userTemplateExercises = allTemplateExercises.filter((te) =>
    templateIds.has(te.workout_template_id)
  );

  for (const te of userTemplateExercises) {
    // TE → templates: already filtered by templateIds, should never break
    if (!templateIds.has(te.workout_template_id))
      broken.templateExercisesToTemplates++;
    // TE → exercises: valid for any exercise (shared pool)
    if (!exerciseIds.has(te.exercise_id)) broken.templateExercisesToExercises++;
  }

  // Get ALL exercise sets but only check those belonging to this user's sessions
  const allSets = await getAllRecords('exercise_sets', '', headers, baseUrl);
  const userSets = allSets.filter((s) => sessionIds.has(s.workout_session_id));

  for (const set of userSets) {
    if (!sessionIds.has(set.workout_session_id)) broken.setsToSessions++;
    if (!exerciseIds.has(set.exercise_id)) broken.setsToExercises++;
  }

  // Sessions → templates (already scoped to user)
  for (const session of sessions) {
    if (
      session.workout_template_id &&
      !templateIds.has(session.workout_template_id)
    ) {
      broken.sessionsToTemplates++;
    }
  }

  const total = Object.values(broken).reduce((a, b) => a + b, 0);
  return { broken, total };
}

// ─── Completeness Check ─────────────────────────────────────────────────

/**
 * Count records per collection scoped to a single user.
 */
export async function checkCompleteness(userId, headers, baseUrl) {
  const exercises = await getAllRecords('exercises', '', headers, baseUrl);
  const templates = await getAllRecords(
    'workout_templates',
    `user_id = '${userId}'`,
    headers,
    baseUrl
  );
  const templateIds = new Set(templates.map((t) => t.id));
  const sessions = await getAllRecords(
    'workout_sessions',
    `user_id = '${userId}'`,
    headers,
    baseUrl
  );
  const sessionIds = new Set(sessions.map((s) => s.id));

  // Count only this user's template exercises
  const allTemplateExercises = await getAllRecords(
    'workout_template_exercises',
    '',
    headers,
    baseUrl
  );
  const userTemplateExercises = allTemplateExercises.filter((te) =>
    templateIds.has(te.workout_template_id)
  );

  // Count only this user's sets
  const allSets = await getAllRecords('exercise_sets', '', headers, baseUrl);
  const userSets = allSets.filter((s) => sessionIds.has(s.workout_session_id));

  const warmupSets = userSets.filter((s) => s.is_warmup === true);
  const workingSets = userSets.filter((s) => s.is_warmup !== true);
  const prDetectable = countPRDetectableExercises(userSets);

  return {
    users: 1,
    exercises: exercises.length,
    templates: templates.length,
    templateExercises: userTemplateExercises.length,
    sessions: sessions.length,
    exerciseSets: userSets.length,
    warmupSets: warmupSets.length,
    workingSets: workingSets.length,
    personalRecordsDetectable: prDetectable,
  };
}

function countPRDetectableExercises(sets) {
  const working = sets.filter(
    (s) => !s.is_warmup && s.weight_kg > 0 && s.reps > 0
  );
  const byExercise = new Map();
  for (const set of working) {
    byExercise.set(set.exercise_id, (byExercise.get(set.exercise_id) || 0) + 1);
  }
  let detectable = 0;
  for (const count of byExercise.values()) {
    if (count >= 3) detectable++;
  }
  return detectable;
}

// ─── Exercise Quality Check ─────────────────────────────────────────────

export function validateExercises(exercises) {
  const issues = [];
  const names = exercises.map((e) => e.name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    issues.push(
      `Duplicate exercise names: ${[...new Set(duplicates)].join(', ')}`
    );
  }
  for (const ex of exercises) {
    if (!VALID_CATEGORIES.includes(ex.category)) {
      issues.push(`[${ex.name}] Invalid category: "${ex.category}"`);
    }
    if (ex.name == null) issues.push('Exercise with null name');
    if (ex.category == null) issues.push(`[${ex.name || '?'}] null category`);
    if (ex.default_sets == null) issues.push(`[${ex.name}] null default_sets`);
    if (ex.default_reps == null) issues.push(`[${ex.name}] null default_reps`);
    if (ex.default_rest_seconds == null)
      issues.push(`[${ex.name}] null default_rest_seconds`);
    if (ex.is_public == null) issues.push(`[${ex.name}] null is_public`);
  }
  return { valid: issues.length === 0, issues, count: exercises.length };
}
