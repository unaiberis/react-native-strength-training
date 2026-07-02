#!/usr/bin/env node

/**
 * Data Inspector — PocketBase Data Viewer
 *
 * Usage:
 *   node scripts/inspect-data.mjs <view> [options]
 *
 * Views:
 *   exercises          List all exercises with categories and equipment
 *   templates          List all templates with their exercises
 *   sessions           List recent sessions with stats
 *   session <id>       Show detailed session with sets
 *   stats              Show aggregate statistics per user
 *   prs                Show personal records per exercise
 *   broken-fks         Check referential integrity
 *   all                Show everything (default)
 *
 * Options:
 *   --user <email>     User email (default: test@test.com)
 *   --limit <n>        Limit results (default: 20)
 *   --pb-url <url>     PocketBase URL (default: http://127.0.0.1:8090)
 *   --json             Output as JSON instead of formatted table
 *
 * Examples:
 *   node scripts/inspect-data.mjs exercises
 *   node scripts/inspect-data.mjs sessions --limit 5
 *   node scripts/inspect-data.mjs stats
 *   node scripts/inspect-data.mjs prs --json
 *   node scripts/inspect-data.mjs broken-fks
 */

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const DEMO_EMAIL = process.env.PB_USER_EMAIL || 'test@test.com';
const DEMO_PASSWORD = process.env.PB_USER_PASSWORD || 'test123456';

// ─── Auth ────────────────────────────────────────────────────────────────

async function authenticate() {
  const res = await fetch(
    `${PB_URL}/api/collections/users/auth-with-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: DEMO_EMAIL, password: DEMO_PASSWORD }),
    }
  );
  if (!res.ok) {
    // Try admin auth
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'aitor@musikak.com';
    const adminPass = process.env.PB_ADMIN_PASS || 'entrenamentua2026';
    const adminRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: adminEmail, password: adminPass }),
    });
    if (!adminRes.ok) {
      throw new Error(`Auth failed (${res.status} / ${adminRes.status})`);
    }
    const data = await adminRes.json();
    return {
      token: data.token,
      headers: {
        Authorization: `Bearer ${data.token}`,
        'Content-Type': 'application/json',
      },
      isAdmin: true,
    };
  }
  const data = await res.json();
  return {
    token: data.token,
    record: data.record,
    headers: {
      Authorization: `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
    isAdmin: false,
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

// ─── Formatters ──────────────────────────────────────────────────────────

function pad(s, n) {
  return String(s).padEnd(n);
}

function separator(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(60)}`);
}

// ─── Views ───────────────────────────────────────────────────────────────

async function viewExercises(headers, options) {
  const exercises = await getAll('exercises', '', headers);

  if (options.json) {
    console.log(JSON.stringify(exercises, null, 2));
    return;
  }

  separator(`EXERCISES (${exercises.length} total)`);
  console.log(
    ` ${pad('Name', 32)} ${pad('Category', 14)} ${pad('Equipment', 22)} Sets`
  );
  console.log(
    ` ${'-'.repeat(32)} ${'-'.repeat(14)} ${'-'.repeat(22)} ${'-'.repeat(4)}`
  );

  const limit = options.limit || exercises.length;
  for (const ex of exercises.slice(0, limit)) {
    const equip = Array.isArray(ex.equipment)
      ? ex.equipment.join(', ')
      : ex.equipment || '';
    console.log(
      ` ${pad(ex.name, 32)} ${pad(ex.category, 14)} ${pad(equip, 22)} ${ex.default_sets}`
    );
  }

  if (limit < exercises.length) {
    console.log(
      ` ... and ${exercises.length - limit} more (use --limit ${exercises.length} to see all)`
    );
  }
}

async function viewTemplates(headers, options) {
  const allTemplates = await getAll('workout_templates', '', headers);
  const templateExercises = await getAll(
    'workout_template_exercises',
    '',
    headers
  );
  const exercises = await getAll('exercises', '', headers);
  const exMap = {};
  for (const ex of exercises) exMap[ex.id] = ex;

  if (options.json) {
    const enriched = allTemplates.map((t) => {
      const tes = templateExercises.filter(
        (te) => te.workout_template_id === t.id
      );
      return {
        ...t,
        exercises: tes.map((te) => ({
          ...te,
          exercise: exMap[te.exercise_id] || null,
        })),
      };
    });
    console.log(JSON.stringify(enriched, null, 2));
    return;
  }

  separator(`TEMPLATES (${allTemplates.length} total)`);

  for (const tmpl of allTemplates) {
    const tes = templateExercises
      .filter((te) => te.workout_template_id === tmpl.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    console.log(`\n  ${tmpl.name} (${tmpl.id})`);
    if (tmpl.description) console.log(`  ─ ${tmpl.description}`);
    console.log(`  ─ User: ${tmpl.user_id} | Public: ${tmpl.is_public}`);

    for (const te of tes) {
      const ex = exMap[te.exercise_id];
      const exName = ex ? ex.name : `⚠ MISSING: ${te.exercise_id}`;
      console.log(
        `    ${te.sort_order}. ${pad(exName, 30)} ${te.target_sets}×${te.target_reps} @ ${te.target_rpe_low || '-'}-${te.target_rpe_high || '-'} RPE  ${te.rest_seconds}s rest`
      );
    }
  }
}

async function viewSessions(headers, options) {
  const sessions = await getAll('workout_sessions', '', headers);
  const sorted = sessions.sort(
    (a, b) => new Date(b.started_at) - new Date(a.started_at)
  );

  if (options.json) {
    console.log(
      JSON.stringify(sorted.slice(0, options.limit || sorted.length), null, 2)
    );
    return;
  }

  separator(
    `SESSIONS (${sorted.length} total, showing latest ${Math.min(options.limit || 10, sorted.length)})`
  );

  const allSets = await getAll('exercise_sets', '', headers);
  const setsBySession = {};
  for (const set of allSets) {
    if (!setsBySession[set.workout_session_id])
      setsBySession[set.workout_session_id] = [];
    setsBySession[set.workout_session_id].push(set);
  }

  const allTemplates = await getAll('workout_templates', '', headers);
  const tmplMap = {};
  for (const t of allTemplates) tmplMap[t.id] = t.name;

  const limit = options.limit || 10;
  console.log(
    ` ${pad('Date', 22)} ${pad('Template', 28)} ${pad('Duration', 10)} Sets  Status`
  );
  console.log(
    ` ${'-'.repeat(22)} ${'-'.repeat(28)} ${'-'.repeat(10)} ${'-'.repeat(4)}  ${'-'.repeat(10)}`
  );

  for (const s of sorted.slice(0, limit)) {
    const date = new Date(s.started_at)
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19);
    const tmplName = tmplMap[s.workout_template_id] || '—';
    const duration = s.duration_minutes ? `${s.duration_minutes}min` : '—';
    const setCount = setsBySession[s.id]?.length || 0;
    console.log(
      ` ${pad(date, 22)} ${pad(tmplName.substring(0, 27), 28)} ${pad(duration, 10)} ${String(setCount).padStart(4)}  ${pad(s.status, 10)}`
    );
  }

  // Summary stats
  const workingSets = allSets.filter((s) => !s.is_warmup);
  const warmupSets = allSets.filter((s) => s.is_warmup);
  console.log(
    `\n  Stats: ${sorted.length} sessions, ${allSets.length} sets (${warmupSets.length} warmup / ${workingSets.length} working)`
  );
  console.log(
    `  Avg sets/session: ${(allSets.length / Math.max(1, sorted.length)).toFixed(1)}`
  );
  console.log(
    `  Date range: ${new Date(sorted[sorted.length - 1]?.started_at).toISOString().substring(0, 10)} → ${new Date(sorted[0]?.started_at).toISOString().substring(0, 10)}`
  );
}

async function viewSessionDetail(headers, sessionId) {
  const sessions = await getAll(
    'workout_sessions',
    `id = '${sessionId}'`,
    headers
  );
  if (sessions.length === 0) {
    console.log(
      `Session "${sessionId}" not found. Try listing sessions first.`
    );
    return;
  }
  const session = sessions[0];

  const sets = await getAll(
    'exercise_sets',
    `workout_session_id = '${session.id}'`,
    headers
  );
  const sortedSets = sets.sort((a, b) => a.set_number - b.set_number);

  const exercises = await getAll('exercises', '', headers);
  const exMap = {};
  for (const ex of exercises) exMap[ex.id] = ex.name;

  const allTemplates = await getAll('workout_templates', '', headers);
  const tmplMap = {};
  for (const t of allTemplates) tmplMap[t.id] = t;

  separator(`SESSION DETAIL — ${session.id}`);

  const date = new Date(session.started_at)
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19);
  const tmpl = session.workout_template_id
    ? tmplMap[session.workout_template_id]
    : null;
  const tmplName = tmpl ? tmpl.name : '—';

  console.log(`  Date:      ${date}`);
  console.log(`  Template:  ${tmplName}`);
  console.log(`  Duration:  ${session.duration_minutes || '—'} min`);
  console.log(`  Status:    ${session.status}`);
  console.log(`  Notes:     ${session.notes || '—'}`);
  console.log(`  Sets:      ${sortedSets.length}`);

  if (sortedSets.length > 0) {
    console.log(
      `\n  ${pad('#', 3)} ${pad('Exercise', 32)} ${pad('Weight', 8)} ${pad('Reps', 6)} ${pad('RPE', 5)} ${pad('Type', 8)}`
    );
    console.log(
      `  ${'-'.repeat(3)} ${'-'.repeat(32)} ${'-'.repeat(8)} ${'-'.repeat(6)} ${'-'.repeat(5)} ${'-'.repeat(8)}`
    );

    for (const set of sortedSets) {
      const exName = exMap[set.exercise_id] || set.exercise_id;
      const type = set.is_warmup ? 'Warmup' : 'Working';
      console.log(
        `  ${pad(set.set_number, 3)} ${pad(exName.substring(0, 31), 32)} ${pad(set.weight_kg + ' kg', 8)} ${pad(set.reps, 6)} ${pad(set.rpe || '—', 5)} ${pad(type, 8)}`
      );
    }

    // Calculate volume
    const workingSets = sortedSets.filter(
      (s) => !s.is_warmup && s.weight_kg > 0 && s.reps > 0
    );
    const totalVolume = workingSets.reduce(
      (sum, s) => sum + s.weight_kg * s.reps,
      0
    );
    console.log(`\n  Total working volume: ${totalVolume.toFixed(0)} kg`);
  }
}

async function viewStats(headers, options) {
  const exercises = await getAll('exercises', '', headers);
  const allTemplates = await getAll('workout_templates', '', headers);
  const templateExercises = await getAll(
    'workout_template_exercises',
    '',
    headers
  );
  const sessions = await getAll('workout_sessions', '', headers);
  const allSets = await getAll('exercise_sets', '', headers);

  // Per user breakdown
  const users = [...new Set(sessions.map((s) => s.user_id))];

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          total: {
            exercises: exercises.length,
            templates: allTemplates.length,
            templateExercises: templateExercises.length,
            sessions: sessions.length,
            sets: allSets.length,
            users: users.length,
          },
          perUser: users.map((uid) => {
            const userSessions = sessions.filter((s) => s.user_id === uid);
            const userSessionIds = new Set(userSessions.map((s) => s.id));
            const userSets = allSets.filter((s) =>
              userSessionIds.has(s.workout_session_id)
            );

            return {
              userId: uid,
              sessions: userSessions.length,
              sets: userSets.length,
              warmupSets: userSets.filter((s) => s.is_warmup).length,
              workingSets: userSets.filter((s) => !s.is_warmup).length,
              avgSetsPerSession:
                userSessions.length > 0
                  ? (userSets.length / userSessions.length).toFixed(1)
                  : 0,
              templates: allTemplates.filter((t) => t.user_id === uid).length,
            };
          }),
        },
        null,
        2
      )
    );
    return;
  }

  separator('GLOBAL STATS');
  console.log(`  Exercises:           ${exercises.length}`);
  console.log(`  Templates:           ${allTemplates.length}`);
  console.log(`  Template Exercises:  ${templateExercises.length}`);
  console.log(`  Sessions:            ${sessions.length}`);
  console.log(`  Sets:                ${allSets.length}`);
  console.log(`  Users:               ${users.length}`);

  for (const uid of users) {
    const userSessions = sessions.filter((s) => s.user_id === uid);
    const userSessionIds = new Set(userSessions.map((s) => s.id));
    const userSets = allSets.filter((s) =>
      userSessionIds.has(s.workout_session_id)
    );
    const warmup = userSets.filter((s) => s.is_warmup).length;
    const working = userSets.filter((s) => !s.is_warmup).length;

    separator(`USER: ${uid}`);
    console.log(`  Sessions:       ${userSessions.length}`);
    console.log(
      `  Sets:           ${userSets.length} (${warmup} warmup / ${working} working)`
    );
    console.log(
      `  Avg sets/ses:   ${(userSets.length / Math.max(1, userSessions.length)).toFixed(1)}`
    );

    if (userSessions.length > 0) {
      const dates = userSessions.map((s) => new Date(s.started_at).getTime());
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      const spanDays = Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24));
      const weeksSpan = Math.max(1, Math.round(spanDays / 7));
      console.log(
        `  Date range:     ${minDate.toISOString().substring(0, 10)} → ${maxDate.toISOString().substring(0, 10)}`
      );
      console.log(`  Span:           ${spanDays} days (${weeksSpan} weeks)`);
      console.log(
        `  Avg sessions/wk: ${(userSessions.length / weeksSpan).toFixed(1)}`
      );
    }

    if (working.length > 0) {
      const avgWeight =
        working.reduce((s, x) => s + x.weight_kg, 0) / working.length;
      const avgReps = working.reduce((s, x) => s + x.reps, 0) / working.length;
      const maxWeight = Math.max(...working.map((s) => s.weight_kg));
      const maxReps = Math.max(...working.map((s) => s.reps));
      console.log(`  Avg weight:     ${avgWeight.toFixed(1)} kg`);
      console.log(`  Avg reps:       ${avgReps.toFixed(1)}`);
      console.log(`  Max weight:     ${maxWeight} kg`);
      console.log(`  Max reps:       ${maxReps}`);
    }
  }
}

// ─── PR Calculation (Epley) ──────────────────────────────────────────────

function calcE1RM(w, r) {
  return w > 0 && r > 0 ? w * (1 + r / 30) : 0;
}

async function viewPRs(headers, options) {
  const allSets = await getAll('exercise_sets', '', headers);
  const exercises = await getAll('exercises', '', headers);
  const exMap = {};
  for (const ex of exercises) exMap[ex.id] = ex;

  const workingSets = allSets.filter(
    (s) => !s.is_warmup && s.weight_kg > 0 && s.reps > 0
  );

  // Group by exercise
  const byExercise = {};
  for (const set of workingSets) {
    if (!byExercise[set.exercise_id]) byExercise[set.exercise_id] = [];
    byExercise[set.exercise_id].push(set);
  }

  const prs = [];
  for (const [exId, sets] of Object.entries(byExercise)) {
    if (sets.length < 3) continue;
    const ex = exMap[exId];
    const weights = sets.map((s) => s.weight_kg);
    const oneRepMax = Math.max(
      0,
      ...sets.filter((s) => s.reps === 1).map((s) => s.weight_kg)
    );
    const bestE1RM = Math.max(
      ...sets.map((s) => calcE1RM(s.weight_kg, s.reps))
    );
    const bestVolume = Math.max(...sets.map((s) => s.weight_kg * s.reps));
    const maxWeight = Math.max(...weights);
    const maxReps = Math.max(...sets.map((s) => s.reps));

    // Find the set with best e1RM
    const bestSet = sets.reduce(
      (best, s) =>
        calcE1RM(s.weight_kg, s.reps) > calcE1RM(best.weight_kg, best.reps)
          ? s
          : best,
      sets[0]
    );

    prs.push({
      exerciseName: ex?.name || exId,
      category: ex?.category || '?',
      oneRepMax,
      estimatedOneRepMax: Math.round(bestE1RM * 10) / 10,
      bestVolumeSet: Math.round(bestVolume),
      maxWeight,
      maxReps,
      totalSets: sets.length,
      bestSetWeight: bestSet.weight_kg,
      bestSetReps: bestSet.reps,
    });
  }

  prs.sort((a, b) => (b.estimatedOneRepMax || 0) - (a.estimatedOneRepMax || 0));

  if (options.json) {
    console.log(JSON.stringify(prs, null, 2));
    return;
  }

  separator(`PERSONAL RECORDS (${prs.length} exercises with PR data)`);
  console.log(
    ` ${pad('Exercise', 30)} ${pad('Category', 14)} ${pad('e1RM', 8)} ${pad('1RM', 8)} ${pad('Max Vol', 10)} ${pad('Best Set', 12)}`
  );
  console.log(
    ` ${'-'.repeat(30)} ${'-'.repeat(14)} ${'-'.repeat(8)} ${'-'.repeat(8)} ${'-'.repeat(10)} ${'-'.repeat(12)}`
  );

  const limit = options.limit || prs.length;
  for (const pr of prs.slice(0, limit)) {
    const bestSet =
      pr.bestSetWeight && pr.bestSetReps
        ? `${pr.bestSetWeight}×${pr.bestSetReps}`
        : '—';
    console.log(
      ` ${pad(pr.exerciseName.substring(0, 29), 30)} ${pad(pr.category, 14)} ${pad(pr.estimatedOneRepMax ? pr.estimatedOneRepMax + 'kg' : '—', 8)} ${pad(pr.oneRepMax ? pr.oneRepMax + 'kg' : '—', 8)} ${pad(pr.bestVolumeSet ? pr.bestVolumeSet.toLocaleString() : '—', 10)} ${pad(bestSet, 12)}`
    );
  }
}

async function viewBrokenFKs(headers) {
  const exercises = await getAll('exercises', '', headers);
  const allTemplates = await getAll('workout_templates', '', headers);
  const templateExercises = await getAll(
    'workout_template_exercises',
    '',
    headers
  );
  const sessions = await getAll('workout_sessions', '', headers);
  const allSets = await getAll('exercise_sets', '', headers);

  const exIds = new Set(exercises.map((e) => e.id));
  const tmplIds = new Set(allTemplates.map((t) => t.id));
  const sessIds = new Set(sessions.map((s) => s.id));

  const broken = {};

  // TE → Templates
  broken.templateExercisesToTemplates = templateExercises.filter(
    (te) => !tmplIds.has(te.workout_template_id)
  );
  // TE → Exercises
  broken.templateExercisesToExercises = templateExercises.filter(
    (te) => !exIds.has(te.exercise_id)
  );
  // Sets → Sessions
  broken.setsToSessions = allSets.filter(
    (s) => !sessIds.has(s.workout_session_id)
  );
  // Sets → Exercises
  broken.setsToExercises = allSets.filter((s) => !exIds.has(s.exercise_id));
  // Sessions → Templates
  broken.sessionsToTemplates = sessions.filter(
    (s) => s.workout_template_id && !tmplIds.has(s.workout_template_id)
  );

  separator('BROKEN FOREIGN KEYS');
  let total = 0;

  for (const [name, items] of Object.entries(broken)) {
    if (items.length === 0) {
      console.log(`  ✓ ${name}: 0 broken`);
    } else {
      console.log(`  ✗ ${name}: ${items.length} broken`);
      for (const item of items.slice(0, 5)) {
        console.log(
          `      ${item.id} → ${item.workout_template_id || item.workout_session_id || item.exercise_id}`
        );
      }
      if (items.length > 5)
        console.log(`      ... and ${items.length - 5} more`);
      total += items.length;
    }
  }

  if (total === 0) {
    console.log('\n  ✅ ALL RELATIONSHIPS INTACT — 0 broken references');
  } else {
    console.log(`\n  ⚠️  ${total} broken references found`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const view = args.find((a) => !a.startsWith('--')) || 'all';
  const options = {
    limit: parseInt(
      process.env.LIMIT || args[args.indexOf('--limit') + 1] || '20',
      10
    ),
    json: args.includes('--json'),
  };

  console.log(`🔌 PocketBase Data Inspector`);
  console.log(`   URL:  ${PB_URL}`);
  console.log(`   User: ${DEMO_EMAIL}\n`);

  const auth = await authenticate();
  const headers = auth.headers;

  switch (view) {
    case 'exercises':
      await viewExercises(headers, options);
      break;
    case 'templates':
      await viewTemplates(headers, options);
      break;
    case 'sessions':
      await viewSessions(headers, options);
      break;
    case 'session': {
      const sid = args[args.indexOf('session') + 1];
      if (!sid || sid.startsWith('--')) {
        console.log(
          'Usage: node scripts/inspect-data.mjs session <session-id>'
        );
        break;
      }
      await viewSessionDetail(headers, sid);
      break;
    }
    case 'stats':
      await viewStats(headers, options);
      break;
    case 'prs':
      await viewPRs(headers, options);
      break;
    case 'broken-fks':
      await viewBrokenFKs(headers);
      break;
    default: {
      await viewExercises(headers, { ...options, limit: 10 });
      await viewTemplates(headers, { ...options, limit: options.limit });
      await viewSessions(headers, { ...options, limit: 10 });
      await viewPRs(headers, { ...options, limit: 10 });
      await viewBrokenFKs(headers);
      break;
    }
  }
}

main().catch((err) => {
  console.error(`\n❌ Error: ${err.message}`);
  process.exit(1);
});
