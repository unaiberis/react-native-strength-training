#!/usr/bin/env node

/**
 * PocketBase Seed Script
 *
 * Reads supabase/seed.sql, parses exercise INSERT statements, and
 * POSTs each exercise to PocketBase via the admin API. Also deletes
 * the temporary "test" collection if it exists.
 *
 * Usage:
 *   node scripts/seed-pocketbase.mjs
 *
 * Environment variables (all optional):
 *   PB_URL         - PocketBase server URL (default: http://127.0.0.1:8090)
 *   PB_ADMIN_EMAIL - Admin email       (default: aitor@musikak.com)
 *   PB_ADMIN_PASS  - Admin password    (default: entrenamentua2026)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PB_URL       = process.env.PB_URL       || 'http://127.0.0.1:8090';
const ADMIN_EMAIL  = process.env.PB_ADMIN_EMAIL  || 'admin@entrenamentua.com';
const ADMIN_PASS   = process.env.PB_ADMIN_PASS   || 'test123456';
const SEED_FILE    = process.env.SEED_FILE || join(ROOT, 'supabase', 'seed.sql');

// ---------------------------------------------------------------------------
// Exercise enrichment maps — keyed by exercise name (must match seed.sql)
// ---------------------------------------------------------------------------

const VIDEO_URLS = {
  // STRENGTH (compound lifts)
  "Barbell Bench Press": "https://www.youtube.com/results?search_query=how+to+barbell+bench+press",
  "Barbell Squat": "https://www.youtube.com/results?search_query=how+to+barbell+back+squat",
  "Barbell Deadlift": "https://www.youtube.com/results?search_query=how+to+conventional+deadlift",
  "Overhead Press": "https://www.youtube.com/results?search_query=how+to+overhead+press+strict",
  "Barbell Row": "https://www.youtube.com/results?search_query=how+to+barbell+row+bent+over",
  "Dumbbell Bench Press": "https://www.youtube.com/results?search_query=how+to+dumbbell+bench+press",
  "Dumbbell Shoulder Press": "https://www.youtube.com/results?search_query=how+to+dumbbell+shoulder+press",
  "Dumbbell Row": "https://www.youtube.com/results?search_query=how+to+dumbbell+row+single+arm",
  "Romanian Deadlift": "https://www.youtube.com/results?search_query=how+to+romanian+deadlift",
  "Pull Up": "https://www.youtube.com/results?search_query=how+to+pull+up+proper+form",
  "Chin Up": "https://www.youtube.com/results?search_query=how+to+chin+up+underhand",
  "Dip": "https://www.youtube.com/results?search_query=how+to+chest+dip+parallel+bars",
  "Barbell Hip Thrust": "https://www.youtube.com/results?search_query=how+to+barbell+hip+thrust",
  "Trap Bar Deadlift": "https://www.youtube.com/results?search_query=how+to+trap+bar+deadlift",
  "Walking Lunge": "https://www.youtube.com/results?search_query=how+to+walking+lunge+dumbbell",
  "Bulgarian Split Squat": "https://www.youtube.com/results?search_query=how+to+bulgarian+split+squat",
  "Pendlay Row": "https://www.youtube.com/results?search_query=how+to+pendlay+row",
  "Floor Press": "https://www.youtube.com/results?search_query=how+to+floor+press+barbell",
  "Good Morning": "https://www.youtube.com/results?search_query=how+to+good+morning+exercise",
  "Zercher Squat": "https://www.youtube.com/results?search_query=how+to+zercher+squat",

  // ACCESSORY
  "Dumbbell Lateral Raise": "https://www.youtube.com/results?search_query=how+to+dumbbell+lateral+raise",
  "Face Pull": "https://www.youtube.com/results?search_query=how+to+face+pull+cable",
  "Dumbbell Bicep Curl": "https://www.youtube.com/results?search_query=how+to+dumbbell+bicep+curl",
  "Tricep Pushdown": "https://www.youtube.com/results?search_query=how+to+tricep+pushdown+cable",
  "Hammer Curl": "https://www.youtube.com/results?search_query=how+to+hammer+curl+dumbbell",
  "Skull Crusher": "https://www.youtube.com/results?search_query=how+to+skull+crusher+tricep",
  "Dumbbell Fly": "https://www.youtube.com/results?search_query=how+to+dumbbell+fly+chest",
  "Cable Crossover": "https://www.youtube.com/results?search_query=how+to+cable+crossover+chest",
  "Dumbbell Pullover": "https://www.youtube.com/results?search_query=how+to+dumbbell+pullover",
  "Dumbbell Shrug": "https://www.youtube.com/results?search_query=how+to+dumbbell+shrug+traps",
  "Leg Extension": "https://www.youtube.com/results?search_query=how+to+leg+extension+machine",
  "Leg Curl": "https://www.youtube.com/results?search_query=how+to+leg+curl+machine",
  "Calf Raise": "https://www.youtube.com/results?search_query=how+to+standing+calf+raise",
  "Seated Calf Raise": "https://www.youtube.com/results?search_query=how+to+seated+calf+raise",
  "Dumbbell Front Raise": "https://www.youtube.com/results?search_query=how+to+dumbbell+front+raise",
  "Rear Delt Fly": "https://www.youtube.com/results?search_query=how+to+rear+delt+fly",
  "Preacher Curl": "https://www.youtube.com/results?search_query=how+to+preacher+curl",
  "Overhead Tricep Extension": "https://www.youtube.com/results?search_query=how+to+overhead+tricep+extension",
  "Pallof Press": "https://www.youtube.com/results?search_query=how+to+pallof+press",

  // BODYWEIGHT
  "Push Up": "https://www.youtube.com/results?search_query=how+to+push+up+proper+form",
  "Bodyweight Squat": "https://www.youtube.com/results?search_query=how+to+bodyweight+squat",
  "Plank": "https://www.youtube.com/results?search_query=how+to+plank+core+exercise",
  "Hanging Leg Raise": "https://www.youtube.com/results?search_query=how+to+hanging+leg+raise",
  "Glute Bridge": "https://www.youtube.com/results?search_query=how+to+glute+bridge",
  "Inverted Row": "https://www.youtube.com/results?search_query=how+to+inverted+row",
  "Pistol Squat": "https://www.youtube.com/results?search_query=how+to+pistol+squat",
  "Burpee": "https://www.youtube.com/results?search_query=how+to+burpee+proper+form",
  "Mountain Climber": "https://www.youtube.com/results?search_query=how+to+mountain+climber",
  "L Sit": "https://www.youtube.com/results?search_query=how+to+l+sit+exercise",

  // OLYMPIC
  "Power Clean": "https://www.youtube.com/results?search_query=how+to+power+clean",
  "Power Snatch": "https://www.youtube.com/results?search_query=how+to+power+snatch",
  "Hang Clean": "https://www.youtube.com/results?search_query=how+to+hang+clean",
  "Hang Snatch": "https://www.youtube.com/results?search_query=how+to+hang+snatch",
  "Clean and Jerk": "https://www.youtube.com/results?search_query=how+to+clean+and+jerk",
  "Push Jerk": "https://www.youtube.com/results?search_query=how+to+push+jerk",
  "Snatch Grip Deadlift": "https://www.youtube.com/results?search_query=how+to+snatch+grip+deadlift",
  "Clean Pull": "https://www.youtube.com/results?search_query=how+to+clean+pull",
  "Snatch Pull": "https://www.youtube.com/results?search_query=how+to+snatch+pull",
  "Muscle Clean": "https://www.youtube.com/results?search_query=how+to+muscle+clean",

  // CARDIO
  "Assault Bike Sprint": "https://www.youtube.com/results?search_query=how+to+assault+bike+sprint",
  "Rowing Machine": "https://www.youtube.com/results?search_query=how+to+rowing+machine+erg",
  "Ski Erg": "https://www.youtube.com/results?search_query=how+to+ski+erg+machine",
  "Jump Rope": "https://www.youtube.com/results?search_query=how+to+jump+rope+double+unders",
};

const DESCRIPTIONS = {
  // STRENGTH (compound lifts)
  "Barbell Bench Press": "Flat bench press with barbell. Primary chest builder. Targets pectorals, anterior delts, and triceps.",
  "Barbell Squat": "Back squat with barbell across upper back. Foundational lower body strength movement targeting quads, glutes, and core.",
  "Barbell Deadlift": "Conventional deadlift lifting bar from floor to lockout. Full body pull targeting hamstrings, glutes, back, and grip.",
  "Overhead Press": "Standing barbell press from shoulders to full lockout overhead. Primary shoulder strength movement.",
  "Barbell Row": "Bent over barbell row with torso at ~45 degrees. Horizontal pull for back thickness and rear delt development.",
  "Dumbbell Bench Press": "Flat dumbbell press allowing greater range of motion than barbell. Reduces shoulder stress for some lifters.",
  "Dumbbell Shoulder Press": "Seated or standing dumbbell press from shoulders to overhead. Allows independent arm movement.",
  "Dumbbell Row": "Single arm dumbbell row supporting torso on bench. Corrects bilateral imbalances and builds lat thickness.",
  "Romanian Deadlift": "Hip hinge movement with barbell or dumbbells. Targets hamstrings and glutes with minimal quad involvement.",
  "Pull Up": "Vertical pull using bodyweight with overhand (pronated) grip. Targets lats, biceps, and upper back.",
  "Chin Up": "Vertical pull with underhand (supinated) grip. More biceps involvement than pull ups while still targeting lats.",
  "Dip": "Parallel bar dip lowering until elbows reach 90 degrees. Works chest, triceps, and anterior shoulders.",
  "Barbell Hip Thrust": "Glute bridge with barbell across hips. Primary glute builder for strength and hypertrophy.",
  "Trap Bar Deadlift": "Deadlift variation using trap/hex bar with neutral grip. Easier on lower back while still targeting legs and glutes.",
  "Walking Lunge": "Alternating forward lunges with dumbbells or barbell. Single leg strength, balance, and hip stability.",
  "Bulgarian Split Squat": "Rear foot elevated split squat on bench. Unilateral leg work emphasizing quads, glutes, and hip stability.",
  "Pendlay Row": "Explosive barbell row from floor with each rep returning to dead stop. Emphasizes back power and technique.",
  "Floor Press": "Press lying on floor which limits range of motion at bottom. Reduces shoulder stress while building pressing strength.",
  "Good Morning": "Barbell hip hinge with bar across upper back. Posterior chain accessory for hamstrings, glutes, and erectors.",
  "Zercher Squat": "Squat with barbell held in elbow crooks. Core and quad intensive squat variation requiring significant core stability.",

  // ACCESSORY
  "Dumbbell Lateral Raise": "Lateral delt isolation raising dumbbells to sides. Key movement for shoulder width and delt cap development.",
  "Face Pull": "Cable face pull pulling rope toward face with external rotation. Targets rear delts, traps, and rotator cuff. Great shoulder health movement.",
  "Dumbbell Bicep Curl": "Standing alternating or simultaneous dumbbell curl. Primary bicep isolation for arm size and strength.",
  "Tricep Pushdown": "Cable tricep extension pushing bar or rope down. Isolation for all three heads of the triceps.",
  "Hammer Curl": "Neutral grip dumbbell curl with palms facing each other. Targets brachialis and brachioradialis for arm thickness.",
  "Skull Crusher": "Lying tricep extension lowering bar to forehead. Long head tricep focus for upper arm development.",
  "Dumbbell Fly": "Flat dumbbell fly opening arms to sides. Chest stretch and adduction movement for pectoral development.",
  "Cable Crossover": "Standing cable chest fly crossing hands forward. Constant tension on chest throughout full range of motion.",
  "Dumbbell Pullover": "Chest and lat stretch pulling dumbbell overhead while lying across bench. Good for ribcage expansion and lat length.",
  "Dumbbell Shrug": "Trap isolation raising shoulders upward against resistance. Builds upper trap mass and improves shoulder posture.",
  "Leg Extension": "Machine leg extension extending lower legs against pad. Quad isolation for front thigh development.",
  "Leg Curl": "Machine leg curling lower legs toward glutes. Hamstring isolation for back thigh development.",
  "Calf Raise": "Standing calf raise raising heels against resistance. Gastrocnemius focus for lower leg development.",
  "Seated Calf Raise": "Seated calf raise with weight on knees. Soleus focus for lower leg thickness and definition.",
  "Dumbbell Front Raise": "Anterior delt raise lifting dumbbells to front. Front shoulder isolation for balanced delt development.",
  "Rear Delt Fly": "Bent over or reverse pec deck fly targeting rear delts. Important for shoulder balance and posture.",
  "Preacher Curl": "Bicep curl on preacher bench which eliminates body swing. Strict bicep isolation for peak development.",
  "Overhead Tricep Extension": "Overhead extension with dumbbell or cable. Long head tricep focus for horseshoe tricep definition.",
  "Pallof Press": "Anti-rotation core exercise pressing cable away from body. Builds deep core stability and rotational strength.",

  // BODYWEIGHT
  "Push Up": "Standard push up lowering chest to floor. Foundational bodyweight pressing movement for chest, shoulders, and triceps.",
  "Bodyweight Squat": "Air squat lowering hips below parallel. Movement patterning, warm up, and lower body conditioning.",
  "Plank": "Front plank holding body in straight line on elbows. Isometric core endurance for ab and lower back stability.",
  "Hanging Leg Raise": "Hanging from bar and raising legs to parallel or above. Lower ab and hip flexor development.",
  "Glute Bridge": "Supine glute bridge pressing hips upward from floor. Glute activation and hip extension patterning.",
  "Inverted Row": "Bodyweight row under a fixed bar with feet on ground. Horizontal pull for back without equipment.",
  "Pistol Squat": "Single leg squat on one leg. Advanced bodyweight leg strength requiring mobility, balance, and control.",
  "Burpee": "Full body conditioning movement from standing to squat, plank, jump. Squat thrust with vertical jump.",
  "Mountain Climber": "Plank position with alternating knee drives toward chest. Dynamic core, hip flexor, and conditioning exercise.",
  "L Sit": "Holding L-shaped position on parallettes or floor with legs extended. Core compression, hip flexor, and tricep strength.",

  // OLYMPIC
  "Power Clean": "Explosive clean pulling bar from floor to shoulders in one motion. Triple extension for power development.",
  "Power Snatch": "Explosive snatch pulling bar from floor to overhead in one motion. Full body power and speed development.",
  "Hang Clean": "Clean from hang position above knee. Technique builder for the full clean movement.",
  "Hang Snatch": "Snatch from hang position. Speed and timing development for the full snatch.",
  "Clean and Jerk": "Full competitive lift: clean to front shoulders then jerk overhead. Complete total body explosive movement.",
  "Push Jerk": "Dip, drive, and re-bend to press overhead. Uses leg drive more than strict press for heavier loads.",
  "Snatch Grip Deadlift": "Deadlift with wide snatch grip. Develops first pull strength from floor with increased range of motion.",
  "Clean Pull": "Pull from floor to full extension with no catch. Develops explosive extension power for the clean.",
  "Snatch Pull": "Snatch grip pull from floor to full extension with no catch. Builds snatch pull strength and timing.",
  "Muscle Clean": "Clean without catching in squat. Pull bar high enough to receive in partial squat or standing position.",

  // CARDIO
  "Assault Bike Sprint": "Fan bike maximal effort intervals. Full body cardio targeting legs, glutes, and cardiovascular system.",
  "Rowing Machine": "Ergometer rowing. Full body endurance and power development. Targets legs, back, and arms.",
  "Ski Erg": "Standing ski pulling motion. Upper body cardio targeting arms, shoulders, back, and core.",
  "Jump Rope": "Double unders or single jumps. Coordination, agility, and high intensity conditioning.",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Authenticate as PocketBase admin and return an admin token.
 */
async function getAdminToken() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  if (!res.ok) {
    throw new Error(`Admin auth failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.token;
}

/**
 * Parse the INSERT INTO exercises … VALUES (…), (…); block from a SQL string.
 *
 * Handles:
 *   - SQL comments (--)
 *   - ARRAY['item1', 'item2'] PostgreSQL syntax → JS array
 *   - String literals   (single-quoted)
 *   - Numeric literals  (integers)
 *   - NULL / boolean literals
 *
 * Returns an array of plain objects whose keys match the column names.
 */
function parseExercises(sql) {
  // Strip SQL comments
  const clean = sql.replace(/--.*$/gm, '');

  // Locate the VALUES block
  const match = clean.match(
    /INSERT\s+INTO\s+exercises\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/
  );
  if (!match) {
    throw new Error('Could not find INSERT INTO exercises statement in seed.sql');
  }

  const columns     = match[1].split(',').map((c) => c.trim());
  const valuesBlock = match[2].trim();

  // ---- Split into individual row strings by tracking paren depth ----
  const rowTexts = [];
  let depth    = 0;
  let rowStart = -1;

  for (let i = 0; i < valuesBlock.length; i++) {
    const ch = valuesBlock[i];

    if (ch === '(' && depth === 0) {
      rowStart = i + 1;
      depth    = 1;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0 && rowStart !== -1) {
        rowTexts.push(valuesBlock.slice(rowStart, i));
        rowStart = -1;
      }
    }
  }

  // ---- Parse comma-separated values inside each row ----
  function parseRowValues(text) {
    const raw = [];
    let buf    = '';
    let depth  = 0;
    let inStr  = false;

    for (const ch of text) {
      if (ch === "'" && !inStr) {
        inStr = true;
        buf += ch;
      } else if (ch === "'" && inStr) {
        inStr = false;
        buf += ch;
      } else if (inStr) {
        buf += ch;
      } else if (ch === ',' && depth === 0) {
        raw.push(buf.trim());
        buf = '';
      } else {
        if (ch === '(' || ch === '[') depth++;
        if (ch === ')' || ch === ']') depth--;
        buf += ch;
      }
    }
    if (buf.trim()) raw.push(buf.trim());

    return raw.map((v) => {
      // Single-quoted string literal
      if (/^'.*'$/.test(v)) return v.slice(1, -1);
      // PostgreSQL ARRAY['a','b'] → JS array
      if (/^ARRAY\[/i.test(v)) {
        const inner = v.slice(6, -1).trim();
        if (!inner) return [];
        return inner.split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
      }
      if (/^null$/i.test(v)) return null;
      if (v === 'true') return true;
      if (v === 'false') return false;
      if (/^\d+(\.\d+)?$/.test(v)) return Number(v);
      return v;
    });
  }

  // ---- Build records ----
  return rowTexts.map((text) => {
    const values = parseRowValues(text);
    const record = {};
    columns.forEach((col, i) => {
      record[col] = values[i];
    });
    return record;
  });
}

/**
 * POST exercises to PocketBase, with progress output.
 */
async function seedExercises(token, exercises) {
  const url = `${PB_URL}/api/collections/exercises/records`;
  let created = 0;
  let skipped = 0;
  let errors  = 0;

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];

    const description = DESCRIPTIONS[ex.name] || ex.description || '';
    const video_url   = VIDEO_URLS[ex.name]   || ex.video_url   || '';

    const body = {
      name:               ex.name,
      category:           ex.category,
      equipment:          JSON.stringify(ex.equipment || []),
      body_region:        ex.body_region,
      description,
      video_url,
      default_sets:       ex.default_sets ?? 3,
      default_reps:       ex.default_reps ?? 10,
      default_rest_seconds: ex.default_rest_seconds ?? 90,
      is_public:          true,
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        created++;
        process.stdout.write(`\r  ✓ [${i + 1}/${exercises.length}] ${ex.name}          `);
      } else if (res.status === 409) {
        skipped++;
        process.stdout.write(`\r  – [${i + 1}/${exercises.length}] ${ex.name} (exists)  `);
      } else {
        // Treat "not unique" as already-exists (idempotent re-run)
        const text = await res.text();
        const isDuplicate = text.includes('validation_not_unique');
        if (isDuplicate) {
          skipped++;
          process.stdout.write(`\r  – [${i + 1}/${exercises.length}] ${ex.name} (exists)  `);
        } else {
          errors++;
          process.stdout.write(`\n  ✗ [${i + 1}/${exercises.length}] ${ex.name}: ${res.status} ${text}\n`);
        }
      }
    } catch (err) {
      errors++;
      process.stdout.write(`\n  ✗ [${i + 1}/${exercises.length}] ${ex.name}: ${err.message}\n`);
    }

    // Small delay between requests
    await new Promise((r) => setTimeout(r, 50));
  }

  process.stdout.write('\n');
  return { created, skipped, errors, total: exercises.length };
}

/**
 * Delete the temporary "test" collection if it exists.
 */
async function deleteTestCollection(token) {
  const url = `${PB_URL}/api/collections/test`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      console.log('  ✓ Test collection deleted');
      return true;
    }
    if (res.status === 404) {
      console.log('  – Test collection not found (nothing to delete)');
      return true;
    }
    console.log(`  ⚠ Failed to delete test collection: ${res.status} ${await res.text()}`);
    return false;
  } catch (err) {
    console.log(`  ⚠ Error deleting test collection: ${err.message}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('   PocketBase Seed Script');
  console.log('═══════════════════════════════════════');
  console.log('');

  // 1. Authenticate
  process.stdout.write('🔑 Authenticating as admin … ');
  const token = await getAdminToken();
  console.log('OK');

  // 2. Parse exercises from seed.sql
  process.stdout.write(`📖 Reading ${SEED_FILE} … `);
  const sql       = readFileSync(SEED_FILE, 'utf-8');
  const exercises = parseExercises(sql);
  console.log(`found ${exercises.length} exercises`);

  // 3. Seed
  console.log('\n📤 Seeding exercises …');
  const result = await seedExercises(token, exercises);

  // 4. Cleanup
  console.log('\n🧹 Cleanup …');
  await deleteTestCollection(token);

  // 5. Summary
  console.log('\n═══════════════════════════════════════');
  console.log('   Summary');
  console.log('═══════════════════════════════════════');
  console.log(`   Total in seed  : ${result.total}`);
  console.log(`   Created        : ${result.created}`);
  console.log(`   Skipped (exist): ${result.skipped}`);
  console.log(`   Errors         : ${result.errors}`);
  console.log('');

  process.exit(result.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
