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
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || "admin@entrenamentua.com";
const ADMIN_PASS = process.env.PB_ADMIN_PASS || "test123456";

const CLEAN = process.argv.includes("--clean");

// ─── User email → PB ID resolution (populated at runtime) ────────────
const USER_EMAILS = [
  "test@test.com",
  "beginner@test.com",
  "intermediate@test.com",
];
const usersById = {}; // email → { id, name, email }
const USER_EMAIL_TO_TYPE = {
  "test@test.com": "advanced",
  "beginner@test.com": "beginner",
  "intermediate@test.com": "intermediate",
};

// ─── Tempo map by exercise short key ─────────────────────────────────
const TEMPO_BY_KEY = {
  SQUAT: "30X0",
  DEADLIFT: "30X0",
  BENCH: "30X0",
  RDL: "20X0",
  ROW: "20X0",
  OHP: "20X0",
  PULL_UP: "20X0",
  CHIN_UP: "20X0",
  DIP: "20X0",
  BULGARIAN_SPLIT: "20X0",
  PUSH_UP: "2010",
  LEG_EXT: "2010",
  LEG_CURL: "2010",
  LAT_RAISE: "2010",
  CALF_RAISE: "2010",
  SEATED_CALF: "2010",
  FACE_PULL: "2010",
  HL_R: "20X0",
  PLANK: "20X0",
  GLUTE_BRIDGE: "2010",
  TRICEP_PUSHDOWN: "2010",
  HAMMER_CURL: "2010",
  BICEP_CURL: "2010",
  POWER_CLEAN: "20X0",
  PUSH_JERK: "20X0",
  HANG_CLEAN: "20X0",
  BURPEE: "20X0",
  ROWER: "20X0",
  SKIERG: "20X0",
  ASSAULT_BIKE: "20X0",
  JUMP_ROPE: "20X0",
  DUMBBELL_BENCH: "2010",
  DUMBBELL_ROW: "2010",
  DUMBBELL_OHP: "2010",
};

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
      { key: "SQUAT", name: "Barbell Squat", sets: 4, reps: 6, rest: 150, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "RDL", name: "Romanian Deadlift", sets: 3, reps: 10, rest: 90, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "LEG_EXT", name: "Leg Extension", sets: 3, reps: 12, rest: 60, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "LEG_CURL", name: "Leg Curl", sets: 3, reps: 12, rest: 60, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "HL_R", name: "Hanging Leg Raise", sets: 3, reps: 12, rest: 45, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "CALF_RAISE", name: "Calf Raise", sets: 3, reps: 15, rest: 45, target_rpe_low: 6, target_rpe_high: 8 },

    ],
  },
  {
    name: "Deadlift Focus — Strength",
    description: "Conventional deadlift + back accessories + grip finisher",
    exercises: [
      { key: "DEADLIFT", name: "Barbell Deadlift", sets: 4, reps: 5, rest: 180, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "ROW", name: "Barbell Row", sets: 4, reps: 8, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "PULL_UP", name: "Pull Up", sets: 3, reps: 8, rest: 90, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "FACE_PULL", name: "Face Pull", sets: 3, reps: 15, rest: 60, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "GLUTE_BRIDGE", name: "Glute Bridge", sets: 3, reps: 12, rest: 60, target_rpe_low: 7, target_rpe_high: 9 },

    ],
  },
  {
    name: "Upper Body Press — Strength",
    description: "Horizontal + vertical press with triceps and shoulders",
    exercises: [
      { key: "BENCH", name: "Barbell Bench Press", sets: 4, reps: 8, rest: 120, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "OHP", name: "Overhead Press", sets: 3, reps: 8, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "DIP", name: "Dip", sets: 3, reps: 10, rest: 90, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "LAT_RAISE", name: "Dumbbell Lateral Raise", sets: 3, reps: 15, rest: 45, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "TRICEP_PUSHDOWN", name: "Tricep Pushdown", sets: 3, reps: 12, rest: 45, target_rpe_low: 6, target_rpe_high: 8 },

    ],
  },
  {
    name: "Lift + Run: Lower Body",
    description: "Squat-strength then a 2km run for conditioning. Classic hybrid session.",
    exercises: [
      { key: "SQUAT", name: "Barbell Squat", sets: 4, reps: 6, rest: 120, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "RDL", name: "Romanian Deadlift", sets: 3, reps: 8, rest: 90, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "BULGARIAN_SPLIT", name: "Bulgarian Split Squat", sets: 3, reps: 8, rest: 90, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "CALF_RAISE", name: "Calf Raise", sets: 3, reps: 15, rest: 45, target_rpe_low: 6, target_rpe_high: 8 },

    ],
  },
  {
    name: "Lift + Row: Upper Body",
    description: "Upper body strength followed by 1km row intervals.",
    exercises: [
      { key: "BENCH", name: "Barbell Bench Press", sets: 4, reps: 8, rest: 120, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "ROW", name: "Barbell Row", sets: 4, reps: 8, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "OHP", name: "Overhead Press", sets: 3, reps: 8, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "FACE_PULL", name: "Face Pull", sets: 3, reps: 15, rest: 45, target_rpe_low: 6, target_rpe_high: 8 },

    ],
  },
  {
    name: "Strength Circuit + Rower",
    description: "Compound circuit superset with rower intervals for HYROX prep.",
    exercises: [
      { key: "SQUAT", name: "Barbell Squat", sets: 3, reps: 10, rest: 60, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "PUSH_UP", name: "Push Up", sets: 3, reps: 15, rest: 60, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "ROW", name: "Barbell Row", sets: 3, reps: 10, rest: 60, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "BURPEE", name: "Burpee", sets: 3, reps: 10, rest: 60, target_rpe_low: 7, target_rpe_high: 9 },

    ],
  },
  {
    name: "Sled + Farmers Carry",
    description: "Sled push/pull simulation with heavy carries. Leg drive + grip.",
    exercises: [
      { key: "BULGARIAN_SPLIT", name: "Bulgarian Split Squat", sets: 3, reps: 8, rest: 90, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "SQUAT", name: "Barbell Squat", sets: 3, reps: 8, rest: 120, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "PULL_UP", name: "Pull Up", sets: 3, reps: 8, rest: 60, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "PLANK", name: "Plank", sets: 3, reps: 1, rest: 45, target_rpe_low: 7, target_rpe_high: 9 },

    ],
  },
  {
    name: "HYROX Station Practice",
    description: "Practice the 8 HYROX stations. Wall balls, sled, burpee broad jumps, lunges, rower, farmers carry, ski erg, bike.",
    exercises: [
      { key: "SKIERG", name: "Ski Erg", sets: 3, reps: 1, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "ASSAULT_BIKE", name: "Assault Bike Sprint", sets: 3, reps: 1, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "ROWER", name: "Rowing Machine", sets: 3, reps: 1, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "BURPEE", name: "Burpee", sets: 3, reps: 10, rest: 60, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "SQUAT", name: "Barbell Squat", sets: 3, reps: 15, rest: 60, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "HL_R", name: "Hanging Leg Raise", sets: 3, reps: 15, rest: 45, target_rpe_low: 7, target_rpe_high: 9 },

    ],
  },
  {
    name: "Wall Ball + Run Prep",
    description: "Squat endurance + push press + run intervals. Prep for HYROX wall balls.",
    exercises: [
      { key: "OHP", name: "Overhead Press", sets: 4, reps: 12, rest: 60, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "SQUAT", name: "Barbell Squat", sets: 3, reps: 12, rest: 60, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "DUMBBELL_OHP", name: "Dumbbell Shoulder Press", sets: 3, reps: 12, rest: 60, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "BURPEE", name: "Burpee", sets: 3, reps: 10, rest: 60, target_rpe_low: 7, target_rpe_high: 9 },

    ],
  },
  {
    name: "Olympic Power Day",
    description: "Explosive power for rate of force development. Clean + jerk variations.",
    exercises: [
      { key: "POWER_CLEAN", name: "Power Clean", sets: 5, reps: 3, rest: 150, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "PUSH_JERK", name: "Push Jerk", sets: 4, reps: 3, rest: 120, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "HANG_CLEAN", name: "Hang Clean", sets: 3, reps: 3, rest: 120, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "BURPEE", name: "Burpee", sets: 3, reps: 5, rest: 60, target_rpe_low: 7, target_rpe_high: 9 },

    ],
  },
  {
    name: "Interval Run + Core",
    description: "Track-style intervals with core stability finisher.",
    exercises: [
      { key: "PLANK", name: "Plank", sets: 3, reps: 1, rest: 45, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "HL_R", name: "Hanging Leg Raise", sets: 3, reps: 12, rest: 45, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "BURPEE", name: "Burpee", sets: 3, reps: 10, rest: 60, target_rpe_low: 7, target_rpe_high: 9 },

    ],
  },
  {
    name: "Assault Bike + Bodyweight",
    description: "EMOM-style conditioning. Bike sprints + bodyweight calisthenics.",
    exercises: [
      { key: "ASSAULT_BIKE", name: "Assault Bike Sprint", sets: 5, reps: 1, rest: 60, target_rpe_low: 7, target_rpe_high: 9 },

      { key: "PUSH_UP", name: "Push Up", sets: 3, reps: 15, rest: 60, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "PULL_UP", name: "Pull Up", sets: 3, reps: 8, rest: 60, target_rpe_low: 6, target_rpe_high: 8 },

      { key: "PLANK", name: "Plank", sets: 3, reps: 1, rest: 45, target_rpe_low: 7, target_rpe_high: 9 },

    ],
  },

  // ── New templates (6) ─────────────────────────────────────────────
  {
    name: "Upper/Lower Split — Push",
    description: "Horizontal + vertical press with tricep and shoulder isolation.",
    exercises: [
      { key: "BENCH", name: "Barbell Bench Press", sets: 4, reps: 8, rest: 120, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "OHP", name: "Overhead Press", sets: 3, reps: 8, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "DIP", name: "Dip", sets: 3, reps: 10, rest: 90, target_rpe_low: 6, target_rpe_high: 8 },
      { key: "LAT_RAISE", name: "Dumbbell Lateral Raise", sets: 3, reps: 15, rest: 45, target_rpe_low: 6, target_rpe_high: 8 },
      { key: "TRICEP_PUSHDOWN", name: "Tricep Pushdown", sets: 3, reps: 12, rest: 45, target_rpe_low: 6, target_rpe_high: 8 },
    ],
  },
  {
    name: "Upper/Lower Split — Pull",
    description: "Vertical + horizontal pull with rear delt and bicep isolation.",
    exercises: [
      { key: "DEADLIFT", name: "Barbell Deadlift", sets: 4, reps: 5, rest: 180, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "ROW", name: "Barbell Row", sets: 4, reps: 8, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "PULL_UP", name: "Pull Up", sets: 3, reps: 8, rest: 90, target_rpe_low: 6, target_rpe_high: 8 },
      { key: "FACE_PULL", name: "Face Pull", sets: 3, reps: 15, rest: 60, target_rpe_low: 6, target_rpe_high: 8 },
      { key: "HAMMER_CURL", name: "Hammer Curl", sets: 3, reps: 12, rest: 60, target_rpe_low: 6, target_rpe_high: 8 },
    ],
  },
  {
    name: "Full Body Strength",
    description: "Compound full body session. Squat, bench, row, OHP, core. Balanced strength builder.",
    exercises: [
      { key: "SQUAT", name: "Barbell Squat", sets: 4, reps: 6, rest: 150, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "BENCH", name: "Barbell Bench Press", sets: 4, reps: 8, rest: 120, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "ROW", name: "Barbell Row", sets: 3, reps: 8, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "OHP", name: "Overhead Press", sets: 3, reps: 8, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "PLANK", name: "Plank", sets: 3, reps: 1, rest: 45, target_rpe_low: 7, target_rpe_high: 9 },
    ],
  },
  {
    name: "Cardio Conditioning",
    description: "High intensity conditioning workout. Rower, ski erg, bike sprints, burpees, jump rope.",
    exercises: [
      { key: "ROWER", name: "Rowing Machine", sets: 3, reps: 1, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "SKIERG", name: "Ski Erg", sets: 3, reps: 1, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "ASSAULT_BIKE", name: "Assault Bike Sprint", sets: 3, reps: 1, rest: 90, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "BURPEE", name: "Burpee", sets: 3, reps: 10, rest: 60, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "JUMP_ROPE", name: "Jump Rope", sets: 3, reps: 50, rest: 45, target_rpe_low: 7, target_rpe_high: 9 },
    ],
  },
  {
    name: "Accessory Hypertrophy",
    description: "Isolation work for legs, shoulders, and arms. High volume, short rest for pump and hypertrophy.",
    exercises: [
      { key: "LEG_EXT", name: "Leg Extension", sets: 4, reps: 12, rest: 60, target_rpe_low: 6, target_rpe_high: 8 },
      { key: "LEG_CURL", name: "Leg Curl", sets: 4, reps: 12, rest: 60, target_rpe_low: 6, target_rpe_high: 8 },
      { key: "CALF_RAISE", name: "Calf Raise", sets: 4, reps: 15, rest: 45, target_rpe_low: 6, target_rpe_high: 8 },
      { key: "LAT_RAISE", name: "Dumbbell Lateral Raise", sets: 4, reps: 15, rest: 45, target_rpe_low: 6, target_rpe_high: 8 },
      { key: "BICEP_CURL", name: "Dumbbell Bicep Curl", sets: 3, reps: 12, rest: 45, target_rpe_low: 6, target_rpe_high: 8 },
      { key: "TRICEP_PUSHDOWN", name: "Tricep Pushdown", sets: 3, reps: 12, rest: 45, target_rpe_low: 6, target_rpe_high: 8 },
    ],
  },
  {
    name: "Core + Stability",
    description: "Core focused session with planks, leg raises, glute bridges, and Bulgarian split squats for stability.",
    exercises: [
      { key: "PLANK", name: "Plank", sets: 4, reps: 1, rest: 45, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "HL_R", name: "Hanging Leg Raise", sets: 3, reps: 12, rest: 45, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "GLUTE_BRIDGE", name: "Glute Bridge", sets: 3, reps: 15, rest: 45, target_rpe_low: 7, target_rpe_high: 9 },
      { key: "BULGARIAN_SPLIT", name: "Bulgarian Split Squat", sets: 3, reps: 8, rest: 90, target_rpe_low: 6, target_rpe_high: 8 },
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

// ─── Beginner session definitions ──────────────────────────────────
// 10 sessions, lower weights, higher RIR (1-3), spanning ~40 days
const BEGINNER_SESSIONS = [
  {
    templateName: "Full Body Strength",
    status: "completed", dateOffset: 2, durationMin: 50,
    notes: "First full body session. Focus on form and bar path. Felt good.",
    exercises: [
      { key: "SQUAT", sets: [ { w: 40, r: 8, rpe: 6, warm: true }, { w: 50, r: 6, rpe: 7 }, { w: 55, r: 5, rpe: 7 }, { w: 60, r: 5, rpe: 8 } ] },
      { key: "BENCH", sets: [ { w: 30, r: 8, rpe: 6, warm: true }, { w: 35, r: 6, rpe: 7 }, { w: 40, r: 5, rpe: 8 }, { w: 45, r: 4, rpe: 8 } ] },
      { key: "ROW", sets: [ { w: 30, r: 8, rpe: 7 }, { w: 35, r: 8, rpe: 7 }, { w: 40, r: 6, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Upper Body Press — Strength",
    status: "completed", dateOffset: 5, durationMin: 45,
    notes: "Learning to brace on bench. Elbow position improved.",
    exercises: [
      { key: "BENCH", sets: [ { w: 25, r: 10, rpe: 6, warm: true }, { w: 35, r: 8, rpe: 7 }, { w: 40, r: 6, rpe: 7 }, { w: 40, r: 6, rpe: 8 } ] },
      { key: "OHP", sets: [ { w: 20, r: 8, rpe: 7 }, { w: 25, r: 6, rpe: 7 }, { w: 25, r: 6, rpe: 8 } ] },
      { key: "DIP", sets: [ { w: 1, r: 8, rpe: 7 }, { w: 1, r: 8, rpe: 8 }, { w: 1, r: 6, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Deadlift Focus — Strength",
    status: "completed", dateOffset: 8, durationMin: 48,
    notes: "Deadlift form work. Hip hinge is getting better.",
    exercises: [
      { key: "DEADLIFT", sets: [ { w: 50, r: 5, rpe: 6, warm: true }, { w: 60, r: 5, rpe: 7 }, { w: 70, r: 3, rpe: 7 }, { w: 80, r: 3, rpe: 8 } ] },
      { key: "ROW", sets: [ { w: 30, r: 10, rpe: 7 }, { w: 35, r: 8, rpe: 7 }, { w: 40, r: 6, rpe: 8 } ] },
      { key: "PULL_UP", sets: [ { w: 1, r: 5, rpe: 7 }, { w: 1, r: 5, rpe: 8 }, { w: 1, r: 4, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Squat Focus — Strength",
    status: "completed", dateOffset: 11, durationMin: 52,
    notes: "Squat depth improving. Staying upright on the ascent.",
    exercises: [
      { key: "SQUAT", sets: [ { w: 40, r: 8, rpe: 6, warm: true }, { w: 50, r: 6, rpe: 7 }, { w: 60, r: 5, rpe: 7 }, { w: 65, r: 5, rpe: 8 } ] },
      { key: "RDL", sets: [ { w: 35, r: 10, rpe: 7 }, { w: 40, r: 8, rpe: 7 }, { w: 45, r: 8, rpe: 8 } ] },
      { key: "LEG_EXT", sets: [ { w: 25, r: 12, rpe: 7 }, { w: 30, r: 10, rpe: 8 }, { w: 30, r: 10, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Upper/Lower Split — Push",
    status: "completed", dateOffset: 14, durationMin: 45,
    notes: "First push day. Tricep pushdowns felt really good.",
    exercises: [
      { key: "BENCH", sets: [ { w: 30, r: 8, rpe: 6, warm: true }, { w: 40, r: 6, rpe: 7 }, { w: 45, r: 5, rpe: 8 }, { w: 45, r: 4, rpe: 8 } ] },
      { key: "OHP", sets: [ { w: 20, r: 8, rpe: 7 }, { w: 25, r: 6, rpe: 7 }, { w: 30, r: 5, rpe: 8 } ] },
      { key: "LAT_RAISE", sets: [ { w: 6, r: 15, rpe: 7 }, { w: 8, r: 12, rpe: 8 }, { w: 8, r: 12, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Upper/Lower Split — Pull",
    status: "completed", dateOffset: 17, durationMin: 47,
    notes: "Learning to brace on deadlift. Hamstring engagement improving.",
    exercises: [
      { key: "DEADLIFT", sets: [ { w: 50, r: 5, rpe: 6, warm: true }, { w: 65, r: 5, rpe: 7 }, { w: 75, r: 3, rpe: 8 }, { w: 85, r: 2, rpe: 8 } ] },
      { key: "ROW", sets: [ { w: 35, r: 8, rpe: 7 }, { w: 40, r: 8, rpe: 7 }, { w: 45, r: 6, rpe: 8 } ] },
      { key: "FACE_PULL", sets: [ { w: 8, r: 15, rpe: 7 }, { w: 10, r: 12, rpe: 8 }, { w: 10, r: 12, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Full Body Strength",
    status: "completed", dateOffset: 20, durationMin: 50,
    notes: "Form feeling more consistent. Squat depth is good now.",
    exercises: [
      { key: "SQUAT", sets: [ { w: 45, r: 8, rpe: 6, warm: true }, { w: 55, r: 6, rpe: 7 }, { w: 65, r: 5, rpe: 8 }, { w: 70, r: 4, rpe: 8 } ] },
      { key: "BENCH", sets: [ { w: 30, r: 8, rpe: 6, warm: true }, { w: 40, r: 6, rpe: 7 }, { w: 45, r: 5, rpe: 8 } ] },
      { key: "PLANK", sets: [ { w: 1, r: 1, rpe: 7 }, { w: 1, r: 1, rpe: 8 }, { w: 1, r: 1, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Core + Stability",
    status: "completed", dateOffset: 24, durationMin: 40,
    notes: "Core felt stable. Bulgarian split squats are tough but form is improving.",
    exercises: [
      { key: "PLANK", sets: [ { w: 1, r: 1, rpe: 7 }, { w: 1, r: 1, rpe: 8 }, { w: 1, r: 1, rpe: 8 } ] },
      { key: "BULGARIAN_SPLIT", sets: [ { w: 10, r: 8, rpe: 7 }, { w: 12, r: 6, rpe: 8 }, { w: 12, r: 6, rpe: 8 } ] },
      { key: "GLUTE_BRIDGE", sets: [ { w: 1, r: 15, rpe: 7 }, { w: 1, r: 15, rpe: 8 }, { w: 1, r: 12, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Upper Body Press — Strength",
    status: "completed", dateOffset: 28, durationMin: 45,
    notes: "Feeling stronger on bench. Elbow tuck is more natural now.",
    exercises: [
      { key: "BENCH", sets: [ { w: 30, r: 10, rpe: 6, warm: true }, { w: 40, r: 8, rpe: 7 }, { w: 45, r: 6, rpe: 7 }, { w: 50, r: 5, rpe: 8 } ] },
      { key: "OHP", sets: [ { w: 22, r: 8, rpe: 7 }, { w: 27, r: 6, rpe: 7 }, { w: 30, r: 5, rpe: 8 } ] },
      { key: "TRICEP_PUSHDOWN", sets: [ { w: 10, r: 12, rpe: 7 }, { w: 12, r: 10, rpe: 8 }, { w: 12, r: 10, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Squat Focus — Strength",
    status: "completed", dateOffset: 32, durationMin: 50,
    notes: "Squat is feeling solid. Adding more weight next session.",
    exercises: [
      { key: "SQUAT", sets: [ { w: 45, r: 8, rpe: 6, warm: true }, { w: 60, r: 6, rpe: 7 }, { w: 70, r: 5, rpe: 8 }, { w: 75, r: 3, rpe: 9 } ] },
      { key: "RDL", sets: [ { w: 35, r: 10, rpe: 7 }, { w: 45, r: 8, rpe: 8 }, { w: 50, r: 6, rpe: 8 } ] },
      { key: "LEG_CURL", sets: [ { w: 20, r: 12, rpe: 7 }, { w: 25, r: 10, rpe: 8 }, { w: 25, r: 10, rpe: 8 } ] },
    ],
  },
];

// ─── Intermediate session definitions ──────────────────────────────
// 10 completed sessions, moderate weights, RIR 0-2, spanning ~40 days
const INTERMEDIATE_SESSIONS = [
  {
    templateName: "Squat Focus — Strength",
    status: "completed", dateOffset: 2, durationMin: 55,
    notes: "Solid squat session. Working on staying tight in the bottom.",
    exercises: [
      { key: "SQUAT", sets: [ { w: 60, r: 8, rpe: 6, warm: true }, { w: 80, r: 6, rpe: 7 }, { w: 90, r: 5, rpe: 8 }, { w: 100, r: 3, rpe: 9 }, { w: 105, r: 2, rpe: 9 } ] },
      { key: "RDL", sets: [ { w: 60, r: 10, rpe: 7 }, { w: 70, r: 8, rpe: 8 }, { w: 75, r: 8, rpe: 8 } ] },
      { key: "HL_R", sets: [ { w: 1, r: 12, rpe: 7 }, { w: 1, r: 12, rpe: 8 }, { w: 1, r: 10, rpe: 9 } ] },
    ],
  },
  {
    templateName: "Upper Body Press — Strength",
    status: "completed", dateOffset: 5, durationMin: 48,
    notes: "Bench felt good. Paused reps at the bottom for control.",
    exercises: [
      { key: "BENCH", sets: [ { w: 50, r: 8, rpe: 6, warm: true }, { w: 60, r: 6, rpe: 7 }, { w: 70, r: 5, rpe: 8 }, { w: 75, r: 3, rpe: 9 } ] },
      { key: "OHP", sets: [ { w: 30, r: 8, rpe: 7 }, { w: 35, r: 6, rpe: 8 }, { w: 40, r: 5, rpe: 8 } ] },
      { key: "LAT_RAISE", sets: [ { w: 10, r: 15, rpe: 7 }, { w: 10, r: 15, rpe: 8 }, { w: 12, r: 12, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Deadlift Focus — Strength",
    status: "completed", dateOffset: 8, durationMin: 50,
    notes: "Conventional deadlift. Bracing improving, felt explosive.",
    exercises: [
      { key: "DEADLIFT", sets: [ { w: 80, r: 5, rpe: 6, warm: true }, { w: 100, r: 5, rpe: 7 }, { w: 120, r: 3, rpe: 8 }, { w: 130, r: 2, rpe: 9 } ] },
      { key: "ROW", sets: [ { w: 55, r: 8, rpe: 7 }, { w: 60, r: 8, rpe: 8 }, { w: 65, r: 6, rpe: 8 } ] },
      { key: "PULL_UP", sets: [ { w: 1, r: 8, rpe: 7 }, { w: 1, r: 6, rpe: 8 }, { w: 1, r: 6, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Full Body Strength",
    status: "completed", dateOffset: 11, durationMin: 52,
    notes: "Full body day. Squats, bench, and rows — feeling well rounded.",
    exercises: [
      { key: "SQUAT", sets: [ { w: 60, r: 8, rpe: 6, warm: true }, { w: 80, r: 6, rpe: 7 }, { w: 95, r: 5, rpe: 8 }, { w: 100, r: 4, rpe: 9 } ] },
      { key: "BENCH", sets: [ { w: 50, r: 8, rpe: 6, warm: true }, { w: 65, r: 6, rpe: 7 }, { w: 70, r: 5, rpe: 8 } ] },
      { key: "ROW", sets: [ { w: 50, r: 8, rpe: 7 }, { w: 60, r: 6, rpe: 8 }, { w: 65, r: 6, rpe: 8 } ] },
      { key: "PLANK", sets: [ { w: 1, r: 1, rpe: 7 }, { w: 1, r: 1, rpe: 8 }, { w: 1, r: 1, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Upper/Lower Split — Pull",
    status: "completed", dateOffset: 14, durationMin: 50,
    notes: "Pull day. Deadlift volume with back accessories.",
    exercises: [
      { key: "DEADLIFT", sets: [ { w: 80, r: 5, rpe: 6, warm: true }, { w: 100, r: 5, rpe: 7 }, { w: 115, r: 3, rpe: 8 }, { w: 125, r: 2, rpe: 9 } ] },
      { key: "ROW", sets: [ { w: 55, r: 8, rpe: 7 }, { w: 65, r: 8, rpe: 8 }, { w: 70, r: 6, rpe: 8 } ] },
      { key: "FACE_PULL", sets: [ { w: 12, r: 15, rpe: 7 }, { w: 14, r: 12, rpe: 8 }, { w: 14, r: 12, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Upper/Lower Split — Push",
    status: "completed", dateOffset: 17, durationMin: 47,
    notes: "Push day. Bench volume with OHP and accessories. Good pump.",
    exercises: [
      { key: "BENCH", sets: [ { w: 50, r: 10, rpe: 6, warm: true }, { w: 65, r: 8, rpe: 7 }, { w: 70, r: 6, rpe: 8 }, { w: 75, r: 5, rpe: 8 } ] },
      { key: "OHP", sets: [ { w: 30, r: 8, rpe: 7 }, { w: 35, r: 6, rpe: 8 }, { w: 40, r: 5, rpe: 8 } ] },
      { key: "TRICEP_PUSHDOWN", sets: [ { w: 15, r: 12, rpe: 7 }, { w: 18, r: 10, rpe: 8 }, { w: 18, r: 10, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Squat Focus — Strength",
    status: "completed", dateOffset: 20, durationMin: 55,
    notes: "Squat volume. Added an extra working set. Legs are responding well.",
    exercises: [
      { key: "SQUAT", sets: [ { w: 60, r: 8, rpe: 6, warm: true }, { w: 80, r: 6, rpe: 7 }, { w: 90, r: 5, rpe: 8 }, { w: 100, r: 4, rpe: 8 }, { w: 105, r: 3, rpe: 9 } ] },
      { key: "RDL", sets: [ { w: 60, r: 10, rpe: 7 }, { w: 70, r: 8, rpe: 8 }, { w: 80, r: 6, rpe: 8 } ] },
      { key: "LEG_EXT", sets: [ { w: 40, r: 12, rpe: 7 }, { w: 45, r: 10, rpe: 8 }, { w: 45, r: 10, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Cardio Conditioning",
    status: "completed", dateOffset: 24, durationMin: 35,
    notes: "Tough conditioning session. Rower intervals were brutal.",
    exercises: [
      { key: "ROWER", sets: [ { w: 1, r: 1, rpe: 7 }, { w: 1, r: 1, rpe: 8 }, { w: 1, r: 1, rpe: 9 } ] },
      { key: "ASSAULT_BIKE", sets: [ { w: 1, r: 1, rpe: 7 }, { w: 1, r: 1, rpe: 8 }, { w: 1, r: 1, rpe: 9 } ] },
      { key: "BURPEE", sets: [ { w: 1, r: 10, rpe: 7 }, { w: 1, r: 10, rpe: 8 }, { w: 1, r: 10, rpe: 9 } ] },
    ],
  },
  {
    templateName: "Upper Body Press — Strength",
    status: "completed", dateOffset: 28, durationMin: 48,
    notes: "Bench 1RM attempt. Hit 90kg! Progress is real.",
    exercises: [
      { key: "BENCH", sets: [ { w: 50, r: 10, rpe: 6, warm: true }, { w: 65, r: 6, rpe: 7 }, { w: 75, r: 4, rpe: 8 }, { w: 85, r: 2, rpe: 9 }, { w: 90, r: 1, rpe: 10 } ] },
      { key: "OHP", sets: [ { w: 30, r: 8, rpe: 7 }, { w: 35, r: 6, rpe: 8 }, { w: 40, r: 5, rpe: 9 } ] },
      { key: "LAT_RAISE", sets: [ { w: 10, r: 15, rpe: 7 }, { w: 12, r: 12, rpe: 8 }, { w: 12, r: 12, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Deadlift Focus — Strength",
    status: "completed", dateOffset: 32, durationMin: 50,
    notes: "Deadlift PR attempt. Hit 150kg! Bracing is key.",
    exercises: [
      { key: "DEADLIFT", sets: [ { w: 80, r: 5, rpe: 6, warm: true }, { w: 100, r: 5, rpe: 7 }, { w: 120, r: 3, rpe: 8 }, { w: 140, r: 1, rpe: 9 }, { w: 150, r: 1, rpe: 10 } ] },
      { key: "ROW", sets: [ { w: 55, r: 8, rpe: 7 }, { w: 65, r: 8, rpe: 8 }, { w: 70, r: 6, rpe: 8 } ] },
      { key: "PULL_UP", sets: [ { w: 1, r: 8, rpe: 7 }, { w: 1, r: 7, rpe: 8 }, { w: 1, r: 6, rpe: 8 } ] },
    ],
  },
  {
    templateName: "Full Body Strength",
    status: "completed", dateOffset: 36, durationMin: 52,
    notes: "Solid full body day. Everything clicking. OHP feeling smoother.",
    exercises: [
      { key: "SQUAT", sets: [ { w: 60, r: 8, rpe: 6, warm: true }, { w: 80, r: 6, rpe: 7 }, { w: 95, r: 5, rpe: 8 }, { w: 105, r: 3, rpe: 9 } ] },
      { key: "BENCH", sets: [ { w: 50, r: 8, rpe: 6, warm: true }, { w: 65, r: 6, rpe: 7 }, { w: 75, r: 4, rpe: 8 }, { w: 80, r: 3, rpe: 9 } ] },
      { key: "OHP", sets: [ { w: 30, r: 8, rpe: 7 }, { w: 35, r: 6, rpe: 8 }, { w: 40, r: 4, rpe: 9 } ] },
    ],
  },
];

// ─── Intermediate in-progress session ──────────────────────────────
const INTERMEDIATE_IN_PROGRESS = {
  templateName: "Upper/Lower Split — Push",
  status: "in_progress",
  dateOffset: 0,
  durationMin: null,
  notes: "In-progress push day. Already logged 3 sets of bench and 2 sets of OHP. Feeling good.",
  exercises: [
    { key: "BENCH", sets: [ { w: 50, r: 10, rpe: 6, warm: true }, { w: 65, r: 6, rpe: 7 }, { w: 70, r: 5, rpe: 8 } ] },
    { key: "OHP", sets: [ { w: 30, r: 8, rpe: 7 }, { w: 35, r: 6, rpe: 8 } ] },
  ],
};

// ─── Enrichment helpers ───────────────────────────────────────────────

/**
 * Derive RIR (0-3) from RPE value. Higher RPE = lower RIR.
 */
function deriveRir(rpe) {
  if (rpe == null) return 2;
  return Math.max(0, Math.min(3, 10 - rpe));
}

/**
 * Look up tempo by exercise short key. Defaults to "20X0".
 */
function deriveTempo(key) {
  return TEMPO_BY_KEY[key] || "20X0";
}

/**
 * Derive target_rpe range from exercise short key.
 * Compounds: 7-9, Accessories: 6-8, Cardio: 7-9, Isometric: 7-9.
 */
function deriveRpeRange(key) {
  const compounds = new Set(["SQUAT", "DEADLIFT", "BENCH", "OHP", "ROW", "POWER_CLEAN", "PUSH_JERK", "HANG_CLEAN"]);
  const accessories = new Set(["LEG_EXT", "LEG_CURL", "LAT_RAISE", "CALF_RAISE", "SEATED_CALF",
    "FACE_PULL", "TRICEP_PUSHDOWN", "HAMMER_CURL", "BICEP_CURL", "DUMBBELL_BENCH", "DUMBBELL_ROW", "DUMBBELL_OHP"]);
  const isometric = new Set(["PLANK", "HL_R", "GLUTE_BRIDGE"]);
  if (compounds.has(key)) return { low: 7, high: 9 };
  if (isometric.has(key)) return { low: 7, high: 9 };
  if (key === "BURPEE" || key === "ROWER" || key === "SKIERG" || key === "ASSAULT_BIKE" || key === "JUMP_ROPE") {
    return { low: 7, high: 9 };
  }
  return { low: 6, high: 8 };
}

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
    "Barbell Squat": "SQUAT",
    "Barbell Bench Press": "BENCH",
    "Barbell Deadlift": "DEADLIFT",
    "Overhead Press": "OHP",
    "Barbell Row": "ROW",
    "Dumbbell Bench Press": "DUMBBELL_BENCH",
    "Dumbbell Shoulder Press": "DUMBBELL_OHP",
    "Romanian Deadlift": "RDL",
    "Pull Up": "PULL_UP",
    "Dip": "DIP",
    "Bulgarian Split Squat": "BULGARIAN_SPLIT",
    "Dumbbell Lateral Raise": "LAT_RAISE",
    "Face Pull": "FACE_PULL",
    "Hammer Curl": "HAMMER_CURL",
    "Tricep Pushdown": "TRICEP_PUSHDOWN",
    "Leg Extension": "LEG_EXT",
    "Leg Curl": "LEG_CURL",
    "Calf Raise": "CALF_RAISE",
    "Hanging Leg Raise": "HL_R",
    "Plank": "PLANK",
    "Glute Bridge": "GLUTE_BRIDGE",
    "Push Up": "PUSH_UP",
    "Burpee": "BURPEE",
    "Power Clean": "POWER_CLEAN",
    "Hang Clean": "HANG_CLEAN",
    "Push Jerk": "PUSH_JERK",
    "Rowing Machine": "ROWER",
    "Ski Erg": "SKIERG",
    "Assault Bike Sprint": "ASSAULT_BIKE",
    "Jump Rope": "JUMP_ROPE",
    "Dumbbell Bicep Curl": "BICEP_CURL",
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

  // ─── Resolve user IDs ───────────────────────────────────────────
  console.log("\n👤 Resolving users...");
  const allUsersRes = await fetch(
    `${PB_URL}/api/collections/users/records?perPage=200`,
    { headers },
  );
  const allUsersData = await allUsersRes.json();
  for (const u of (allUsersData.items || [])) {
    if (USER_EMAILS.includes(u.email)) {
      usersById[u.email] = u;
    }
  }
  for (const email of USER_EMAILS) {
    if (usersById[email]) {
      console.log(`  ✓ ${email} → ${usersById[email].id}`);
    } else {
      console.warn(`  ⚠ ${email} not found`);
    }
  }

  // ─── Optional: clean test user data ──────────────────────────────
  if (CLEAN) {
    console.log("\n🧹 Cleaning all user data...");
    for (const email of USER_EMAILS) {
      const user = usersById[email];
      if (!user) continue;
      const delSets = await deleteUserRecords(headers, "exercise_sets", "workout_session_id", user.id);
      console.log(`   ${email}: deleted ${delSets} exercise_sets`);
      const delSessions = await deleteUserRecords(headers, "workout_sessions", "user_id", user.id);
      console.log(`   ${email}: deleted ${delSessions} sessions`);
      const delTmplEx = await deleteUserRecords(headers, "workout_template_exercises", "workout_template_id", user.id);
      const delTemplates = await deleteUserRecords(headers, "workout_templates", "user_id", user.id);
      console.log(`   ${email}: deleted ${delTemplates} templates`);
    }
  } else {
    console.log("\n📎 Additive mode — keeping existing data, only adding new templates/sessions");
  }

  // ─── Create templates (per user) ─────────────────────────────────
  console.log("\n=== Templates ===");
  let created = { templates: 0, sessions: 0, sets: 0 };

  for (const email of USER_EMAILS) {
    const user = usersById[email];
    if (!user) continue;
    const userType = USER_EMAIL_TO_TYPE[email];

    for (const tmpl of TEMPLATES) {
      // Skip if template already exists for this user
      const existing = await findExistingTemplate(headers, tmpl.name);
      if (existing) {
        // Only skip if it's already assigned to THIS user
        if (existing.user_id === user.id) {
          console.log(`  – ${tmpl.name} (${email}): exists, skipping`);
          continue;
        }
      }

      const t = await create(headers, "workout_templates", {
        user_id: user.id,
        name: tmpl.name,
        description: tmpl.description,
        is_public: false,
      });
      if (!t) continue;
      created.templates++;

      for (let i = 0; i < tmpl.exercises.length; i++) {
        const ex = tmpl.exercises[i];
        const rpe = ex.target_rpe_low != null
          ? { low: ex.target_rpe_low, high: ex.target_rpe_high }
          : deriveRpeRange(ex.key);
        await create(headers, "workout_template_exercises", {
          workout_template_id: t.id,
          exercise_id: E[ex.key],
          sort_order: i + 1,
          target_sets: ex.sets,
          target_reps: ex.reps,
          rest_seconds: ex.rest,
          target_rpe_low: rpe.low,
          target_rpe_high: rpe.high,
        });
      }
      console.log(`  ✓ ${tmpl.name} → ${email}`);
    }
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

  // Define per-user session arrays
  const advancedSessions = SESSIONS; // existing SESSIONS are for advanced user
  const beginnerSessions = BEGINNER_SESSIONS;
  const intermediateSessions = INTERMEDIATE_SESSIONS;

  const userSessionMap = {
    "test@test.com":         { sessions: advancedSessions,        weightMod: 1.0,  rirOffset: 0 },
    "beginner@test.com":     { sessions: beginnerSessions,        weightMod: 0.55, rirOffset: 0 },
    "intermediate@test.com": { sessions: intermediateSessions,    weightMod: 0.8,  rirOffset: 0 },
  };

  for (const email of USER_EMAILS) {
    const user = usersById[email];
    if (!user) continue;
    const config = userSessionMap[email];
    if (!config) continue;

    for (const sessionDef of config.sessions) {
      const templateId = templateByName[sessionDef.templateName];
      if (!templateId) {
        console.warn(`  ⚠ Template "${sessionDef.templateName}" not found — skipping session for ${email}`);
        continue;
      }

      const startedAt = daysAgo(sessionDef.dateOffset);
      const sess = await create(headers, "workout_sessions", {
        user_id: user.id,
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
          const scaledWeight = Math.round(set.w * config.weightMod);
          await create(headers, "exercise_sets", {
            workout_session_id: sess.id,
            exercise_id: exerciseId,
            set_number: setNumber++,
            weight_kg: scaledWeight,
            reps: set.r,
            rpe: set.rpe ?? null,
            rir: set.rir ?? deriveRir(set.rpe),
            tempo: set.tempo ?? deriveTempo(ex.key),
            is_warmup: set.warm ?? false,
            logged_at: startedAt,
          });
          created.sets++;
        }
      }
      console.log(`  ✓ ${email}: ${sessionDef.templateName} (${sessionDef.dateOffset}d ago)`);
    }
  }

  // ─── Create in-progress session for intermediate user ───────────
  const intermediateUser = usersById["intermediate@test.com"];
  if (intermediateUser && INTERMEDIATE_IN_PROGRESS) {
    const ipSessionDef = INTERMEDIATE_IN_PROGRESS;
    const templateId = templateByName[ipSessionDef.templateName];
    const startedAt = daysAgo(ipSessionDef.dateOffset);

    // Check if already exists
    const existingIp = await fetch(
      `${PB_URL}/api/collections/workout_sessions/records?filter=${encodeURIComponent(`user_id='${intermediateUser.id}' && status='in_progress'`)}`,
      { headers },
    );
    const existingIpData = await existingIp.json();
    if (existingIpData.items?.length > 0) {
      console.log(`  – intermediate@test.com already has in-progress session, skipping`);
    } else {
      const sess = await create(headers, "workout_sessions", {
        user_id: intermediateUser.id,
        workout_template_id: templateId || null,
        status: "in_progress",
        started_at: startedAt,
        completed_at: null,
        duration_minutes: null,
        notes: ipSessionDef.notes,
      });
      if (sess) {
        created.sessions++;
        let setNumber = 1;
        for (const ex of ipSessionDef.exercises) {
          const exerciseId = E[ex.key];
          if (!exerciseId) continue;
          for (const set of ex.sets) {
            await create(headers, "exercise_sets", {
              workout_session_id: sess.id,
              exercise_id: exerciseId,
              set_number: setNumber++,
              weight_kg: set.w,
              reps: set.r,
              rpe: set.rpe ?? null,
              rir: set.rir ?? deriveRir(set.rpe),
              tempo: set.tempo ?? deriveTempo(ex.key),
              is_warmup: set.warm ?? false,
              logged_at: startedAt,
            });
            created.sets++;
          }
        }
        console.log(`  ✓ intermediate@test.com: in-progress session created`);
      }
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════");
  console.log("   Done");
  console.log("═══════════════════════════════════════");
  console.log(`   Templates: ${created.templates}`);
  console.log(`   Sessions:  ${created.sessions}`);
  console.log(`   Sets:      ${created.sets}`);
  console.log(`   Total:     ${created.templates + created.sessions + created.sets} records`);
  console.log("\n   Users: test@test.com / beginner@test.com / intermediate@test.com");
  console.log("   All passwords: test123456");
  console.log("   Philosophy: Hybrid Training — Strength + Endurance (The Hybrid Coach)\n");
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
