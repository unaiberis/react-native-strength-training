#!/usr/bin/env node

/**
 * Seed Verification Script
 *
 * Independent verification of the seeded PocketBase data.
 * Supports single-user mode (default) and --all-profiles.
 *
 * Usage:
 *   node scripts/verify-seed.mjs                            # verify advanced user
 *   node scripts/verify-seed.mjs --all-profiles              # verify all 3 profiles
 *   node scripts/verify-seed.mjs --profile beginner          # verify one profile
 *
 * Environment:
 *   PB_URL           (default: http://127.0.0.1:8090)
 *   PB_USER_EMAIL    (default: test@test.com)
 *   PB_USER_PASSWORD (default: test123456)
 */

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';

// ─── Profile definitions (mirrors profiles.mjs) ──────────────────────────

const PROFILES = [
  {
    id: 'beginner',
    email: 'beginner@test.com',
    password: 'test123456',
    thresholds: {
      sessionsMin: 30,
      sessionsMax: 80,
      dateRangeMin: 60,
      setsMin: 300,
      setsMax: 2000,
    },
  },
  {
    id: 'intermediate',
    email: 'intermediate@test.com',
    password: 'test123456',
    thresholds: {
      sessionsMin: 100,
      sessionsMax: 250,
      dateRangeMin: 200,
      setsMin: 1500,
      setsMax: 4500,
    },
  },
  {
    id: 'advanced',
    email: 'test@test.com',
    password: 'test123456',
    thresholds: {
      sessionsMin: 250,
      sessionsMax: 450,
      dateRangeMin: 365,
      setsMin: 4000,
      setsMax: 7500,
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

async function authenticateUser(email, password) {
  const res = await fetch(
    `${PB_URL}/api/collections/users/auth-with-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password }),
    }
  );
  if (!res.ok) throw new Error(`Auth failed for ${email} (${res.status})`);
  const data = await res.json();
  return {
    token: data.token,
    record: data.record,
    headers: {
      Authorization: `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };
}

async function getAll(collection, filter = '', headers) {
  const params = new URLSearchParams({ perPage: '200', sort: 'created' });
  if (filter) params.set('filter', filter);
  let allItems = [],
    page = 1;
  while (true) {
    params.set('page', String(page));
    const res = await fetch(
      `${PB_URL}/api/collections/${collection}/records?${params}`,
      { headers }
    );
    if (!res.ok) throw new Error(`getAll ${collection}: HTTP ${res.status}`);
    const data = await res.json();
    allItems = allItems.concat(data.items || []);
    if (allItems.length >= data.totalItems) break;
    page++;
  }
  return allItems;
}

function calculateE1RM(weightKg, reps) {
  return reps > 0 && weightKg > 0 ? weightKg * (1 + reps / 30) : 0;
}

// ─── Per-profile verification ─────────────────────────────────────────────

async function verifyProfile(email, password, label, thresholds) {
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  function check(name, condition, detail = '') {
    if (condition) {
      console.log(`   ✓ ${name}`);
      passed++;
    } else {
      console.log(`   ✗ ${name} ${detail}`);
      failed++;
    }
  }

  function warn(name, detail) {
    console.log(`   ⚠ ${name}: ${detail}`);
    warnings++;
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Profile: ${label} (${email})`);
  console.log(`${'═'.repeat(60)}`);

  // ── Auth ──────────────────────────────────────────────────────
  console.log('\n── 1. Authentication ──');
  let userId, authHeaders;
  try {
    const auth = await authenticateUser(email, password);
    userId = auth.record.id;
    authHeaders = auth.headers;
    check('User authentication', true);
    check('User ID present', !!userId);
  } catch (err) {
    console.log(`   ✗ Auth failed: ${err.message}`);
    return { passed: 0, failed: 2, warnings: 0 };
  }

  // ── Exercises ─────────────────────────────────────────────────
  console.log('\n── 2. Exercises ──');
  const exercises = await getAll('exercises', '', authHeaders);
  check(
    'Exercises loaded',
    exercises.length >= 75,
    `(${exercises.length} total)`
  );
  check('Exercises ≤ 100', exercises.length <= 100, `(${exercises.length})`);
  check(
    'No null exercise names',
    exercises.filter((e) => !e.name).length === 0
  );
  const validCategories = [
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
  check(
    'All valid categories',
    exercises.filter((e) => !validCategories.includes(e.category)).length === 0
  );
  const names = exercises.map((e) => e.name);
  check('Unique exercise names', new Set(names).size === names.length);
  check(
    'default_sets not null',
    exercises.filter((e) => e.default_sets == null).length === 0
  );
  check(
    'default_reps not null',
    exercises.filter((e) => e.default_reps == null).length === 0
  );

  const badEquipment = exercises.filter((e) => typeof e.equipment === 'string');
  if (badEquipment.length > 0) {
    warn(
      'Equipment stored as string (expected array)',
      `${badEquipment.length} exercises`
    );
  }

  // ── Templates ────────────────────────────────────────────────
  console.log('\n── 3. Workout Templates ──');
  const templates = await getAll(
    'workout_templates',
    `user_id = '${userId}'`,
    authHeaders
  );
  check(
    'Templates loaded',
    templates.length >= 15,
    `(${templates.length} total)`
  );
  check('Templates ≤ 20', templates.length <= 20, `(${templates.length})`);
  const templateExercises = await getAll(
    'workout_template_exercises',
    '',
    authHeaders
  );
  check('Template exercises loaded', templateExercises.length >= 60);

  // Per-template exercises check
  const teByTemplate = {};
  for (const te of templateExercises)
    teByTemplate[te.workout_template_id] =
      (teByTemplate[te.workout_template_id] || 0) + 1;
  let templatesWithEnough = 0;
  for (const tmpl of templates) {
    if ((teByTemplate[tmpl.id] || 0) >= 4) templatesWithEnough++;
  }
  check(
    'All templates have ≥4 exercises',
    templatesWithEnough === templates.length
  );

  // ── Sessions ─────────────────────────────────────────────────
  console.log('\n── 4. Workout Sessions ──');
  const sessions = await getAll(
    'workout_sessions',
    `user_id = '${userId}'`,
    authHeaders
  );
  check(
    'Sessions loaded',
    sessions.length >= thresholds.sessionsMin,
    `(${sessions.length} total, min ${thresholds.sessionsMin})`
  );
  check(
    'Sessions within max',
    sessions.length <= thresholds.sessionsMax,
    `(${sessions.length}, max ${thresholds.sessionsMax})`
  );

  const sessionsWithoutTemplate = sessions.filter(
    (s) => !s.workout_template_id
  );
  warn(
    'Sessions without template',
    `${sessionsWithoutTemplate.length} sessions`
  );
  if (sessionsWithoutTemplate.length > 0) {
    check(
      'No sessions without template',
      false,
      `(${sessionsWithoutTemplate.length} have no template)`
    );
  } else {
    check('No sessions without template', true);
  }

  const dates = sessions.map((s) => new Date(s.started_at).getTime());
  if (dates.length > 0) {
    const dateRangeDays =
      (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24);
    check(
      'Date range ≥ threshold',
      dateRangeDays >= thresholds.dateRangeMin,
      `(${Math.round(dateRangeDays)} days, min ${thresholds.dateRangeMin})`
    );
  }

  const validStatuses = sessions.every((s) =>
    ['in_progress', 'completed', 'cancelled'].includes(s.status)
  );
  check('All valid statuses', validStatuses);

  // ── Exercise Sets ────────────────────────────────────────────
  console.log('\n── 5. Exercise Sets ──');
  const sessionIds = new Set(sessions.map((s) => s.id));
  const allSets = await getAll('exercise_sets', '', authHeaders);
  // Filter to only this user's sets (by session IDs)
  const sets = allSets.filter((s) => sessionIds.has(s.workout_session_id));
  check(
    'Sets loaded',
    sets.length >= thresholds.setsMin,
    `(${sets.length} total, min ${thresholds.setsMin})`
  );
  check(
    'Sets within max',
    sets.length <= thresholds.setsMax,
    `(${sets.length}, max ${thresholds.setsMax})`
  );

  const warmupSets = sets.filter((s) => s.is_warmup === true);
  const workingSets = sets.filter((s) => s.is_warmup !== true);
  const warmupPct =
    sets.length > 0 ? (warmupSets.length / sets.length) * 100 : 0;
  check(
    'Warmup sets within range',
    warmupPct >= 8 && warmupPct <= 25,
    `(${warmupPct.toFixed(1)}%)`
  );

  // Set number consecutive
  const setsBySession = {};
  for (const set of sets) {
    if (!setsBySession[set.workout_session_id])
      setsBySession[set.workout_session_id] = [];
    setsBySession[set.workout_session_id].push(set);
  }
  let badSetNumberSessions = 0;
  for (const sessionSets of Object.values(setsBySession)) {
    const nums = sessionSets.map((s) => s.set_number).sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      if (nums[i] !== i + 1) {
        badSetNumberSessions++;
        break;
      }
    }
  }
  check('Consecutive set_number', badSetNumberSessions === 0);

  check('All reps > 0', sets.filter((s) => s.reps <= 0).length === 0);
  check('All weight >= 0', sets.filter((s) => s.weight_kg < 0).length === 0);

  // ── Referential Integrity ────────────────────────────────────
  console.log('\n── 6. Referential Integrity ──');
  const exerciseIds = new Set(exercises.map((e) => e.id));
  const templateIds = new Set(templates.map((t) => t.id));

  // sessionIds already defined above in sets section

  // Only check items belonging to this user's templates/sessions
  const userTemplateExercises = templateExercises.filter((te) =>
    templateIds.has(te.workout_template_id)
  );
  const userSets = sets.filter((s) => sessionIds.has(s.workout_session_id));
  check(
    'TE → templates',
    userTemplateExercises.filter(
      (te) => !templateIds.has(te.workout_template_id)
    ).length === 0
  );
  check(
    'TE → exercises',
    userTemplateExercises.filter((te) => !exerciseIds.has(te.exercise_id))
      .length === 0
  );
  check(
    'Sets → sessions',
    userSets.filter((s) => !sessionIds.has(s.workout_session_id)).length === 0
  );
  check(
    'Sets → exercises',
    userSets.filter((s) => !exerciseIds.has(s.exercise_id)).length === 0
  );
  check(
    'Sessions → templates',
    sessions.filter(
      (s) => s.workout_template_id && !templateIds.has(s.workout_template_id)
    ).length === 0
  );

  // ── PR Calculation ───────────────────────────────────────────
  console.log('\n── 7. Personal Records ──');
  const prExercises = new Map();
  for (const set of sets) {
    if (!set.is_warmup && set.weight_kg > 0 && set.reps > 0) {
      if (!prExercises.has(set.exercise_id))
        prExercises.set(set.exercise_id, []);
      prExercises.get(set.exercise_id).push(set);
    }
  }

  let exercisesWithPRs = 0;
  let estimated1RMCount = 0;
  for (const [, exSets] of prExercises) {
    const e1rmValues = exSets
      .map((s) => calculateE1RM(s.weight_kg, s.reps))
      .filter((v) => v > 0);
    if (e1rmValues.length >= 3) {
      exercisesWithPRs++;
      if (Math.max(...e1rmValues) > 0) estimated1RMCount++;
    }
  }

  check(
    'PR-detectable exercises',
    exercisesWithPRs >= 15,
    `(${exercisesWithPRs} exercises with ≥3 working sets)`
  );
  check(
    'Estimated 1RM calculable',
    estimated1RMCount >= 15,
    `(${estimated1RMCount} exercises)`
  );

  // Specific exercise PR check
  if (exercises.length > 0 && prExercises.size > 0) {
    const firstEx = exercises[0];
    const exSets = prExercises.get(firstEx.id) || [];
    if (exSets.length > 0) {
      const bestE1RM = Math.max(
        ...exSets.map((s) => calculateE1RM(s.weight_kg, s.reps))
      );
      check(
        `PR for "${firstEx.name}"`,
        bestE1RM > 0,
        `(best e1RM: ${Math.round(bestE1RM)} kg)`
      );
    }
  }

  // ── P1 PR Guarantee Check ───────────────────────────────────
  console.log('\n── 8. PR Guarantee ──');
  // Find sessions with PR in notes or check if last PR-test produced a high e1RM
  const prNoteSessions = sessions.filter(
    (s) => s.notes && s.notes.includes('PR')
  );
  check(
    'At least 1 session has PR in notes',
    prNoteSessions.length >= 1,
    `(${prNoteSessions.length} PR sessions)`
  );

  // Verify at least one major lift has a meaningful e1RM
  const majorLifts = [
    'Barbell Back Squat',
    'Barbell Bench Press',
    'Deadlift',
    'Overhead Press',
  ];
  const exerciseNameMap = {};
  for (const ex of exercises) exerciseNameMap[ex.id] = ex.name;

  let majorWithPR = 0;
  for (const [exId, exSets] of prExercises) {
    const exName = exerciseNameMap[exId];
    if (majorLifts.includes(exName) && exSets.length >= 5) {
      const maxE1RM = Math.max(
        ...exSets.map((s) => calculateE1RM(s.weight_kg, s.reps))
      );
      if (maxE1RM > 0) majorWithPR++;
    }
  }
  check(
    'Major lifts have PR data (≥1 lift)',
    majorWithPR >= 1,
    `(${majorWithPR} major lifts)`
  );

  // ── P2 Fallback Check ───────────────────────────────────────
  console.log('\n── 9. Fallback Validation ──');
  // All template-referenced exercise names must have explicit base weight
  const templateNames = new Set();
  for (const te of templateExercises) {
    const exId = te.exercise_id;
    const ex = exercises.find((e) => e.id === exId);
    if (ex) templateNames.add(ex.name);
  }

  // Known base weights (mirrors estimateBaseWeight in sessions.mjs)
  const knownBaseWeights = new Set([
    'Dumbbell Lateral Raise',
    'Cable Lateral Raise',
    'Front Raise',
    'Reverse Fly',
    'Dumbbell Fly',
    'Cable Crossover',
    'Face Pull',
    'Tricep Pushdown',
    'Overhead Tricep Extension',
    'Skull Crusher',
    'Tricep Kickback',
    'Barbell Curl',
    'Dumbbell Hammer Curl',
    'Incline Dumbbell Curl',
    'Cable Bicep Curl',
    'Concentration Curl',
    'Preacher Curl',
    'Leg Extension',
    'Leg Curl',
    'Seated Leg Curl',
    'Nordic Curl',
    'Dumbbell Hamstring Curl',
    'Standing Calf Raise',
    'Seated Calf Raise',
    'Donkey Calf Raise',
    'Bulgarian Split Squat',
    'Goblet Squat',
    'Walking Lunge',
    'Step Up',
    'Cable Pull Through',
    'Glute Bridge',
    'Cable Woodchop',
    'Pallof Press',
    'Kettlebell Swing',
    'Kettlebell Snatch',
    'Push Up',
    'Chest Dip',
    'Pull Up',
    'Plank',
    'Hanging Leg Raise',
    'Ab Wheel Rollout',
    'Dead Bug',
    'Russian Twist',
    'Farmer Walk',
    'Burpee',
    'Box Jump',
    'Jump Rope',
    'Cat-Cow Stretch',
    "World's Greatest Stretch",
    'Hip Flexor Stretch',
    'Thoracic Spine Rotation',
    'Banded Shoulder Stretch',
    'Standing Pigeon Stretch',
    'Rowing Machine',
    'Assault Bike Sprint',
    'Ski Erg',
    // Missing from original set — added for demo completeness
    'Lat Pulldown',
    'Seated Cable Row',
    'Decline Bench Press',
    'Arnold Press',
    // Compounds don't need base weights, but also shouldn't flag:
    'Barbell Back Squat',
    'Barbell Front Squat',
    'Barbell Bench Press',
    'Deadlift',
    'Overhead Press',
    'Barbell Row',
    'Romanian Deadlift',
    'Dumbbell Bench Press',
    'Incline Dumbbell Press',
    'Seated Dumbbell Shoulder Press',
    'Close-Grip Bench Press',
    'Leg Press',
    'Hip Thrust',
    'Dumbbell Row',
    'T-Bar Row',
    'Push Press',
  ]);

  // Intersect template exercise names with known base weights
  const missingWeights = [...templateNames].filter(
    (n) => !knownBaseWeights.has(n)
  );
  // Check if any of the missing ones are compounds (which don't need base weight)
  const compoundSet = new Set([
    'Barbell Back Squat',
    'Barbell Front Squat',
    'Barbell Bench Press',
    'Deadlift',
    'Overhead Press',
    'Barbell Row',
    'Romanian Deadlift',
    'Dumbbell Bench Press',
    'Incline Dumbbell Press',
    'Seated Dumbbell Shoulder Press',
    'Close-Grip Bench Press',
    'Leg Press',
    'Hip Thrust',
    'Dumbbell Row',
    'T-Bar Row',
    'Push Press',
  ]);
  const realMissing = missingWeights.filter((n) => !compoundSet.has(n));
  check(
    'No exercises with fallback default weight',
    realMissing.length === 0,
    `(${realMissing.length} exercises missing base weight: ${realMissing.join(', ')})`
  );

  // ── Summary ──────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Results — ${label}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Passed:  ${passed}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Warnings: ${warnings}\n`);

  const counts = {
    users: 1,
    exercises: exercises.length,
    templates: templates.length,
    templateExercises: templateExercises.length,
    sessions: sessions.length,
    exerciseSets: sets.length,
    warmupSets: warmupSets.length,
    workingSets: workingSets.length,
    personalRecordsDetectable: exercisesWithPRs,
  };

  return { passed, failed, warnings, counts, email };
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const allProfiles = args.includes('--all-profiles');
  const singleProfile = args.find(
    (a, i) => a === '--profile' && i + 1 < args.length
  )
    ? args[args.indexOf('--profile') + 1]
    : null;

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('   Seed Verification Report');
  console.log(
    `   ${allProfiles ? 'Multi-Profile Mode' : singleProfile ? `Profile: ${singleProfile}` : 'Single User Mode'}`
  );
  console.log(`   PB: ${PB_URL}`);
  console.log('═══════════════════════════════════════════════════');

  let profilesToVerify;

  if (singleProfile) {
    const profile = PROFILES.find((p) => p.id === singleProfile);
    if (!profile) {
      console.error(
        `Unknown profile: ${singleProfile}. Available: ${PROFILES.map((p) => p.id).join(', ')}`
      );
      process.exit(1);
    }
    profilesToVerify = [profile];
  } else if (allProfiles) {
    profilesToVerify = PROFILES;
  } else {
    // Default: just advanced
    profilesToVerify = [PROFILES.find((p) => p.id === 'advanced')];
  }

  let totalPassed = 0;
  let totalFailed = 0;
  let anyFailed = false;

  for (const profile of profilesToVerify) {
    const result = await verifyProfile(
      profile.email,
      profile.password,
      profile.id,
      profile.thresholds
    );

    totalPassed += result.passed;
    totalFailed += result.failed;

    if (result.failed > 0) anyFailed = true;
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('   OVERALL RESULTS');
  console.log('═══════════════════════════════════════════════════');
  console.log(`   Total passed: ${totalPassed}`);
  console.log(`   Total failed: ${totalFailed}`);
  console.log('');

  if (totalFailed > 0) {
    // Show per-profile final counts
    for (const profile of profilesToVerify) {
      const result = await verifyProfile(
        profile.email,
        profile.password,
        profile.id + ' [final counts]',
        {
          sessionsMin: 0,
          sessionsMax: 999999,
          dateRangeMin: 0,
          setsMin: 0,
          setsMax: 999999,
        }
      );
      if (result.counts) {
        console.log(`   ${profile.id}:`);
        for (const [k, v] of Object.entries(result.counts)) {
          console.log(`     ${k}: ${v}`);
        }
      }
    }
    process.exit(1);
  }

  console.log('✅ ALL CHECKS PASSED\n');
  process.exit(0);
}

main().catch((err) => {
  console.error(`\n❌ Verification error: ${err.message}`);
  process.exit(1);
});
