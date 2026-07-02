#!/usr/bin/env node
/**
 * Seed comprehensive demo data — The Hybrid Coach methodology.
 * Hybrid training = strength + endurance/cardio (HYROX-focused).
 *
 * Generates 52 weeks of realistic training history with progression,
 * deloads, PR tests, and specialty sessions.
 *
 * Usage: node scripts/seed-demo-data.mjs
 */

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'aitor@musikak.com';
const ADMIN_PASS = 'entrenamentua2026';
const USER_ID = 'yxk3lv734olsrux'; // test@test.com

// ─── Exercise ID references ─────────────────────────────────────────────
const E = {
  // Strength — main lifts
  SQUAT: '6gc8h7ruwa8e5gv',
  BENCH: '6n9ycrmr0uoww9n',
  DEADLIFT: 'qqahjl4di38zr5w',
  OHP: 'bz12qwaad61eyef',
  ROW: '61ze8brrhqd28rq',
  // Strength — accessories
  DUMBBELL_BENCH: 'p9ql7a2ug6pmlzy',
  DUMBBELL_OHP: '5lnk3gcy5pruykt',
  RDL: 'eypslbadsz3bmnz',
  PULL_UP: 'twyjcxl9h450ag7',
  DIP: 'otgjo0l1mvrimj5',
  BULGARIAN_SPLIT: 'pjc94y6ronydp4j',
  LAT_RAISE: '17dclvpy4s21x3o',
  FACE_PULL: 'aufdkl7g4oztv06',
  BICEP_CURL: 'cl7ev412drmagfc',
  TRICEP_PUSHDOWN: 'l4hg2mf03lycirh',
  HAMMER_CURL: 'jd8j19zvgncayuc',
  LEG_EXT: '1l7v4f59coe5kba',
  LEG_CURL: 'c0nj0r07kzwb8qd',
  CALF_RAISE: 'dtnkbljgg2rizvh',
  HL_R: 'pu5eagwk80c2z79', // Hanging Leg Raise
  PLANK: 'lz8ez8xwafd592f',
  GLUTE_BRIDGE: '8i7mrc807yef7zy',
  PUSH_UP: 'aebyhaq2iyzujwu',
  BURPEE: 'trclz8m4n4v3la2',
  // Power / Olympic
  POWER_CLEAN: 'ncjmrwf721c8wb9',
  HANG_CLEAN: 'h0b5yq4y422lzs3',
  PUSH_JERK: 'd8iqsztk073r3g6',
  // Cardio / HYROX
  ROWER: 'p7rxr7kuo1ddizn',
  SKIERG: 'yfqckq90vuovo5v',
  ASSAULT_BIKE: '8aj3l0163sggks2',
  JUMP_ROPE: '8x5y3i1zusizw1m',
};

// ════════════════════════════════════════════════════════════════════════
// PROGRESSION ENGINE
// ════════════════════════════════════════════════════════════════════════

/**
 * Logistic progression of 1RM over weeks.
 * S-curve: fast early gains → plateau near genetic potential.
 */
function progression1RM(start, end, week, midpoint, steepness = 0.12) {
  const progress = 1 / (1 + Math.exp(-steepness * (week - midpoint)));
  return start + (end - start) * progress;
}

/**
 * Round to nearest plate increment (2.5kg standard).
 */
function roundWeight(kg) {
  return Math.round(kg / 2.5) * 2.5;
}

/**
 * Compute working weight from 1RM at a given intensity percentage.
 */
function workingWeight(oneRM, intensity) {
  return roundWeight(oneRM * intensity);
}

// ─── Main lift 1RM targets over 52 weeks ───────────────────────────────
const LIFT_PROGRESSION = {
  squat: { start: 80, end: 160, midpoint: 20 },
  bench: { start: 60, end: 120, midpoint: 18 },
  deadlift: { start: 100, end: 200, midpoint: 18 },
  ohp: { start: 35, end: 70, midpoint: 16 },
  row: { start: 50, end: 100, midpoint: 20 },
  rdl: { start: 60, end: 110, midpoint: 16 },
  pullup: { start: 5, end: 22, midpoint: 14 }, // weighted
};

function get1RM(lift, week) {
  const p = LIFT_PROGRESSION[lift];
  if (!p) return null;
  return progression1RM(p.start, p.end, week, p.midpoint);
}

/**
 * Get working weight for a lift at a given week and week type.
 * Returns { weight_kg, reps, rpe, is_warmup[] }
 */
function getWorkingSet(lift, week, weekType, setIndex, totalSets) {
  const oneRM = get1RM(lift, week) || 60;
  let intensity, reps, rpe;

  switch (weekType) {
    case 'deload':
      intensity = 0.52 + setIndex * 0.02; // 52-60%
      reps = 8;
      rpe = 5 + setIndex * 0.5;
      break;
    case 'pr_test': {
      // Ramp up: warmup → working → near-max single
      if (setIndex === 0)
        return {
          weight: roundWeight(oneRM * 0.5),
          reps: 5,
          rpe: 5,
          warmup: true,
        };
      if (setIndex === 1)
        return {
          weight: roundWeight(oneRM * 0.65),
          reps: 3,
          rpe: 6,
          warmup: true,
        };
      if (setIndex === 2)
        return {
          weight: roundWeight(oneRM * 0.75),
          reps: 2,
          rpe: 7,
          warmup: false,
        };
      if (setIndex === 3)
        return {
          weight: roundWeight(oneRM * 0.85),
          reps: 1,
          rpe: 8.5,
          warmup: false,
        };
      // Last set = PR attempt
      return {
        weight: roundWeight(oneRM * 0.93 + setIndex * 0.01),
        reps: 1,
        rpe: 9.5,
        warmup: false,
      };
    }
    case 'specialty':
      intensity = 0.65 + setIndex * 0.03; // 65-80%
      reps = 8 - setIndex; // descending: 8,7,6,5
      rpe = 6 + setIndex;
      break;
    default: // normal
      intensity = 0.7 + setIndex * 0.03; // 70-82%
      reps = Math.max(3, 8 - setIndex * 1.5); // 8,6,5,3
      rpe = 6 + setIndex;
      break;
  }

  return {
    weight: workingWeight(oneRM, Math.min(intensity, 0.95)),
    reps: Math.round(reps),
    rpe: Math.min(rpe, 10),
    warmup: false,
  };
}

/**
 * Get a sensible weight for an accessory exercise based on the current week.
 * Accessories progress more slowly than main lifts.
 */
function accessoryWeight(baseWeight, week, increment = 5) {
  // Slow linear progression: +increment kg over 52 weeks
  const progress = (week / 52) * increment;
  return roundWeight(baseWeight + progress);
}

// ════════════════════════════════════════════════════════════════════════
// TRAINING SCHEDULE
// ════════════════════════════════════════════════════════════════════════

// Template presets (name → { exercises, progression_map })
const TEMPLATE_CONFIGS = {
  'Squat Focus — Strength': {
    weekType: 'strength',
    mainLift: 'squat',
  },
  'Deadlift Focus — Strength': {
    weekType: 'strength',
    mainLift: 'deadlift',
  },
  'Upper Body Press — Strength': {
    weekType: 'strength',
    mainLift: 'bench',
  },
  'Lift + Row: Upper Body': {
    weekType: 'strength',
    mainLift: 'row',
  },
  'Lift + Run: Lower Body': {
    weekType: 'hybrid',
    mainLift: 'squat',
  },
  'Strength Circuit + Rower': {
    weekType: 'circuit',
    mainLift: null,
  },
  'HYROX Station Practice': {
    weekType: 'specialty',
    mainLift: null,
  },
  'Olympic Power Day': {
    weekType: 'power',
    mainLift: null,
  },
  'Assault Bike + Bodyweight': {
    weekType: 'conditioning',
    mainLift: null,
  },
  'Sled + Farmers Carry': {
    weekType: 'specialty',
    mainLift: 'squat',
  },
  'Wall Ball + Run Prep': {
    weekType: 'hybrid',
    mainLift: 'ohp',
  },
  'Interval Run + Core': {
    weekType: 'conditioning',
    mainLift: null,
  },
};

/**
 * Determine the week type and which template to use.
 */
function getWeekSchedule(week) {
  // Weeks are 1-indexed
  const mod4 = week % 4;
  const mod8 = week % 8;
  const mod6 = week % 6;

  let weekType = 'normal';
  if (mod4 === 0) weekType = 'deload';
  if (mod8 === 0) weekType = 'pr_test';

  // Determine 4 sessions for this week
  const core = [
    'Squat Focus — Strength',
    'Upper Body Press — Strength',
    'Deadlift Focus — Strength',
    'Lift + Row: Upper Body',
  ];
  const variety = [
    'Lift + Run: Lower Body',
    'Strength Circuit + Rower',
    'HYROX Station Practice',
    'Olympic Power Day',
    'Assault Bike + Bodyweight',
    'Sled + Farmers Carry',
    'Wall Ball + Run Prep',
    'Interval Run + Core',
    'Lift + Run: Lower Body',
    'Strength Circuit + Rower',
  ];

  let sessions;

  if (weekType === 'deload') {
    // Deload: use core templates at reduced intensity
    sessions = core.map((name, i) => ({ templateName: name, dayOffset: i }));
  } else if (weekType === 'pr_test') {
    // PR test: replace one session with a PR attempt on that day's main lift
    // Rotate which lift gets tested
    const prLiftIndex = (Math.floor(week / 8) - 1) % 4;
    sessions = core.map((name, i) => ({
      templateName: i === prLiftIndex ? name : name,
      dayOffset: i,
      isPR: i === prLiftIndex,
    }));
  } else if (mod6 === 0 && weekType === 'normal') {
    // Specialty session replaces one core session
    const specialtyIndex = week % 4;
    const specialty = variety[Math.floor(week / 6) % variety.length];
    sessions = core.map((name, i) => ({
      templateName: i === specialtyIndex ? specialty : name,
      dayOffset: i,
    }));
  } else {
    // Normal week
    sessions = core.map((name, i) => ({ templateName: name, dayOffset: i }));
  }

  return { weekType, sessions };
}

/**
 * Generate all session definitions for 52 weeks.
 * Returns array of { templateName, date, weekType, isPR, notes, exercises[] }
 */
function generateYearHistory() {
  const allSessions = [];
  const EXERCISES_IN_TEMPLATES = getTemplateExerciseMap();

  for (let week = 1; week <= 52; week++) {
    const { weekType, sessions } = getWeekSchedule(week);
    const weekStartDate = new Date();
    weekStartDate.setDate(weekStartDate.getDate() - 7 * (53 - week)); // 52 weeks ago + progression

    for (let sIdx = 0; sIdx < sessions.length; sIdx++) {
      const { templateName, isPR } = sessions[sIdx];
      const sessionDate = new Date(weekStartDate);
      sessionDate.setDate(sessionDate.getDate() + sIdx); // space sessions across the week
      // Add some randomness to the time of day
      sessionDate.setHours(
        6 + Math.floor(Math.random() * 14),
        Math.floor(Math.random() * 60)
      );

      const templateExercises = EXERCISES_IN_TEMPLATES[templateName];
      if (!templateExercises) continue;

      const config = TEMPLATE_CONFIGS[templateName];
      const mainLift = config?.mainLift;

      const notes = generateSessionNotes(
        templateName,
        week,
        weekType,
        isPR,
        mainLift
      );
      const duration = generateDuration(templateName, weekType);

      const exercises = [];
      let setNumber = 1;

      for (let eIdx = 0; eIdx < templateExercises.length; eIdx++) {
        const ex = templateExercises[eIdx];
        const isMainLift = mainLift && ex.liftKey === mainLift;
        const isAccessory = !isMainLift && !ex.isBodyweight;
        const isBodyweight = ex.isBodyweight;

        // Number of sets varies by week type
        let numSets;
        if (weekType === 'deload') numSets = Math.max(2, ex.sets - 2);
        else if (isMainLift)
          numSets = ex.sets + (weekType === 'pr_test' ? 1 : 0);
        else numSets = ex.sets;

        for (let setIdx = 0; setIdx < numSets; setIdx++) {
          let weight,
            reps,
            rpe,
            warmup = false;

          if (isMainLift) {
            const setData = getWorkingSet(
              ex.liftKey,
              week,
              isPR ? 'pr_test' : weekType,
              setIdx,
              numSets
            );
            weight = setData.weight;
            reps = setData.reps;
            rpe = setData.rpe;
            warmup = setData.warmup;
          } else if (isBodyweight) {
            weight = 1; // bodyweight marker
            reps = ex.reps;
            rpe = getAccessoryRPE(weekType, setIdx, numSets);
          } else if (isAccessory) {
            const baseWeight = ex.baseWeight || 20;
            const progressWeeks = Math.max(1, week - 4); // start progressing after week 4
            const accWeight = accessoryWeight(
              baseWeight,
              progressWeeks,
              ex.increment || 5
            );
            weight = accWeight;
            reps = ex.reps;
            rpe = getAccessoryRPE(weekType, setIdx, numSets);
          } else {
            weight = ex.baseWeight || 1;
            reps = ex.reps;
            rpe = 7;
          }

          // Add small variation for realism (±2.5kg for main lifts, same-rep for accessories)
          if (!warmup && !isBodyweight && !isAccessory) {
            const variation = Math.random() > 0.7 ? 2.5 : 0;
            weight = roundWeight(
              weight + (Math.random() > 0.5 ? variation : -variation)
            );
          }

          exercises.push({
            eid: ex.eid,
            setNumber: setNumber++,
            weight_kg: weight,
            reps,
            rpe: Math.round(rpe * 2) / 2, // round to 0.5
            is_warmup: warmup,
          });
        }
      }

      allSessions.push({
        templateName,
        date: sessionDate.toISOString(),
        weekType,
        isPR: isPR || false,
        notes,
        durationMin: duration,
        exercises,
      });
    }
  }

  return allSessions;
}

function getAccessoryRPE(weekType, setIdx, totalSets) {
  if (weekType === 'deload') return 5 + Math.min(setIdx, 2) * 0.5;
  return 6 + (setIdx / totalSets) * 3; // 6-9 across sets
}

function generateDuration(templateName, weekType) {
  if (weekType === 'deload') return 25 + Math.floor(Math.random() * 10);
  const base = {
    'Squat Focus — Strength': 50,
    'Deadlift Focus — Strength': 48,
    'Upper Body Press — Strength': 45,
    'Lift + Row: Upper Body': 42,
    'Lift + Run: Lower Body': 45,
    'Strength Circuit + Rower': 38,
    'HYROX Station Practice': 42,
    'Olympic Power Day': 50,
    'Assault Bike + Bodyweight': 35,
    'Sled + Farmers Carry': 40,
    'Wall Ball + Run Prep': 45,
    'Interval Run + Core': 35,
  };
  return (base[templateName] || 40) + Math.floor(Math.random() * 10) - 3;
}

function generateSessionNotes(templateName, week, weekType, isPR, mainLift) {
  const notes = [];
  const weekNum = 52 - week + 1; // weeks ago

  if (weekType === 'deload') {
    notes.push(`Deload week. Light weights, focusing on technique.`);
  } else if (isPR && mainLift) {
    const prNotes = {
      squat: [
        'Squat PR attempt! Felt solid.',
        'Depth was good on the PR squat.',
        'New squat PR — legs felt strong.',
      ],
      bench: [
        'Bench PR! Controlled descent.',
        'Paused bench PR felt smooth.',
        "Finally got the bench PR I've been chasing.",
      ],
      deadlift: [
        'Deadlift PR! Back stayed tight.',
        'Beltless deadlift PR today.',
        'Pulled a new PR — grip felt solid.',
      ],
    };
    notes.push(
      prNotes[mainLift]?.[week % 3] || 'PR test week. Went for a new max.'
    );
  } else if (weekType === 'specialty') {
    notes.push('Variety session to keep things interesting.');
  } else {
    const normalNotes = [
      'Solid session. Felt strong throughout.',
      'Good pump today. Focused on mind-muscle connection.',
      'Moved well. Working on bar path.',
      'Tough session but got through it.',
      'Felt a bit fatigued but hit all reps.',
      'Great session. Progressive overload working.',
      'Form felt dialed in today.',
      'Energy was low but technique held up.',
    ];
    notes.push(normalNotes[week % normalNotes.length]);
  }

  if (week < 8) notes.push('Still building foundation — focusing on form.');
  else if (week > 40)
    notes.push('Deep into the training cycle. Feeling strong.');
  else if (week > 25) notes.push('Mid-cycle. Accumulating volume.');

  return notes.join(' ');
}

/**
 * Build a map of template names to their exercises with progression metadata.
 */
function getTemplateExerciseMap() {
  // Exercise metadata for progression
  const withMeta = (
    eid,
    liftKey,
    sets,
    reps,
    baseWeight,
    increment,
    isBodyweight
  ) => ({
    eid,
    liftKey,
    sets,
    reps,
    baseWeight,
    increment,
    isBodyweight: isBodyweight || false,
  });

  return {
    'Squat Focus — Strength': [
      withMeta(E.SQUAT, 'squat', 4, 6, null, null, false),
      withMeta(E.RDL, 'rdl', 3, 10, 60, 10, false),
      withMeta(E.LEG_EXT, null, 3, 12, 45, 10, false),
      withMeta(E.LEG_CURL, null, 3, 12, 35, 8, false),
      withMeta(E.HL_R, null, 3, 12, 1, 0, true),
      withMeta(E.CALF_RAISE, null, 3, 15, 60, 10, false),
    ],
    'Deadlift Focus — Strength': [
      withMeta(E.DEADLIFT, 'deadlift', 4, 5, null, null, false),
      withMeta(E.ROW, 'row', 4, 8, 50, 10, false),
      withMeta(E.PULL_UP, 'pullup', 3, 8, 1, 0, true),
      withMeta(E.FACE_PULL, null, 3, 15, 12, 3, false),
      withMeta(E.GLUTE_BRIDGE, null, 3, 12, 40, 8, false),
    ],
    'Upper Body Press — Strength': [
      withMeta(E.BENCH, 'bench', 4, 8, null, null, false),
      withMeta(E.OHP, 'ohp', 3, 8, null, null, false),
      withMeta(E.DIP, null, 3, 10, 1, 0, true),
      withMeta(E.LAT_RAISE, null, 3, 15, 8, 4, false),
      withMeta(E.TRICEP_PUSHDOWN, null, 3, 12, 15, 5, false),
    ],
    'Lift + Run: Lower Body': [
      withMeta(E.SQUAT, 'squat', 4, 6, null, null, false),
      withMeta(E.RDL, 'rdl', 3, 8, 55, 8, false),
      withMeta(E.BULGARIAN_SPLIT, null, 3, 8, 16, 5, false),
      withMeta(E.CALF_RAISE, null, 3, 15, 55, 8, false),
    ],
    'Lift + Row: Upper Body': [
      withMeta(E.BENCH, 'bench', 4, 8, null, null, false),
      withMeta(E.ROW, 'row', 4, 8, 45, 8, false),
      withMeta(E.OHP, 'ohp', 3, 8, null, null, false),
      withMeta(E.FACE_PULL, null, 3, 15, 10, 3, false),
    ],
    'Strength Circuit + Rower': [
      withMeta(E.SQUAT, 'squat', 3, 10, null, null, false),
      withMeta(E.PUSH_UP, null, 3, 15, 1, 0, true),
      withMeta(E.ROW, 'row', 3, 10, 45, 6, false),
      withMeta(E.BURPEE, null, 3, 10, 1, 0, true),
    ],
    'Sled + Farmers Carry': [
      withMeta(E.BULGARIAN_SPLIT, null, 3, 8, 16, 4, false),
      withMeta(E.SQUAT, 'squat', 3, 8, null, null, false),
      withMeta(E.PULL_UP, 'pullup', 3, 8, 1, 0, true),
      withMeta(E.PLANK, null, 3, 1, 1, 0, true),
    ],
    'HYROX Station Practice': [
      withMeta(E.SKIERG, null, 3, 1, 1, 0, true),
      withMeta(E.ASSAULT_BIKE, null, 3, 1, 1, 0, true),
      withMeta(E.ROWER, null, 3, 1, 1, 0, true),
      withMeta(E.BURPEE, null, 3, 10, 1, 0, true),
      withMeta(E.SQUAT, 'squat', 3, 15, null, null, false),
    ],
    'Wall Ball + Run Prep': [
      withMeta(E.OHP, 'ohp', 4, 12, null, null, false),
      withMeta(E.SQUAT, 'squat', 3, 12, null, null, false),
      withMeta(E.DUMBBELL_OHP, null, 3, 12, 14, 4, false),
      withMeta(E.BURPEE, null, 3, 10, 1, 0, true),
    ],
    'Olympic Power Day': [
      withMeta(E.POWER_CLEAN, null, 5, 3, 40, 10, false),
      withMeta(E.PUSH_JERK, null, 4, 3, 30, 8, false),
      withMeta(E.HANG_CLEAN, null, 3, 3, 40, 8, false),
      withMeta(E.BURPEE, null, 3, 5, 1, 0, true),
    ],
    'Assault Bike + Bodyweight': [
      withMeta(E.ASSAULT_BIKE, null, 5, 1, 1, 0, true),
      withMeta(E.PUSH_UP, null, 3, 15, 1, 0, true),
      withMeta(E.PULL_UP, 'pullup', 3, 8, 1, 0, true),
      withMeta(E.PLANK, null, 3, 1, 1, 0, true),
    ],
    'Interval Run + Core': [
      withMeta(E.PLANK, null, 3, 1, 1, 0, true),
      withMeta(E.HL_R, null, 3, 12, 1, 0, true),
      withMeta(E.BURPEE, null, 3, 10, 1, 0, true),
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

async function getAdminToken() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  if (!res.ok)
    throw new Error(`Admin auth failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.token;
}

async function createRecord(col, data, headers) {
  const res = await fetch(`${PB_URL}/api/collections/${col}/records`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn(`  [WARN] ${col}: ${err.substring(0, 120)}`);
    return null;
  }
  return res.json();
}

async function deleteAll(collection, headers) {
  let hasMore = true;
  let total = 0;
  while (hasMore) {
    const res = await fetch(
      `${PB_URL}/api/collections/${collection}/records?perPage=200&sort=created`,
      { headers }
    );
    const data = await res.json();
    const ids = data.items?.map((i) => i.id) || [];
    for (const id of ids) {
      await fetch(`${PB_URL}/api/collections/${collection}/records/${id}`, {
        method: 'DELETE',
        headers,
      });
      total++;
    }
    hasMore = ids.length > 0;
  }
  return total;
}

/** Small delay between API calls to avoid hammering PocketBase */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

// ════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('   Demo Data Seed — 52 Weeks');
  console.log('   The Hybrid Coach Methodology');
  console.log('═══════════════════════════════════════');
  console.log('');

  // 1. Authenticate
  process.stdout.write('🔑 Authenticating as admin … ');
  const token = await getAdminToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  console.log('OK');

  // 2. Clean existing demo data
  console.log('\n🧹 Cleaning existing demo data …');
  for (const col of [
    'exercise_sets',
    'workout_sessions',
    'workout_template_exercises',
    'workout_templates',
  ]) {
    const deleted = await deleteAll(col, headers);
    console.log(`  ✓ ${col}: ${deleted} records deleted`);
  }

  // 3. Create templates
  console.log('\n📋 Creating templates …');
  const templates = [
    // ── Strength Foundation ──────────────────────────────────────
    {
      name: 'Squat Focus — Strength',
      description:
        'Main lift: Barbell Squat. Hybrid accessory + core finisher.',
      exercises: [
        { id: E.SQUAT, name: 'Barbell Squat', sets: 4, reps: 6, rest: 150 },
        { id: E.RDL, name: 'Romanian Deadlift', sets: 3, reps: 10, rest: 90 },
        { id: E.LEG_EXT, name: 'Leg Extension', sets: 3, reps: 12, rest: 60 },
        { id: E.LEG_CURL, name: 'Leg Curl', sets: 3, reps: 12, rest: 60 },
        { id: E.HL_R, name: 'Hanging Leg Raise', sets: 3, reps: 12, rest: 45 },
        { id: E.CALF_RAISE, name: 'Calf Raise', sets: 3, reps: 15, rest: 45 },
      ],
    },
    {
      name: 'Deadlift Focus — Strength',
      description: 'Conventional deadlift + back accessories + grip finisher',
      exercises: [
        {
          id: E.DEADLIFT,
          name: 'Barbell Deadlift',
          sets: 4,
          reps: 5,
          rest: 180,
        },
        { id: E.ROW, name: 'Barbell Row', sets: 4, reps: 8, rest: 90 },
        { id: E.PULL_UP, name: 'Pull Up', sets: 3, reps: 8, rest: 90 },
        { id: E.FACE_PULL, name: 'Face Pull', sets: 3, reps: 15, rest: 60 },
        {
          id: E.GLUTE_BRIDGE,
          name: 'Glute Bridge',
          sets: 3,
          reps: 12,
          rest: 60,
        },
      ],
    },
    {
      name: 'Upper Body Press — Strength',
      description: 'Horizontal + vertical press with triceps and shoulders',
      exercises: [
        {
          id: E.BENCH,
          name: 'Barbell Bench Press',
          sets: 4,
          reps: 8,
          rest: 120,
        },
        { id: E.OHP, name: 'Overhead Press', sets: 3, reps: 8, rest: 90 },
        { id: E.DIP, name: 'Dip', sets: 3, reps: 10, rest: 90 },
        {
          id: E.LAT_RAISE,
          name: 'Dumbbell Lateral Raise',
          sets: 3,
          reps: 15,
          rest: 45,
        },
        {
          id: E.TRICEP_PUSHDOWN,
          name: 'Tricep Pushdown',
          sets: 3,
          reps: 12,
          rest: 45,
        },
      ],
    },
    // ── Hybrid (Strength + Cardio) ───────────────────────────────
    {
      name: 'Lift + Run: Lower Body',
      description:
        'Squat-strength then a 2km run for conditioning. Classic hybrid session.',
      exercises: [
        { id: E.SQUAT, name: 'Barbell Squat', sets: 4, reps: 6, rest: 120 },
        { id: E.RDL, name: 'Romanian Deadlift', sets: 3, reps: 8, rest: 90 },
        {
          id: E.BULGARIAN_SPLIT,
          name: 'Bulgarian Split Squat',
          sets: 3,
          reps: 8,
          rest: 90,
        },
        { id: E.CALF_RAISE, name: 'Calf Raise', sets: 3, reps: 15, rest: 45 },
      ],
    },
    {
      name: 'Lift + Row: Upper Body',
      description: 'Upper body strength followed by 1km row intervals.',
      exercises: [
        {
          id: E.BENCH,
          name: 'Barbell Bench Press',
          sets: 4,
          reps: 8,
          rest: 120,
        },
        { id: E.ROW, name: 'Barbell Row', sets: 4, reps: 8, rest: 90 },
        { id: E.OHP, name: 'Overhead Press', sets: 3, reps: 8, rest: 90 },
        { id: E.FACE_PULL, name: 'Face Pull', sets: 3, reps: 15, rest: 45 },
      ],
    },
    {
      name: 'Strength Circuit + Rower',
      description:
        'Compound circuit superset with rower intervals for HYROX prep.',
      exercises: [
        { id: E.SQUAT, name: 'Barbell Squat', sets: 3, reps: 10, rest: 60 },
        { id: E.PUSH_UP, name: 'Push Up', sets: 3, reps: 15, rest: 60 },
        { id: E.ROW, name: 'Barbell Row', sets: 3, reps: 10, rest: 60 },
        { id: E.BURPEE, name: 'Burpee', sets: 3, reps: 10, rest: 60 },
      ],
    },
    {
      name: 'Sled + Farmers Carry',
      description:
        'Sled push/pull simulation with heavy carries. Leg drive + grip.',
      exercises: [
        {
          id: E.BULGARIAN_SPLIT,
          name: 'Bulgarian Split Squat',
          sets: 3,
          reps: 8,
          rest: 90,
        },
        { id: E.SQUAT, name: 'Barbell Squat', sets: 3, reps: 8, rest: 120 },
        { id: E.PULL_UP, name: 'Pull Up', sets: 3, reps: 8, rest: 60 },
        { id: E.PLANK, name: 'Plank', sets: 3, reps: 1, rest: 45 },
      ],
    },
    // ── HYROX-Specific ───────────────────────────────────────────
    {
      name: 'HYROX Station Practice',
      description:
        'Practice the 8 HYROX stations. Wall balls, sled, burpee broad jumps, lunges, rower, farmers carry, ski erg, bike.',
      exercises: [
        { id: E.SKIERG, name: 'Ski Erg', sets: 3, reps: 1, rest: 90 },
        {
          id: E.ASSAULT_BIKE,
          name: 'Assault Bike Sprint',
          sets: 3,
          reps: 1,
          rest: 90,
        },
        { id: E.ROWER, name: 'Rowing Machine', sets: 3, reps: 1, rest: 90 },
        { id: E.BURPEE, name: 'Burpee', sets: 3, reps: 10, rest: 60 },
        { id: E.SQUAT, name: 'Barbell Squat', sets: 3, reps: 15, rest: 60 },
      ],
    },
    {
      name: 'Wall Ball + Run Prep',
      description:
        'Squat endurance + push press + run intervals. Prep for HYROX wall balls.',
      exercises: [
        { id: E.OHP, name: 'Overhead Press', sets: 4, reps: 12, rest: 60 },
        { id: E.SQUAT, name: 'Barbell Squat', sets: 3, reps: 12, rest: 60 },
        {
          id: E.DUMBBELL_OHP,
          name: 'Dumbbell Shoulder Press',
          sets: 3,
          reps: 12,
          rest: 60,
        },
        { id: E.BURPEE, name: 'Burpee', sets: 3, reps: 10, rest: 60 },
      ],
    },
    // ── Power / Olympic ──────────────────────────────────────────
    {
      name: 'Olympic Power Day',
      description:
        'Explosive power for rate of force development. Clean + jerk variations.',
      exercises: [
        { id: E.POWER_CLEAN, name: 'Power Clean', sets: 5, reps: 3, rest: 150 },
        { id: E.PUSH_JERK, name: 'Push Jerk', sets: 4, reps: 3, rest: 120 },
        { id: E.HANG_CLEAN, name: 'Hang Clean', sets: 3, reps: 3, rest: 120 },
        { id: E.BURPEE, name: 'Burpee', sets: 3, reps: 5, rest: 60 },
      ],
    },
    // ── Conditioning ─────────────────────────────────────────────
    {
      name: 'Interval Run + Core',
      description: 'Track-style intervals with core stability finisher.',
      exercises: [
        { id: E.PLANK, name: 'Plank', sets: 3, reps: 1, rest: 45 },
        { id: E.HL_R, name: 'Hanging Leg Raise', sets: 3, reps: 12, rest: 45 },
        { id: E.BURPEE, name: 'Burpee', sets: 3, reps: 10, rest: 60 },
      ],
    },
    {
      name: 'Assault Bike + Bodyweight',
      description:
        'EMOM-style conditioning. Bike sprints + bodyweight calisthenics.',
      exercises: [
        {
          id: E.ASSAULT_BIKE,
          name: 'Assault Bike Sprint',
          sets: 5,
          reps: 1,
          rest: 60,
        },
        { id: E.PUSH_UP, name: 'Push Up', sets: 3, reps: 15, rest: 60 },
        { id: E.PULL_UP, name: 'Pull Up', sets: 3, reps: 8, rest: 60 },
        { id: E.PLANK, name: 'Plank', sets: 3, reps: 1, rest: 45 },
      ],
    },
  ];

  const templateIdMap = {}; // name → PocketBase record ID

  for (const tmpl of templates) {
    const t = await createRecord(
      'workout_templates',
      {
        user_id: USER_ID,
        name: tmpl.name,
        description: tmpl.description,
        is_public: false,
      },
      headers
    );
    if (!t) continue;
    templateIdMap[tmpl.name] = t.id;
    console.log(`  ✓ ${tmpl.name}`);

    for (let i = 0; i < tmpl.exercises.length; i++) {
      const ex = tmpl.exercises[i];
      await createRecord(
        'workout_template_exercises',
        {
          workout_template_id: t.id,
          exercise_id: ex.id,
          sort_order: i + 1,
          target_sets: ex.sets,
          target_reps: ex.reps,
          rest_seconds: ex.rest,
        },
        headers
      );
    }
    await delay(20);
  }
  console.log(`  → ${templates.length} templates created`);

  // ════════════════════════════════════════════════════════════════
  // GENERATED SESSIONS — 52 weeks of training
  // ════════════════════════════════════════════════════════════════
  console.log('\n📅 Generating 52 weeks of training history …');

  const generatedSessions = generateYearHistory();
  let genCreated = { sessions: 0, sets: 0 };

  for (let i = 0; i < generatedSessions.length; i++) {
    const s = generatedSessions[i];
    const tmplId = templateIdMap[s.templateName];
    const batch = Math.floor(i / 50) + 1;

    if (i % 50 === 0 && i > 0) {
      console.log(
        `  Batch ${batch}/5 (${i}/${generatedSessions.length} sessions) …`
      );
    }

    const sess = await createRecord(
      'workout_sessions',
      {
        user_id: USER_ID,
        workout_template_id: tmplId || null,
        status: 'completed',
        started_at: s.date,
        completed_at: s.date,
        duration_minutes: s.durationMin,
        notes: s.notes,
      },
      headers
    );
    if (!sess) continue;
    genCreated.sessions++;

    for (const set of s.exercises) {
      await createRecord(
        'exercise_sets',
        {
          workout_session_id: sess.id,
          exercise_id: set.eid,
          set_number: set.setNumber,
          weight_kg: set.weight_kg,
          reps: set.reps,
          rpe: set.rpe ?? null,
          is_warmup: set.is_warmup ?? false,
          logged_at: s.date,
        },
        headers
      );
      genCreated.sets++;
    }

    // Small delay every 10 sessions to avoid hammering
    if (i % 10 === 0) await delay(30);
  }

  console.log(
    `  → ${genCreated.sessions} sessions · ${genCreated.sets} sets generated`
  );

  // ════════════════════════════════════════════════════════════════
  // HAND-CRAFTED SESSIONS — Notable workouts with narrative notes
  // ════════════════════════════════════════════════════════════════
  console.log('\n📝 Adding hand-crafted notable sessions …');

  const handSessions = [
    // ── Squat PR week ──
    {
      templateName: 'Squat Focus — Strength',
      dateOffset: 2,
      durationMin: 55,
      notes: 'Squat PR attempt. Felt strong, good depth.',
      exercises: [
        {
          eid: E.SQUAT,
          sets: [
            { w: 80, r: 8, rpe: 6, warm: true },
            { w: 100, r: 6, rpe: 7 },
            { w: 120, r: 5, rpe: 8 },
            { w: 135, r: 3, rpe: 9 },
            { w: 145, r: 1, rpe: 10 },
          ],
        },
        {
          eid: E.RDL,
          sets: [
            { w: 80, r: 10, rpe: 7 },
            { w: 90, r: 8, rpe: 8 },
            { w: 100, r: 6, rpe: 9 },
          ],
        },
        {
          eid: E.LEG_EXT,
          sets: [
            { w: 55, r: 12, rpe: 7 },
            { w: 65, r: 10, rpe: 8 },
            { w: 65, r: 10, rpe: 9 },
          ],
        },
        {
          eid: E.HL_R,
          sets: [
            { w: 1, r: 12, rpe: 7 },
            { w: 1, r: 12, rpe: 8 },
            { w: 1, r: 10, rpe: 9 },
          ],
        },
      ],
    },
    // ── Deadlift hybrid ──
    {
      templateName: 'Deadlift Focus — Strength',
      dateOffset: 4,
      durationMin: 50,
      notes: 'Conventional deadlift, felt explosive off the floor.',
      exercises: [
        {
          eid: E.DEADLIFT,
          sets: [
            { w: 100, r: 5, rpe: 6, warm: true },
            { w: 130, r: 5, rpe: 7 },
            { w: 150, r: 3, rpe: 8 },
            { w: 165, r: 2, rpe: 9 },
            { w: 175, r: 1, rpe: 10 },
          ],
        },
        {
          eid: E.ROW,
          sets: [
            { w: 70, r: 8, rpe: 7 },
            { w: 80, r: 8, rpe: 8 },
            { w: 85, r: 6, rpe: 9 },
            { w: 70, r: 10, rpe: 8 },
          ],
        },
        {
          eid: E.PULL_UP,
          sets: [
            { w: 1, r: 10, rpe: 7 },
            { w: 1, r: 8, rpe: 8 },
            { w: 1, r: 6, rpe: 9 },
          ],
        },
      ],
    },
    // ── Hybrid: Lift + Run ──
    {
      templateName: 'Lift + Run: Lower Body',
      dateOffset: 6,
      durationMin: 45,
      notes: 'Squats felt heavy then a solid 2km tempo run after.',
      exercises: [
        {
          eid: E.SQUAT,
          sets: [
            { w: 80, r: 8, rpe: 6, warm: true },
            { w: 100, r: 6, rpe: 7 },
            { w: 110, r: 5, rpe: 8 },
            { w: 115, r: 4, rpe: 9 },
          ],
        },
        {
          eid: E.RDL,
          sets: [
            { w: 70, r: 10, rpe: 7 },
            { w: 80, r: 8, rpe: 8 },
            { w: 85, r: 8, rpe: 8 },
          ],
        },
        {
          eid: E.BULGARIAN_SPLIT,
          sets: [
            { w: 20, r: 8, rpe: 7 },
            { w: 22, r: 8, rpe: 8 },
            { w: 24, r: 6, rpe: 9 },
          ],
        },
        {
          eid: E.CALF_RAISE,
          sets: [
            { w: 80, r: 15, rpe: 7 },
            { w: 90, r: 12, rpe: 8 },
            { w: 90, r: 12, rpe: 8 },
          ],
        },
      ],
    },
    // ── Bench PR ──
    {
      templateName: 'Upper Body Press — Strength',
      dateOffset: 8,
      durationMin: 48,
      notes: 'Bench 1RM test. Finally got 110!',
      exercises: [
        {
          eid: E.BENCH,
          sets: [
            { w: 60, r: 10, rpe: 6, warm: true },
            { w: 80, r: 6, rpe: 7 },
            { w: 90, r: 4, rpe: 8 },
            { w: 100, r: 2, rpe: 9 },
            { w: 110, r: 1, rpe: 10 },
          ],
        },
        {
          eid: E.OHP,
          sets: [
            { w: 40, r: 8, rpe: 7 },
            { w: 45, r: 6, rpe: 8 },
            { w: 50, r: 5, rpe: 9 },
          ],
        },
        {
          eid: E.DIP,
          sets: [
            { w: 1, r: 12, rpe: 7 },
            { w: 1, r: 10, rpe: 8 },
            { w: 1, r: 8, rpe: 9 },
          ],
        },
        {
          eid: E.LAT_RAISE,
          sets: [
            { w: 12, r: 15, rpe: 7 },
            { w: 14, r: 12, rpe: 8 },
            { w: 14, r: 12, rpe: 9 },
          ],
        },
      ],
    },
    // ── HYROX Station Practice ──
    {
      templateName: 'HYROX Station Practice',
      dateOffset: 10,
      durationMin: 42,
      notes: 'Practiced HYROX transitions. Wall balls need work.',
      exercises: [
        {
          eid: E.SKIERG,
          sets: [
            { w: 1, r: 1, rpe: 7 },
            { w: 1, r: 1, rpe: 8 },
            { w: 1, r: 1, rpe: 9 },
          ],
        },
        {
          eid: E.ROWER,
          sets: [
            { w: 1, r: 1, rpe: 7 },
            { w: 1, r: 1, rpe: 8 },
            { w: 1, r: 1, rpe: 9 },
          ],
        },
        {
          eid: E.BURPEE,
          sets: [
            { w: 1, r: 10, rpe: 7 },
            { w: 1, r: 10, rpe: 8 },
            { w: 1, r: 10, rpe: 9 },
          ],
        },
        {
          eid: E.SQUAT,
          sets: [
            { w: 60, r: 15, rpe: 7 },
            { w: 60, r: 15, rpe: 8 },
            { w: 70, r: 12, rpe: 9 },
          ],
        },
      ],
    },
    // ── Olympic Power Day ──
    {
      templateName: 'Olympic Power Day',
      dateOffset: 12,
      durationMin: 50,
      notes: 'Power cleans feeling snappy. 90kg PR.',
      exercises: [
        {
          eid: E.POWER_CLEAN,
          sets: [
            { w: 50, r: 3, rpe: 6, warm: true },
            { w: 65, r: 3, rpe: 7 },
            { w: 75, r: 3, rpe: 8 },
            { w: 85, r: 2, rpe: 9 },
            { w: 90, r: 1, rpe: 10 },
          ],
        },
        {
          eid: E.PUSH_JERK,
          sets: [
            { w: 50, r: 3, rpe: 7 },
            { w: 55, r: 3, rpe: 8 },
            { w: 60, r: 2, rpe: 9 },
            { w: 65, r: 1, rpe: 10 },
          ],
        },
        {
          eid: E.BURPEE,
          sets: [
            { w: 1, r: 5, rpe: 7 },
            { w: 1, r: 5, rpe: 8 },
            { w: 1, r: 5, rpe: 9 },
          ],
        },
      ],
    },
    // ── Lift + Row Upper ──
    {
      templateName: 'Lift + Row: Upper Body',
      dateOffset: 14,
      durationMin: 47,
      notes: 'Good pump on bench. Rower intervals kicked my ass.',
      exercises: [
        {
          eid: E.BENCH,
          sets: [
            { w: 60, r: 10, rpe: 6 },
            { w: 75, r: 8, rpe: 7 },
            { w: 85, r: 6, rpe: 8 },
            { w: 90, r: 4, rpe: 9 },
          ],
        },
        {
          eid: E.ROW,
          sets: [
            { w: 65, r: 8, rpe: 7 },
            { w: 75, r: 8, rpe: 8 },
            { w: 80, r: 6, rpe: 8 },
          ],
        },
        {
          eid: E.OHP,
          sets: [
            { w: 35, r: 8, rpe: 7 },
            { w: 40, r: 6, rpe: 8 },
            { w: 45, r: 5, rpe: 9 },
          ],
        },
      ],
    },
    // ── Sled + Farmers ──
    {
      templateName: 'Sled + Farmers Carry',
      dateOffset: 17,
      durationMin: 40,
      notes: 'Full leg drive session. Split squats are brutal for HYROX prep.',
      exercises: [
        {
          eid: E.BULGARIAN_SPLIT,
          sets: [
            { w: 18, r: 8, rpe: 7 },
            { w: 20, r: 8, rpe: 8 },
            { w: 22, r: 6, rpe: 9 },
          ],
        },
        {
          eid: E.SQUAT,
          sets: [
            { w: 90, r: 8, rpe: 7 },
            { w: 100, r: 6, rpe: 8 },
            { w: 110, r: 5, rpe: 9 },
          ],
        },
        {
          eid: E.PULL_UP,
          sets: [
            { w: 1, r: 8, rpe: 7 },
            { w: 1, r: 6, rpe: 8 },
            { w: 1, r: 5, rpe: 9 },
          ],
        },
        {
          eid: E.PLANK,
          sets: [
            { w: 1, r: 1, rpe: 7 },
            { w: 1, r: 1, rpe: 8 },
            { w: 1, r: 1, rpe: 9 },
          ],
        },
      ],
    },
    // ── Wall Ball + Run Prep ──
    {
      templateName: 'Wall Ball + Run Prep',
      dateOffset: 19,
      durationMin: 45,
      notes: 'High rep OHP + squats for wall ball endurance.',
      exercises: [
        {
          eid: E.OHP,
          sets: [
            { w: 30, r: 12, rpe: 7 },
            { w: 35, r: 10, rpe: 8 },
            { w: 35, r: 10, rpe: 8 },
            { w: 40, r: 8, rpe: 9 },
          ],
        },
        {
          eid: E.SQUAT,
          sets: [
            { w: 70, r: 12, rpe: 7 },
            { w: 80, r: 10, rpe: 8 },
            { w: 80, r: 10, rpe: 8 },
          ],
        },
        {
          eid: E.BURPEE,
          sets: [
            { w: 1, r: 10, rpe: 7 },
            { w: 1, r: 10, rpe: 8 },
            { w: 1, r: 10, rpe: 9 },
          ],
        },
      ],
    },
    // ── Strength circuit + Rower ──
    {
      templateName: 'Strength Circuit + Rower',
      dateOffset: 21,
      durationMin: 38,
      notes:
        'Circuit style — minimal rest between exercises. Great HYROX prep.',
      exercises: [
        {
          eid: E.SQUAT,
          sets: [
            { w: 80, r: 10, rpe: 7 },
            { w: 80, r: 10, rpe: 8 },
            { w: 90, r: 8, rpe: 9 },
          ],
        },
        {
          eid: E.PUSH_UP,
          sets: [
            { w: 1, r: 15, rpe: 7 },
            { w: 1, r: 15, rpe: 8 },
            { w: 1, r: 12, rpe: 9 },
          ],
        },
        {
          eid: E.ROW,
          sets: [
            { w: 60, r: 10, rpe: 7 },
            { w: 65, r: 8, rpe: 8 },
            { w: 65, r: 8, rpe: 9 },
          ],
        },
        {
          eid: E.BURPEE,
          sets: [
            { w: 1, r: 10, rpe: 7 },
            { w: 1, r: 10, rpe: 8 },
            { w: 1, r: 10, rpe: 9 },
          ],
        },
      ],
    },
    // ── Assault Bike + Bodyweight ──
    {
      templateName: 'Assault Bike + Bodyweight',
      dateOffset: 24,
      durationMin: 35,
      notes: 'EMOM conditioning. Bike sprints are brutal.',
      exercises: [
        {
          eid: E.ASSAULT_BIKE,
          sets: [
            { w: 1, r: 1, rpe: 7 },
            { w: 1, r: 1, rpe: 8 },
            { w: 1, r: 1, rpe: 8 },
            { w: 1, r: 1, rpe: 9 },
            { w: 1, r: 1, rpe: 10 },
          ],
        },
        {
          eid: E.PUSH_UP,
          sets: [
            { w: 1, r: 15, rpe: 7 },
            { w: 1, r: 12, rpe: 8 },
            { w: 1, r: 12, rpe: 9 },
          ],
        },
        {
          eid: E.PULL_UP,
          sets: [
            { w: 1, r: 8, rpe: 7 },
            { w: 1, r: 6, rpe: 8 },
            { w: 1, r: 5, rpe: 9 },
          ],
        },
      ],
    },
    // ── Interval Run + Core ──
    {
      templateName: 'Interval Run + Core',
      dateOffset: 27,
      durationMin: 35,
      notes: '400m repeats at the track. Core finisher.',
      exercises: [
        {
          eid: E.PLANK,
          sets: [
            { w: 1, r: 1, rpe: 7 },
            { w: 1, r: 1, rpe: 8 },
            { w: 1, r: 1, rpe: 9 },
          ],
        },
        {
          eid: E.HL_R,
          sets: [
            { w: 1, r: 12, rpe: 7 },
            { w: 1, r: 10, rpe: 8 },
            { w: 1, r: 10, rpe: 9 },
          ],
        },
        {
          eid: E.BURPEE,
          sets: [
            { w: 1, r: 10, rpe: 7 },
            { w: 1, r: 10, rpe: 8 },
            { w: 1, r: 10, rpe: 9 },
          ],
        },
      ],
    },
    // ── Older sessions for history depth ──
    {
      templateName: 'Squat Focus — Strength',
      dateOffset: 30,
      durationMin: 50,
      notes: 'Volume squat day. Building base for HYROX season.',
      exercises: [
        {
          eid: E.SQUAT,
          sets: [
            { w: 70, r: 10, rpe: 6 },
            { w: 90, r: 8, rpe: 7 },
            { w: 100, r: 6, rpe: 8 },
            { w: 100, r: 6, rpe: 8 },
          ],
        },
        {
          eid: E.RDL,
          sets: [
            { w: 60, r: 10, rpe: 7 },
            { w: 70, r: 8, rpe: 8 },
            { w: 75, r: 8, rpe: 8 },
          ],
        },
      ],
    },
    {
      templateName: 'Upper Body Press — Strength',
      dateOffset: 33,
      durationMin: 45,
      notes: 'Volume bench day. Lots of accessories.',
      exercises: [
        {
          eid: E.BENCH,
          sets: [
            { w: 60, r: 10, rpe: 6 },
            { w: 70, r: 8, rpe: 7 },
            { w: 75, r: 6, rpe: 8 },
            { w: 80, r: 5, rpe: 8 },
          ],
        },
        {
          eid: E.OHP,
          sets: [
            { w: 30, r: 10, rpe: 7 },
            { w: 35, r: 8, rpe: 8 },
            { w: 40, r: 6, rpe: 8 },
          ],
        },
        {
          eid: E.LAT_RAISE,
          sets: [
            { w: 10, r: 15, rpe: 7 },
            { w: 10, r: 15, rpe: 8 },
            { w: 12, r: 12, rpe: 8 },
          ],
        },
      ],
    },
    {
      templateName: 'Deadlift Focus — Strength',
      dateOffset: 36,
      durationMin: 48,
      notes: 'Early prep deadlift. Building technique.',
      exercises: [
        {
          eid: E.DEADLIFT,
          sets: [
            { w: 90, r: 5, rpe: 6 },
            { w: 110, r: 5, rpe: 7 },
            { w: 130, r: 3, rpe: 8 },
            { w: 140, r: 2, rpe: 8 },
          ],
        },
        {
          eid: E.ROW,
          sets: [
            { w: 60, r: 10, rpe: 7 },
            { w: 65, r: 8, rpe: 8 },
            { w: 70, r: 8, rpe: 8 },
          ],
        },
      ],
    },
    {
      templateName: 'HYROX Station Practice',
      dateOffset: 40,
      durationMin: 38,
      notes: 'First HYROX practice session. Learning the stations.',
      exercises: [
        {
          eid: E.ROWER,
          sets: [
            { w: 1, r: 1, rpe: 7 },
            { w: 1, r: 1, rpe: 8 },
            { w: 1, r: 1, rpe: 8 },
          ],
        },
        {
          eid: E.BURPEE,
          sets: [
            { w: 1, r: 8, rpe: 7 },
            { w: 1, r: 8, rpe: 8 },
            { w: 1, r: 8, rpe: 9 },
          ],
        },
        {
          eid: E.SQUAT,
          sets: [
            { w: 50, r: 12, rpe: 7 },
            { w: 50, r: 12, rpe: 8 },
            { w: 60, r: 10, rpe: 8 },
          ],
        },
      ],
    },
  ];

  let hcCreated = { sessions: 0, sets: 0 };

  for (const sessionDef of handSessions) {
    const startedAt = daysAgo(sessionDef.dateOffset);
    const tmplId = templateIdMap[sessionDef.templateName];

    const sess = await createRecord(
      'workout_sessions',
      {
        user_id: USER_ID,
        workout_template_id: tmplId || null,
        status: sessionDef.status || 'completed',
        started_at: startedAt,
        completed_at: startedAt,
        duration_minutes: sessionDef.durationMin,
        notes: sessionDef.notes || `Demo: ${sessionDef.templateName}`,
      },
      headers
    );
    if (!sess) continue;
    hcCreated.sessions++;

    let setNumber = 1;
    for (const ex of sessionDef.exercises) {
      for (const set of ex.sets) {
        await createRecord(
          'exercise_sets',
          {
            workout_session_id: sess.id,
            exercise_id: ex.eid,
            set_number: setNumber++,
            weight_kg: set.w,
            reps: set.r,
            rpe: set.rpe ?? null,
            is_warmup: set.warm ?? false,
            logged_at: startedAt,
          },
          headers
        );
        hcCreated.sets++;
      }
    }
    console.log(
      `  ✓ ${sessionDef.templateName} (${sessionDef.dateOffset}d ago)`
    );
    await delay(15);
  }

  // ════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════

  const totalSessions = genCreated.sessions + hcCreated.sessions;
  const totalSets = genCreated.sets + hcCreated.sets;

  console.log('\n═══════════════════════════════════════');
  console.log('   Done!');
  console.log('═══════════════════════════════════════');
  console.log(`   Templates:       ${templates.length}`);
  console.log(`   Generated sess.: ${genCreated.sessions}`);
  console.log(`   Hand-crafted:    ${hcCreated.sessions}`);
  console.log(`   Total sessions:  ${totalSessions}`);
  console.log(`   Total sets:      ${totalSets}`);
  console.log(
    `   Total records:   ${templates.length + totalSessions + totalSets}`
  );
  console.log(
    `   History span:    52 weeks (${Math.round(totalSessions / 52)} sessions/week avg)`
  );
  console.log('');
  console.log('   Login: test@test.com / test123456');
  console.log(
    '   Philosophy: Hybrid Training — Strength + Endurance (The Hybrid Coach)'
  );
  console.log('');
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
