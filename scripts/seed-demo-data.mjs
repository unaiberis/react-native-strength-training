#!/usr/bin/env node
/**
 * Seed demo data based on The Hybrid Coach methodology.
 * Hybrid training = strength + endurance/cardio (HYROX-focused).
 *
 * NOT destructive by default — additive only. Use --clean to wipe test user data first.
 *
 * Usage: node scripts/seed-demo-data.mjs [--clean]
 *        node scripts/seed-demo-data.mjs --clean   # wipes test user data first
 */

const PB_URL = process.env.PB_URL || "http://127.0.0.1:8090";
const ADMIN_EMAIL = "aitor@musikak.com";
const ADMIN_PASS = "entrenamentua2026";
const USER_ID = "yxk3lv734olsrux"; // test@test.com

const CLEAN = process.argv.includes("--clean");

// ─── Exercise name → ID lookup ────────────────────────────────────────
// Resolved dynamically from the current PocketBase instance.
// Keys are the short names used in the seed data below.
const E = {}; // populated at runtime via lookupByName()

// ─── Template definitions (referenced by exercise SHORT NAME) ─────────
const TEMPLATES = [
  {
    name: "Squat Focus — Strength",
    description: "Main lift: Barbell Squat. Hybrid accessory + core finisher.",
    exercises: [
      { key: "SQUAT", name: "Barbell Back Squat", sets: 4, reps: 6, rest: 150 },
      { key: "RDL", name: "Romanian Deadlift", sets: 3, reps: 10, rest: 90 },
      { key: "LEG_EXT", name: "Leg Extension", sets: 3, reps: 12, rest: 60 },
      { key: "LEG_CURL", name: "Leg Curl", sets: 3, reps: 12, rest: 60 },
      { key: "HL_R", name: "Hanging Leg Raise", sets: 3, reps: 12, rest: 45 },
      { key: "CALF_RAISE", name: "Standing Calf Raise", sets: 3, reps: 15, rest: 45 },
    ],
  },
  {
    name: "Deadlift Focus — Strength",
    description: "Conventional deadlift + back accessories + grip finisher",
    exercises: [
      { key: "DEADLIFT", name: "Deadlift", sets: 4, reps: 5, rest: 180 },
      { key: "ROW", name: "Barbell Row", sets: 4, reps: 8, rest: 90 },
      { key: "PULL_UP", name: "Pull Up", sets: 3, reps: 8, rest: 90 },
      { key: "FACE_PULL", name: "Face Pull", sets: 3, reps: 15, rest: 60 },
      { key: "GLUTE_BRIDGE", name: "Glute Bridge", sets: 3, reps: 12, rest: 60 },
    ],
  },
  {
    name: "Upper Body Press — Strength",
    description: "Horizontal + vertical press with triceps and shoulders",
    exercises: [
      { key: "BENCH", name: "Barbell Bench Press", sets: 4, reps: 8, rest: 120 },
      { key: "OHP", name: "Overhead Press", sets: 3, reps: 8, rest: 90 },
      { key: "DIP", name: "Chest Dip", sets: 3, reps: 10, rest: 90 },
      { key: "LAT_RAISE", name: "Dumbbell Lateral Raise", sets: 3, reps: 15, rest: 45 },
      { key: "TRICEP_PUSHDOWN", name: "Tricep Pushdown", sets: 3, reps: 12, rest: 45 },
    ],
  },
  {
    name: "Lift + Run: Lower Body",
    description: "Squat-strength then a 2km run for conditioning. Classic hybrid session.",
    exercises: [
      { key: "SQUAT", name: "Barbell Back Squat", sets: 4, reps: 6, rest: 120 },
      { key: "RDL", name: "Romanian Deadlift", sets: 3, reps: 8, rest: 90 },
      { key: "BULGARIAN_SPLIT", name: "Bulgarian Split Squat", sets: 3, reps: 8, rest: 90 },
      { key: "CALF_RAISE", name: "Standing Calf Raise", sets: 3, reps: 15, rest: 45 },
    ],
  },
  {
    name: "Lift + Row: Upper Body",
    description: "Upper body strength followed by 1km row intervals.",
    exercises: [
      { key: "BENCH", name: "Barbell Bench Press", sets: 4, reps: 8, rest: 120 },
      { key: "ROW", name: "Barbell Row", sets: 4, reps: 8, rest: 90 },
      { key: "OHP", name: "Overhead Press", sets: 3, reps: 8, rest: 90 },
      { key: "FACE_PULL", name: "Face Pull", sets: 3, reps: 15, rest: 45 },
    ],
  },
  {
    name: "Strength Circuit + Rower",
    description: "Compound circuit superset with rower intervals for HYROX prep.",
    exercises: [
      { key: "SQUAT", name: "Barbell Back Squat", sets: 3, reps: 10, rest: 60 },
      { key: "PUSH_UP", name: "Push Up", sets: 3, reps: 15, rest: 60 },
      { key: "ROW", name: "Barbell Row", sets: 3, reps: 10, rest: 60 },
      { key: "BURPEE", name: "Burpee", sets: 3, reps: 10, rest: 60 },
    ],
  },
  {
    name: "Sled + Farmers Carry",
    description: "Sled push/pull simulation with heavy carries. Leg drive + grip.",
    exercises: [
      { key: "BULGARIAN_SPLIT", name: "Bulgarian Split Squat", sets: 3, reps: 8, rest: 90 },
      { key: "SQUAT", name: "Barbell Back Squat", sets: 3, reps: 8, rest: 120 },
      { key: "PULL_UP", name: "Pull Up", sets: 3, reps: 8, rest: 60 },
      { key: "PLANK", name: "Plank", sets: 3, reps: 1, rest: 45 },
    ],
  },
  {
    name: "HYROX Station Practice",
    description: "Practice the 8 HYROX stations. Wall balls, sled, burpee broad jumps, lunges, rower, farmers carry, ski erg, bike.",
    exercises: [
      { key: "SKIERG", name: "Ski Erg", sets: 3, reps: 1, rest: 90 },
      { key: "ASSAULT_BIKE", name: "Assault Bike Sprint", sets: 3, reps: 1, rest: 90 },
      { key: "ROWER", name: "Rowing Machine", sets: 3, reps: 1, rest: 90 },
      { key: "BURPEE", name: "Burpee", sets: 3, reps: 10, rest: 60 },
      { key: "SQUAT", name: "Barbell Back Squat", sets: 3, reps: 15, rest: 60 },
      { key: "HL_R", name: "Hanging Leg Raise", sets: 3, reps: 15, rest: 45 },
    ],
  },
  {
    name: "Wall Ball + Run Prep",
    description: "Squat endurance + push press + run intervals. Prep for HYROX wall balls.",
    exercises: [
      { key: "OHP", name: "Overhead Press", sets: 4, reps: 12, rest: 60 },
      { key: "SQUAT", name: "Barbell Back Squat", sets: 3, reps: 12, rest: 60 },
      { key: "DUMBBELL_OHP", name: "Seated Dumbbell Shoulder Press", sets: 3, reps: 12, rest: 60 },
      { key: "BURPEE", name: "Burpee", sets: 3, reps: 10, rest: 60 },
    ],
  },
  {
    name: "Olympic Power Day",
    description: "Explosive power for rate of force development. Clean + jerk variations.",
    exercises: [
      { key: "POWER_CLEAN", name: "Kettlebell Snatch", sets: 5, reps: 3, rest: 150 },
      { key: "PUSH_JERK", name: "Push Press", sets: 4, reps: 3, rest: 120 },
      { key: "HANG_CLEAN", name: "Kettlebell Swing", sets: 3, reps: 3, rest: 120 },
      { key: "BURPEE", name: "Burpee", sets: 3, reps: 5, rest: 60 },
    ],
  },
  {
    name: "Interval Run + Core",
    description: "Track-style intervals with core stability finisher.",
    exercises: [
      { key: "PLANK", name: "Plank", sets: 3, reps: 1, rest: 45 },
      { key: "HL_R", name: "Hanging Leg Raise", sets: 3, reps: 12, rest: 45 },
      { key: "BURPEE", name: "Burpee", sets: 3, reps: 10, rest: 60 },
    ],
  },
  {
    name: "Assault Bike + Bodyweight",
    description: "EMOM-style conditioning. Bike sprints + bodyweight calisthenics.",
    exercises: [
      { key: "ASSAULT_BIKE", name: "Assault Bike Sprint", sets: 5, reps: 1, rest: 60 },
      { key: "PUSH_UP", name: "Push Up", sets: 3, reps: 15, rest: 60 },
      { key: "PULL_UP", name: "Pull Up", sets: 3, reps: 8, rest: 60 },
      { key: "PLANK", name: "Plank", sets: 3, reps: 1, rest: 45 },
    ],
  },
];

// ─── Session definitions ──────────────────────────────────────────────
const SESSIONS = [
  {
    templateName: "Squat Focus — Strength",
    status: "completed",
    dateOffset: 2,
    durationMin: 55,
    notes: "Squat PR attempt. Felt strong, good depth.",
    exercises: [
      { key: "SQUAT", sets: [ { w: 80, r: 8, rpe: 6, warm: true }, { w: 100, r: 6, rpe: 7 }, { w: 120, r: 5, rpe: 8 }, { w: 135, r: 3, rpe: 9 }, { w: 145, r: 1, rpe: 10 } ] },
      { key: "RDL", sets: [ { w: 80, r: 10, rpe: 7 }, { w: 90, r: 8, rpe: 8 }, { w: 100, r: 6, rpe: 9 } ] },
      { key: "LEG_EXT", sets: [ { w: 55, r: 12, rpe: 7 }, { w: 65, r: 10, rpe: 8 }, { w: 65, r: 10, rpe: 9 } ] },
      { key: "HL_R", sets: [ { w: 1, r: 12, rpe: 7 }, { w: 1, r: 12, rpe: 8 }, { w: 1, r: 10, rpe: 9 } ] },
    ],
  },
  {
    templateName: "Deadlift Focus — Strength",
    status: "completed", dateOffset: 4, durationMin: 50,
    notes: "Conventional deadlift, felt explosive off the floor.",
    exercises: [
      { key: "DEADLIFT", sets: [ { w: 100, r: 5, rpe: 6, warm: true }, { w: 130, r: 5, rpe: 7 }, { w: 150, r: 3, rpe: 8 }, { w: 165, r: 2, rpe: 9 }, { w: 175, r: 1, rpe: 10 } ] },
      { key: "ROW", sets: [ { w: 70, r: 8, rpe: 7 }, { w: 80, r: 8, rpe: 8 }, { w: 85, r: 6, rpe: 9 }, { w: 70, r: 10, rpe: 8 } ] },
      { key: "PULL_UP", sets: [ { w: 1, r: 10, rpe: 7 }, { w: 1, r: 8, rpe: 8 }, { w: 1, r: 6, rpe: 9 } ] },
    ],
  },
  {
    templateName: "Lift + Run: Lower Body",
    status: "completed", dateOffset: 6, durationMin: 45,
    notes: "Squats felt heavy then a solid 2km tempo run after.",
    exercises: [
      { key: "SQUAT", sets: [ { w: 80, r: 8, rpe: 6, warm: true }, { w: 100, r: 6, rpe: 7 }, { w: 110, r: 5, rpe: 8 }, { w: 115, r: 4, rpe: 9 } ] },
      { key: "RDL", sets: [ { w: 70, r: 10, rpe: 7 }, { w: 80, r: 8, rpe: 8 }, { w: 85, r: 8, rpe: 8 } ] },
      { key: "BULGARIAN_SPLIT", sets: [ { w: 20, r: 8, rpe: 7 }, { w: 22, r: 8, rpe: 8 }, { w: 24, r: 6, rpe: 9 } ] },
      { key: "CALF_RAISE", sets: [ { w: 80, r: 15, rpe: 7 }, { w: 90, r: 12, rpe: 8 }, { w: 90, r: 12, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Upper Body Press — Strength",
    status: "completed", dateOffset: 8, durationMin: 48,
    notes: "Bench 1RM test. Finally got 110!",
    exercises: [
      { key: "BENCH", sets: [ { w: 60, r: 10, rpe: 6, warm: true }, { w: 80, r: 6, rpe: 7 }, { w: 90, r: 4, rpe: 8 }, { w: 100, r: 2, rpe: 9 }, { w: 110, r: 1, rpe: 10 } ] },
      { key: "OHP", sets: [ { w: 40, r: 8, rpe: 7 }, { w: 45, r: 6, rpe: 8 }, { w: 50, r: 5, rpe: 9 } ] },
      { key: "DIP", sets: [ { w: 1, r: 12, rpe: 7 }, { w: 1, r: 10, rpe: 8 }, { w: 1, r: 8, rpe: 9 } ] },
      { key: "LAT_RAISE", sets: [ { w: 12, r: 15, rpe: 7 }, { w: 14, r: 12, rpe: 8 }, { w: 14, r: 12, rpe: 9 } ] },
    ],
  },
  {
    templateName: "HYROX Station Practice",
    status: "completed", dateOffset: 10, durationMin: 42,
    notes: "Practiced HYROX transitions. Wall balls need work.",
    exercises: [
      { key: "SKIERG", sets: [ { w: 1, r: 1, rpe: 7 }, { w: 1, r: 1, rpe: 8 }, { w: 1, r: 1, rpe: 9 } ] },
      { key: "ROWER", sets: [ { w: 1, r: 1, rpe: 7 }, { w: 1, r: 1, rpe: 8 }, { w: 1, r: 1, rpe: 9 } ] },
      { key: "BURPEE", sets: [ { w: 1, r: 10, rpe: 7 }, { w: 1, r: 10, rpe: 8 }, { w: 1, r: 10, rpe: 9 } ] },
      { key: "SQUAT", sets: [ { w: 60, r: 15, rpe: 7 }, { w: 60, r: 15, rpe: 8 }, { w: 70, r: 12, rpe: 9 } ] },
    ],
  },
  {
    templateName: "Olympic Power Day",
    status: "completed", dateOffset: 12, durationMin: 50,
    notes: "Power cleans feeling snappy. 90kg PR.",
    exercises: [
      { key: "POWER_CLEAN", sets: [ { w: 50, r: 3, rpe: 6, warm: true }, { w: 65, r: 3, rpe: 7 }, { w: 75, r: 3, rpe: 8 }, { w: 85, r: 2, rpe: 9 }, { w: 90, r: 1, rpe: 10 } ] },
      { key: "PUSH_JERK", sets: [ { w: 50, r: 3, rpe: 7 }, { w: 55, r: 3, rpe: 8 }, { w: 60, r: 2, rpe: 9 }, { w: 65, r: 1, rpe: 10 } ] },
      { key: "BURPEE", sets: [ { w: 1, r: 5, rpe: 7 }, { w: 1, r: 5, rpe: 8 }, { w: 1, r: 5, rpe: 9 } ] },
    ],
  },
  {
    templateName: "Lift + Row: Upper Body",
    status: "completed", dateOffset: 14, durationMin: 47,
    notes: "Good pump on bench. Rower intervals kicked my ass.",
    exercises: [
      { key: "BENCH", sets: [ { w: 60, r: 10, rpe: 6 }, { w: 75, r: 8, rpe: 7 }, { w: 85, r: 6, rpe: 8 }, { w: 90, r: 4, rpe: 9 } ] },
      { key: "ROW", sets: [ { w: 65, r: 8, rpe: 7 }, { w: 75, r: 8, rpe: 8 }, { w: 80, r: 6, rpe: 8 } ] },
      { key: "OHP", sets: [ { w: 35, r: 8, rpe: 7 }, { w: 40, r: 6, rpe: 8 }, { w: 45, r: 5, rpe: 9 } ] },
    ],
  },
  {
    templateName: "Sled + Farmers Carry",
    status: "completed", dateOffset: 17, durationMin: 40,
    notes: "Full leg drive session. Split squats are brutal for HYROX prep.",
    exercises: [
      { key: "BULGARIAN_SPLIT", sets: [ { w: 18, r: 8, rpe: 7 }, { w: 20, r: 8, rpe: 8 }, { w: 22, r: 6, rpe: 9 } ] },
      { key: "SQUAT", sets: [ { w: 90, r: 8, rpe: 7 }, { w: 100, r: 6, rpe: 8 }, { w: 110, r: 5, rpe: 9 } ] },
      { key: "PULL_UP", sets: [ { w: 1, r: 8, rpe: 7 }, { w: 1, r: 6, rpe: 8 }, { w: 1, r: 5, rpe: 9 } ] },
      { key: "PLANK", sets: [ { w: 1, r: 1, rpe: 7 }, { w: 1, r: 1, rpe: 8 }, { w: 1, r: 1, rpe: 9 } ] },
    ],
  },
  {
    templateName: "Wall Ball + Run Prep",
    status: "completed", dateOffset: 19, durationMin: 45,
    notes: "High rep OHP + squats for wall ball endurance.",
    exercises: [
      { key: "OHP", sets: [ { w: 30, r: 12, rpe: 7 }, { w: 35, r: 10, rpe: 8 }, { w: 35, r: 10, rpe: 8 }, { w: 40, r: 8, rpe: 9 } ] },
      { key: "SQUAT", sets: [ { w: 70, r: 12, rpe: 7 }, { w: 80, r: 10, rpe: 8 }, { w: 80, r: 10, rpe: 8 } ] },
      { key: "BURPEE", sets: [ { w: 1, r: 10, rpe: 7 }, { w: 1, r: 10, rpe: 8 }, { w: 1, r: 10, rpe: 9 } ] },
    ],
  },
  {
    templateName: "Strength Circuit + Rower",
    status: "completed", dateOffset: 21, durationMin: 38,
    notes: "Circuit style — minimal rest between exercises. Great HYROX prep.",
    exercises: [
      { key: "SQUAT", sets: [ { w: 80, r: 10, rpe: 7 }, { w: 80, r: 10, rpe: 8 }, { w: 90, r: 8, rpe: 9 } ] },
      { key: "PUSH_UP", sets: [ { w: 1, r: 15, rpe: 7 }, { w: 1, r: 15, rpe: 8 }, { w: 1, r: 12, rpe: 9 } ] },
      { key: "ROW", sets: [ { w: 60, r: 10, rpe: 7 }, { w: 65, r: 8, rpe: 8 }, { w: 65, r: 8, rpe: 9 } ] },
      { key: "BURPEE", sets: [ { w: 1, r: 10, rpe: 7 }, { w: 1, r: 10, rpe: 8 }, { w: 1, r: 10, rpe: 9 } ] },
    ],
  },
  {
    templateName: "Assault Bike + Bodyweight",
    status: "completed", dateOffset: 24, durationMin: 35,
    notes: "EMOM conditioning. Bike sprints are brutal.",
    exercises: [
      { key: "ASSAULT_BIKE", sets: [ { w: 1, r: 1, rpe: 7 }, { w: 1, r: 1, rpe: 8 }, { w: 1, r: 1, rpe: 8 }, { w: 1, r: 1, rpe: 9 }, { w: 1, r: 1, rpe: 10 } ] },
      { key: "PUSH_UP", sets: [ { w: 1, r: 15, rpe: 7 }, { w: 1, r: 12, rpe: 8 }, { w: 1, r: 12, rpe: 9 } ] },
      { key: "PULL_UP", sets: [ { w: 1, r: 8, rpe: 7 }, { w: 1, r: 6, rpe: 8 }, { w: 1, r: 5, rpe: 9 } ] },
    ],
  },
  {
    templateName: "Interval Run + Core",
    status: "completed", dateOffset: 27, durationMin: 35,
    notes: "400m repeats at the track. Core finisher.",
    exercises: [
      { key: "PLANK", sets: [ { w: 1, r: 1, rpe: 7 }, { w: 1, r: 1, rpe: 8 }, { w: 1, r: 1, rpe: 9 } ] },
      { key: "HL_R", sets: [ { w: 1, r: 12, rpe: 7 }, { w: 1, r: 10, rpe: 8 }, { w: 1, r: 10, rpe: 9 } ] },
      { key: "BURPEE", sets: [ { w: 1, r: 10, rpe: 7 }, { w: 1, r: 10, rpe: 8 }, { w: 1, r: 10, rpe: 9 } ] },
    ],
  },
  // ── Older sessions for history depth ──
  {
    templateName: "Squat Focus — Strength",
    status: "completed", dateOffset: 30, durationMin: 50,
    notes: "Volume squat day. Building base for HYROX season.",
    exercises: [
      { key: "SQUAT", sets: [ { w: 70, r: 10, rpe: 6 }, { w: 90, r: 8, rpe: 7 }, { w: 100, r: 6, rpe: 8 }, { w: 100, r: 6, rpe: 8 } ] },
      { key: "RDL", sets: [ { w: 60, r: 10, rpe: 7 }, { w: 70, r: 8, rpe: 8 }, { w: 75, r: 8, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Upper Body Press — Strength",
    status: "completed", dateOffset: 33, durationMin: 45,
    notes: "Volume bench day. Lots of accessories.",
    exercises: [
      { key: "BENCH", sets: [ { w: 60, r: 10, rpe: 6 }, { w: 70, r: 8, rpe: 7 }, { w: 75, r: 6, rpe: 8 }, { w: 80, r: 5, rpe: 8 } ] },
      { key: "OHP", sets: [ { w: 30, r: 10, rpe: 7 }, { w: 35, r: 8, rpe: 8 }, { w: 40, r: 6, rpe: 8 } ] },
      { key: "LAT_RAISE", sets: [ { w: 10, r: 15, rpe: 7 }, { w: 10, r: 15, rpe: 8 }, { w: 12, r: 12, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Deadlift Focus — Strength",
    status: "completed", dateOffset: 36, durationMin: 48,
    notes: "Early prep deadlift. Building technique.",
    exercises: [
      { key: "DEADLIFT", sets: [ { w: 90, r: 5, rpe: 6 }, { w: 110, r: 5, rpe: 7 }, { w: 130, r: 3, rpe: 8 }, { w: 140, r: 2, rpe: 8 } ] },
      { key: "ROW", sets: [ { w: 60, r: 10, rpe: 7 }, { w: 65, r: 8, rpe: 8 }, { w: 70, r: 8, rpe: 8 } ] },
    ],
  },
  {
    templateName: "HYROX Station Practice",
    status: "completed", dateOffset: 40, durationMin: 38,
    notes: "First HYROX practice session. Learning the stations.",
    exercises: [
      { key: "ROWER", sets: [ { w: 1, r: 1, rpe: 7 }, { w: 1, r: 1, rpe: 8 }, { w: 1, r: 1, rpe: 8 } ] },
      { key: "BURPEE", sets: [ { w: 1, r: 8, rpe: 7 }, { w: 1, r: 8, rpe: 8 }, { w: 1, r: 8, rpe: 9 } ] },
      { key: "SQUAT", sets: [ { w: 50, r: 12, rpe: 7 }, { w: 50, r: 12, rpe: 8 }, { w: 60, r: 10, rpe: 8 } ] },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────
async function getAdminToken() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  if (!res.ok) throw new Error(`Admin auth failed: ${await res.text()}`);
  return (await res.json()).token;
}

async function exerciseLookup(headers) {
  const res = await fetch(`${PB_URL}/api/collections/exercises/records?perPage=200&sort=name`, { headers });
  const data = await res.json();
  const map = {};
  for (const ex of data.items) {
    map[ex.name] = ex.id;
  }
  return map;
}

async function findExistingTemplate(headers, name) {
  const encoded = encodeURIComponent(name);
  const res = await fetch(`${PB_URL}/api/collections/workout_templates/records?filter=(name='${encoded}')`, { headers });
  const data = await res.json();
  return data.items?.[0] || null;
}

async function create(headers, col, data) {
  const res = await fetch(`${PB_URL}/api/collections/${col}/records`, {
    method: "POST", headers, body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn(`  [WARN] ${col}: ${err.substring(0, 120)}`);
    return null;
  }
  return res.json();
}

async function deleteUserRecords(headers, col, userIdField, userId) {
  let hasMore = true;
  let deleted = 0;
  while (hasMore) {
    const filter = encodeURIComponent(`${userIdField}='${userId}'`);
    const res = await fetch(`${PB_URL}/api/collections/${col}/records?filter=${filter}&perPage=200`, { headers });
    const data = await res.json();
    const ids = (data.items || []).map(i => i.id);
    for (const id of ids) {
      await fetch(`${PB_URL}/api/collections/${col}/records/${id}`, { method: "DELETE", headers });
      deleted++;
    }
    hasMore = ids.length > 0;
  }
  return deleted;
}

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log("\n═══════════════════════════════════════");
  console.log("   The Hybrid Coach — Demo Data Seed");
  console.log("═══════════════════════════════════════");

  const token = await getAdminToken();
  const headers = { Authorization: token, "Content-Type": "application/json" };
  console.log("✓ Authenticated as admin");

  // Dynamic exercise ID lookup
  const exerciseByName = await exerciseLookup(headers);
  console.log(`✓ Found ${Object.keys(exerciseByName).length} exercises in PocketBase`);

  // Populate the E map
  const NAME_TO_KEY = {
    "Barbell Back Squat": "SQUAT",
    "Barbell Bench Press": "BENCH",
    "Deadlift": "DEADLIFT",
    "Overhead Press": "OHP",
    "Barbell Row": "ROW",
    "Dumbbell Bench Press": "DUMBBELL_BENCH",
    "Seated Dumbbell Shoulder Press": "DUMBBELL_OHP",
    "Romanian Deadlift": "RDL",
    "Pull Up": "PULL_UP",
    "Chest Dip": "DIP",
    "Bulgarian Split Squat": "BULGARIAN_SPLIT",
    "Dumbbell Lateral Raise": "LAT_RAISE",
    "Face Pull": "FACE_PULL",
    "Dumbbell Hammer Curl": "HAMMER_CURL",
    "Tricep Pushdown": "TRICEP_PUSHDOWN",
    "Leg Extension": "LEG_EXT",
    "Leg Curl": "LEG_CURL",
    "Standing Calf Raise": "CALF_RAISE",
    "Hanging Leg Raise": "HL_R",
    "Plank": "PLANK",
    "Glute Bridge": "GLUTE_BRIDGE",
    "Push Up": "PUSH_UP",
    "Burpee": "BURPEE",
    "Kettlebell Snatch": "POWER_CLEAN",
    "Kettlebell Swing": "HANG_CLEAN",
    "Push Press": "PUSH_JERK",
    "Rowing Machine": "ROWER",
    "Ski Erg": "SKIERG",
    "Assault Bike Sprint": "ASSAULT_BIKE",
    "Jump Rope": "JUMP_ROPE",
    "Bicep Curl": "BICEP_CURL",
  };

  for (const [name, key] of Object.entries(NAME_TO_KEY)) {
    const id = exerciseByName[name];
    if (!id) {
      console.warn(`  ⚠ Exercise not found: "${name}" — skipping`);
      continue;
    }
    E[key] = id;
  }

  const missingKeys = TEMPLATES.flatMap(t => t.exercises.map(e => e.key))
    .concat(SESSIONS.flatMap(s => s.exercises.map(e => e.key)))
    .filter(k => k && !E[k]);
  const uniqueMissing = [...new Set(missingKeys)];
  if (uniqueMissing.length > 0) {
    console.error(`\n❌ Missing exercise IDs for: ${uniqueMissing.join(", ")}`);
    console.error("   Check exercise names in PocketBase match the NAME_TO_KEY map.");
    process.exit(1);
  }
  console.log("✓ All exercise IDs resolved");

  // ─── Optional: clean test user data ──────────────────────────────
  if (CLEAN) {
    console.log("\n🧹 Cleaning test user data...");
    const delSets = await deleteUserRecords(headers, "exercise_sets", "workout_session_id", USER_ID);
    console.log(`   Deleted ${delSets} exercise_sets (for user's sessions)`);
    const delSessions = await deleteUserRecords(headers, "workout_sessions", "user_id", USER_ID);
    console.log(`   Deleted ${delSessions} sessions`);
    const delTmplEx = await deleteUserRecords(headers, "workout_template_exercises", "workout_template_id", USER_ID);
    // workout_template_exercises links by template ID, not user ID — handled via templates
    const delTemplates = await deleteUserRecords(headers, "workout_templates", "user_id", USER_ID);
    console.log(`   Deleted ${delTemplates} templates`);
  } else {
    console.log("\n📎 Additive mode — keeping existing data, only adding new templates/sessions");
  }

  // ─── Create templates ────────────────────────────────────────────
  console.log("\n=== Templates ===");
  let created = { templates: 0, sessions: 0, sets: 0 };

  for (const tmpl of TEMPLATES) {
    // Skip if template already exists for this user
    const existing = await findExistingTemplate(headers, tmpl.name);
    if (existing) {
      console.log(`  – ${tmpl.name} (exists, skipping)`);
      continue;
    }

    const t = await create(headers, "workout_templates", {
      user_id: USER_ID,
      name: tmpl.name,
      description: tmpl.description,
      is_public: false,
    });
    if (!t) continue;
    created.templates++;

    for (let i = 0; i < tmpl.exercises.length; i++) {
      const ex = tmpl.exercises[i];
      await create(headers, "workout_template_exercises", {
        workout_template_id: t.id,
        exercise_id: E[ex.key],
        sort_order: i + 1,
        target_sets: ex.sets,
        target_reps: ex.reps,
        rest_seconds: ex.rest,
      });
    }
    console.log(`  ✓ ${tmpl.name}`);
  }

  // ─── Create sessions ─────────────────────────────────────────────
  console.log("\n=== Sessions ===");

  // Build template name → ID map from what we just created + existing
  const allTemplatesRes = await fetch(
    `${PB_URL}/api/collections/workout_templates/records?perPage=200&sort=created`,
    { headers },
  );
  const allTemplates = (await allTemplatesRes.json()).items || [];
  const templateByName = {};
  for (const t of allTemplates) {
    templateByName[t.name] = t.id;
  }

  for (const sessionDef of SESSIONS) {
    const templateId = templateByName[sessionDef.templateName];
    if (!templateId) {
      console.warn(`  ⚠ Template "${sessionDef.templateName}" not found — skipping session`);
      continue;
    }

    const startedAt = daysAgo(sessionDef.dateOffset);
    const sess = await create(headers, "workout_sessions", {
      user_id: USER_ID,
      workout_template_id: templateId,
      status: sessionDef.status,
      started_at: startedAt,
      completed_at: startedAt,
      duration_minutes: sessionDef.durationMin,
      notes: sessionDef.notes || `Demo: ${sessionDef.templateName}`,
    });
    if (!sess) continue;
    created.sessions++;

    let setNumber = 1;
    for (const ex of sessionDef.exercises) {
      const exerciseId = E[ex.key];
      if (!exerciseId) {
        console.warn(`  ⚠ Exercise key "${ex.key}" not resolved — skipping sets`);
        continue;
      }
      for (const set of ex.sets) {
        await create(headers, "exercise_sets", {
          workout_session_id: sess.id,
          exercise_id: exerciseId,
          set_number: setNumber++,
          weight_kg: set.w,
          reps: set.r,
          rpe: set.rpe ?? null,
          is_warmup: set.warm ?? false,
          logged_at: startedAt,
        });
        created.sets++;
      }
    }
    console.log(`  ✓ ${sessionDef.templateName} (${sessionDef.dateOffset}d ago)`);
  }

  // ─── Summary ─────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════");
  console.log("   Done");
  console.log("═══════════════════════════════════════");
  console.log(`   Templates: ${created.templates}`);
  console.log(`   Sessions:  ${created.sessions}`);
  console.log(`   Sets:      ${created.sets}`);
  console.log(`   Total:     ${created.templates + created.sessions + created.sets} records`);
  console.log("\n   Login: test@test.com / test123456");
  console.log("   Philosophy: Hybrid Training — Strength + Endurance (The Hybrid Coach)\n");
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
