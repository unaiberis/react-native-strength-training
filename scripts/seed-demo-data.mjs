#!/usr/bin/env node
/**
 * Seed comprehensive demo data based on The Hybrid Coach methodology.
 * Hybrid training = strength + endurance/cardio (HYROX-focused).
 *
 * Usage: node scripts/seed-demo-data.mjs
 */

const PB_URL = process.env.PB_URL || "http://127.0.0.1:8090";
const ADMIN_EMAIL = "aitor@musikak.com";
const ADMIN_PASS = "entrenamentua2026";
const USER_ID = "yxk3lv734olsrux"; // test@test.com

// ─── Exercise ID references ─────────────────────────────────────────────
const E = {
  // Strength — main lifts
  SQUAT: "6gc8h7ruwa8e5gv",
  BENCH: "6n9ycrmr0uoww9n",
  DEADLIFT: "qqahjl4di38zr5w",
  OHP: "bz12qwaad61eyef",
  ROW: "61ze8brrhqd28rq",
  // Strength — accessories
  DUMBBELL_BENCH: "p9ql7a2ug6pmlzy",
  DUMBBELL_OHP: "5lnk3gcy5pruykt",
  RDL: "eypslbadsz3bmnz",
  PULL_UP: "twyjcxl9h450ag7",
  DIP: "otgjo0l1mvrimj5",
  BULGARIAN_SPLIT: "pjc94y6ronydp4j",
  LAT_RAISE: "17dclvpy4s21x3o",
  FACE_PULL: "aufdkl7g4oztv06",
  BICEP_CURL: "cl7ev412drmagfc",
  TRICEP_PUSHDOWN: "l4hg2mf03lycirh",
  HAMMER_CURL: "jd8j19zvgncayuc",
  LEG_EXT: "1l7v4f59coe5kba",
  LEG_CURL: "c0nj0r07kzwb8qd",
  CALF_RAISE: "dtnkbljgg2rizvh",
  HL_R: "pu5eagwk80c2z79", // Hanging Leg Raise
  PLANK: "lz8ez8xwafd592f",
  GLUTE_BRIDGE: "8i7mrc807yef7zy",
  PUSH_UP: "aebyhaq2iyzujwu",
  BURPEE: "trclz8m4n4v3la2",
  // Power / Olympic
  POWER_CLEAN: "ncjmrwf721c8wb9",
  HANG_CLEAN: "h0b5yq4y422lzs3",
  PUSH_JERK: "d8iqsztk073r3g6",
  // Cardio / HYROX
  ROWER: "p7rxr7kuo1ddizn",
  SKIERG: "yfqckq90vuovo5v",
  ASSAULT_BIKE: "8aj3l0163sggks2",
  JUMP_ROPE: "8x5y3i1zusizw1m",
};

async function main() {
  const adminRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  const { token } = await adminRes.json();
  const headers = { Authorization: token, "Content-Type": "application/json" };

  let created = { templates: 0, sessions: 0, sets: 0 };

  const create = async (col, data) => {
    const res = await fetch(`${PB_URL}/api/collections/${col}/records`, {
      method: "POST", headers, body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`  [WARN] ${col}: ${err.substring(0, 120)}`);
      return null;
    }
    return res.json();
  };

  // Clean existing data first
  for (const col of ["exercise_sets", "workout_sessions", "workout_template_exercises", "workout_templates"]) {
    let hasMore = true;
    while (hasMore) {
      const ids = await fetch(`${PB_URL}/api/collections/${col}/records?perPage=200&sort=created`, { headers })
        .then(r => r.json())
        .then(d => d.items?.map(i => i.id) || []);
      for (const id of ids) {
        await fetch(`${PB_URL}/api/collections/${col}/records/${id}`, { method: "DELETE", headers });
      }
      hasMore = ids.length > 0;
    }
  }
  console.log("Cleanup done.");

  // ================================================================
  // TEMPLATES — Hybrid Training Focus
  // ================================================================
  console.log("\n=== Templates ===");

  const templates = [
    // ── Strength Foundation ──────────────────────────────────────
    {
      name: "Squat Focus — Strength",
      description: "Main lift: Barbell Squat. Hybrid accessory + core finisher.",
      exercises: [
        { id: E.SQUAT, name: "Barbell Squat", sets: 4, reps: 6, rest: 150 },
        { id: E.RDL, name: "Romanian Deadlift", sets: 3, reps: 10, rest: 90 },
        { id: E.LEG_EXT, name: "Leg Extension", sets: 3, reps: 12, rest: 60 },
        { id: E.LEG_CURL, name: "Leg Curl", sets: 3, reps: 12, rest: 60 },
        { id: E.HL_R, name: "Hanging Leg Raise", sets: 3, reps: 12, rest: 45 },
        { id: E.CALF_RAISE, name: "Calf Raise", sets: 3, reps: 15, rest: 45 },
      ],
    },
    {
      name: "Deadlift Focus — Strength",
      description: "Conventional deadlift + back accessories + grip finisher",
      exercises: [
        { id: E.DEADLIFT, name: "Barbell Deadlift", sets: 4, reps: 5, rest: 180 },
        { id: E.ROW, name: "Barbell Row", sets: 4, reps: 8, rest: 90 },
        { id: E.PULL_UP, name: "Pull Up", sets: 3, reps: 8, rest: 90 },
        { id: E.FACE_PULL, name: "Face Pull", sets: 3, reps: 15, rest: 60 },
        { id: E.GLUTE_BRIDGE, name: "Glute Bridge", sets: 3, reps: 12, rest: 60 },
      ],
    },
    {
      name: "Upper Body Press — Strength",
      description: "Horizontal + vertical press with triceps and shoulders",
      exercises: [
        { id: E.BENCH, name: "Barbell Bench Press", sets: 4, reps: 8, rest: 120 },
        { id: E.OHP, name: "Overhead Press", sets: 3, reps: 8, rest: 90 },
        { id: E.DIP, name: "Dip", sets: 3, reps: 10, rest: 90 },
        { id: E.LAT_RAISE, name: "Dumbbell Lateral Raise", sets: 3, reps: 15, rest: 45 },
        { id: E.TRICEP_PUSHDOWN, name: "Tricep Pushdown", sets: 3, reps: 12, rest: 45 },
      ],
    },
    // ── Hybrid (Strength + Cardio) ───────────────────────────────
    {
      name: "Lift + Run: Lower Body",
      description: "Squat-strength then a 2km run for conditioning. Classic hybrid session.",
      exercises: [
        { id: E.SQUAT, name: "Barbell Squat", sets: 4, reps: 6, rest: 120 },
        { id: E.RDL, name: "Romanian Deadlift", sets: 3, reps: 8, rest: 90 },
        { id: E.BULGARIAN_SPLIT, name: "Bulgarian Split Squat", sets: 3, reps: 8, rest: 90 },
        { id: E.CALF_RAISE, name: "Calf Raise", sets: 3, reps: 15, rest: 45 },
      ],
    },
    {
      name: "Lift + Row: Upper Body",
      description: "Upper body strength followed by 1km row intervals.",
      exercises: [
        { id: E.BENCH, name: "Barbell Bench Press", sets: 4, reps: 8, rest: 120 },
        { id: E.ROW, name: "Barbell Row", sets: 4, reps: 8, rest: 90 },
        { id: E.OHP, name: "Overhead Press", sets: 3, reps: 8, rest: 90 },
        { id: E.FACE_PULL, name: "Face Pull", sets: 3, reps: 15, rest: 45 },
      ],
    },
    {
      name: "Strength Circuit + Rower",
      description: "Compound circuit superset with rower intervals for HYROX prep.",
      exercises: [
        { id: E.SQUAT, name: "Barbell Squat", sets: 3, reps: 10, rest: 60 },
        { id: E.PUSH_UP, name: "Push Up", sets: 3, reps: 15, rest: 60 },
        { id: E.ROW, name: "Barbell Row", sets: 3, reps: 10, rest: 60 },
        { id: E.BURPEE, name: "Burpee", sets: 3, reps: 10, rest: 60 },
      ],
    },
    {
      name: "Sled + Farmers Carry",
      description: "Sled push/pull simulation with heavy carries. Leg drive + grip.",
      exercises: [
        { id: E.BULGARIAN_SPLIT, name: "Bulgarian Split Squat", sets: 3, reps: 8, rest: 90 },
        { id: E.SQUAT, name: "Barbell Squat", sets: 3, reps: 8, rest: 120 },
        { id: E.PULL_UP, name: "Pull Up", sets: 3, reps: 8, rest: 60 },
        { id: E.PLANK, name: "Plank", sets: 3, reps: 1, rest: 45 },
      ],
    },
    // ── HYROX-Specific ───────────────────────────────────────────
    {
      name: "HYROX Station Practice",
      description: "Practice the 8 HYROX stations. Wall balls, sled, burpee broad jumps, lunges, rower, farmers carry, ski erg, bike.",
      exercises: [
        { id: E.SKIERG, name: "Ski Erg", sets: 3, reps: 1, rest: 90 },
        { id: E.ASSAULT_BIKE, name: "Assault Bike Sprint", sets: 3, reps: 1, rest: 90 },
        { id: E.ROWER, name: "Rowing Machine", sets: 3, reps: 1, rest: 90 },
        { id: E.BURPEE, name: "Burpee", sets: 3, reps: 10, rest: 60 },
        { id: E.SQUAT, name: "Barbell Squat", sets: 3, reps: 15, rest: 60 },
        { id: E.HL_R, name: "Hanging Leg Raise", sets: 3, reps: 15, rest: 45 },
      ],
    },
    {
      name: "Wall Ball + Run Prep",
      description: "Squat endurance + push press + run intervals. Prep for HYROX wall balls.",
      exercises: [
        { id: E.OHP, name: "Overhead Press", sets: 4, reps: 12, rest: 60 },
        { id: E.SQUAT, name: "Barbell Squat", sets: 3, reps: 12, rest: 60 },
        { id: E.DUMBBELL_OHP, name: "Dumbbell Shoulder Press", sets: 3, reps: 12, rest: 60 },
        { id: E.BURPEE, name: "Burpee", sets: 3, reps: 10, rest: 60 },
      ],
    },
    // ── Power / Olympic ──────────────────────────────────────────
    {
      name: "Olympic Power Day",
      description: "Explosive power for rate of force development. Clean + jerk variations.",
      exercises: [
        { id: E.POWER_CLEAN, name: "Power Clean", sets: 5, reps: 3, rest: 150 },
        { id: E.PUSH_JERK, name: "Push Jerk", sets: 4, reps: 3, rest: 120 },
        { id: E.HANG_CLEAN, name: "Hang Clean", sets: 3, reps: 3, rest: 120 },
        { id: E.BURPEE, name: "Burpee", sets: 3, reps: 5, rest: 60 },
      ],
    },
    // ── Conditioning ─────────────────────────────────────────────
    {
      name: "Interval Run + Core",
      description: "Track-style intervals with core stability finisher.",
      exercises: [
        { id: E.PLANK, name: "Plank", sets: 3, reps: 1, rest: 45 },
        { id: E.HL_R, name: "Hanging Leg Raise", sets: 3, reps: 12, rest: 45 },
        { id: E.BURPEE, name: "Burpee", sets: 3, reps: 10, rest: 60 },
      ],
    },
    {
      name: "Assault Bike + Bodyweight",
      description: "EMOM-style conditioning. Bike sprints + bodyweight calisthenics.",
      exercises: [
        { id: E.ASSAULT_BIKE, name: "Assault Bike Sprint", sets: 5, reps: 1, rest: 60 },
        { id: E.PUSH_UP, name: "Push Up", sets: 3, reps: 15, rest: 60 },
        { id: E.PULL_UP, name: "Pull Up", sets: 3, reps: 8, rest: 60 },
        { id: E.PLANK, name: "Plank", sets: 3, reps: 1, rest: 45 },
      ],
    },
  ];

  for (const tmpl of templates) {
    const t = await create("workout_templates", {
      user_id: USER_ID,
      name: tmpl.name,
      description: tmpl.description,
      is_public: false,
    });
    if (!t) continue;
    created.templates++;

    for (let i = 0; i < tmpl.exercises.length; i++) {
      const ex = tmpl.exercises[i];
      await create("workout_template_exercises", {
        workout_template_id: t.id,
        exercise_id: ex.id,
        sort_order: i + 1,
        target_sets: ex.sets,
        target_reps: ex.reps,
        rest_seconds: ex.rest,
      });
    }
    console.log(`  ✓ ${tmpl.name}`);
  }

  // ================================================================
  // SESSIONS — Hybrid Training History
  // ================================================================
  console.log("\n=== Sessions ===");

  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  const sessions = [
    // ── Squat PR week ──
    {
      templateName: "Squat Focus — Strength",
      status: "completed",
      dateOffset: 2,
      durationMin: 55,
      notes: "Squat PR attempt. Felt strong, good depth.",
      exercises: [
        { eid: E.SQUAT, sets: [
          { w: 80, r: 8, rpe: 6, warm: true },
          { w: 100, r: 6, rpe: 7 },
          { w: 120, r: 5, rpe: 8 },
          { w: 135, r: 3, rpe: 9 },
          { w: 145, r: 1, rpe: 10 },
        ]},
        { eid: E.RDL, sets: [
          { w: 80, r: 10, rpe: 7 },
          { w: 90, r: 8, rpe: 8 },
          { w: 100, r: 6, rpe: 9 },
        ]},
        { eid: E.LEG_EXT, sets: [
          { w: 55, r: 12, rpe: 7 },
          { w: 65, r: 10, rpe: 8 },
          { w: 65, r: 10, rpe: 9 },
        ]},
        { eid: E.HL_R, sets: [
          { w: 1, r: 12, rpe: 7 },
          { w: 1, r: 12, rpe: 8 },
          { w: 1, r: 10, rpe: 9 },
        ]},
      ],
    },
    // ── Deadlift hybrid ──
    {
      templateName: "Deadlift Focus — Strength",
      status: "completed",
      dateOffset: 4,
      durationMin: 50,
      notes: "Conventional deadlift, felt explosive off the floor.",
      exercises: [
        { eid: E.DEADLIFT, sets: [
          { w: 100, r: 5, rpe: 6, warm: true },
          { w: 130, r: 5, rpe: 7 },
          { w: 150, r: 3, rpe: 8 },
          { w: 165, r: 2, rpe: 9 },
          { w: 175, r: 1, rpe: 10 },
        ]},
        { eid: E.ROW, sets: [
          { w: 70, r: 8, rpe: 7 },
          { w: 80, r: 8, rpe: 8 },
          { w: 85, r: 6, rpe: 9 },
          { w: 70, r: 10, rpe: 8 },
        ]},
        { eid: E.PULL_UP, sets: [
          { w: 1, r: 10, rpe: 7 },
          { w: 1, r: 8, rpe: 8 },
          { w: 1, r: 6, rpe: 9 },
        ]},
      ],
    },
    // ── Hybrid: Lift + Run ──
    {
      templateName: "Lift + Run: Lower Body",
      status: "completed",
      dateOffset: 6,
      durationMin: 45,
      notes: "Squats felt heavy then a solid 2km tempo run after.",
      exercises: [
        { eid: E.SQUAT, sets: [
          { w: 80, r: 8, rpe: 6, warm: true },
          { w: 100, r: 6, rpe: 7 },
          { w: 110, r: 5, rpe: 8 },
          { w: 115, r: 4, rpe: 9 },
        ]},
        { eid: E.RDL, sets: [
          { w: 70, r: 10, rpe: 7 },
          { w: 80, r: 8, rpe: 8 },
          { w: 85, r: 8, rpe: 8 },
        ]},
        { eid: E.BULGARIAN_SPLIT, sets: [
          { w: 20, r: 8, rpe: 7 },
          { w: 22, r: 8, rpe: 8 },
          { w: 24, r: 6, rpe: 9 },
        ]},
        { eid: E.CALF_RAISE, sets: [
          { w: 80, r: 15, rpe: 7 },
          { w: 90, r: 12, rpe: 8 },
          { w: 90, r: 12, rpe: 8 },
        ]},
      ],
    },
    // ── Bench PR ──
    {
      templateName: "Upper Body Press — Strength",
      status: "completed",
      dateOffset: 8,
      durationMin: 48,
      notes: "Bench 1RM test. Finally got 110!",
      exercises: [
        { eid: E.BENCH, sets: [
          { w: 60, r: 10, rpe: 6, warm: true },
          { w: 80, r: 6, rpe: 7 },
          { w: 90, r: 4, rpe: 8 },
          { w: 100, r: 2, rpe: 9 },
          { w: 110, r: 1, rpe: 10 },
        ]},
        { eid: E.OHP, sets: [
          { w: 40, r: 8, rpe: 7 },
          { w: 45, r: 6, rpe: 8 },
          { w: 50, r: 5, rpe: 9 },
        ]},
        { eid: E.DIP, sets: [
          { w: 1, r: 12, rpe: 7 },
          { w: 1, r: 10, rpe: 8 },
          { w: 1, r: 8, rpe: 9 },
        ]},
        { eid: E.LAT_RAISE, sets: [
          { w: 12, r: 15, rpe: 7 },
          { w: 14, r: 12, rpe: 8 },
          { w: 14, r: 12, rpe: 9 },
        ]},
      ],
    },
    // ── HYROX Station Practice ──
    {
      templateName: "HYROX Station Practice",
      status: "completed",
      dateOffset: 10,
      durationMin: 42,
      notes: "Practiced HYROX transitions. Wall balls need work.",
      exercises: [
        { eid: E.SKIERG, sets: [
          { w: 1, r: 1, rpe: 7 },
          { w: 1, r: 1, rpe: 8 },
          { w: 1, r: 1, rpe: 9 },
        ]},
        { eid: E.ROWER, sets: [
          { w: 1, r: 1, rpe: 7 },
          { w: 1, r: 1, rpe: 8 },
          { w: 1, r: 1, rpe: 9 },
        ]},
        { eid: E.BURPEE, sets: [
          { w: 1, r: 10, rpe: 7 },
          { w: 1, r: 10, rpe: 8 },
          { w: 1, r: 10, rpe: 9 },
        ]},
        { eid: E.SQUAT, sets: [
          { w: 60, r: 15, rpe: 7 },
          { w: 60, r: 15, rpe: 8 },
          { w: 70, r: 12, rpe: 9 },
        ]},
      ],
    },
    // ── Olympic Power Day ──
    {
      templateName: "Olympic Power Day",
      status: "completed",
      dateOffset: 12,
      durationMin: 50,
      notes: "Power cleans feeling snappy. 90kg PR.",
      exercises: [
        { eid: E.POWER_CLEAN, sets: [
          { w: 50, r: 3, rpe: 6, warm: true },
          { w: 65, r: 3, rpe: 7 },
          { w: 75, r: 3, rpe: 8 },
          { w: 85, r: 2, rpe: 9 },
          { w: 90, r: 1, rpe: 10 },
        ]},
        { eid: E.PUSH_JERK, sets: [
          { w: 50, r: 3, rpe: 7 },
          { w: 55, r: 3, rpe: 8 },
          { w: 60, r: 2, rpe: 9 },
          { w: 65, r: 1, rpe: 10 },
        ]},
        { eid: E.BURPEE, sets: [
          { w: 1, r: 5, rpe: 7 },
          { w: 1, r: 5, rpe: 8 },
          { w: 1, r: 5, rpe: 9 },
        ]},
      ],
    },
    // ── Lift + Row Upper ──
    {
      templateName: "Lift + Row: Upper Body",
      status: "completed",
      dateOffset: 14,
      durationMin: 47,
      notes: "Good pump on bench. Rower intervals kicked my ass.",
      exercises: [
        { eid: E.BENCH, sets: [
          { w: 60, r: 10, rpe: 6 },
          { w: 75, r: 8, rpe: 7 },
          { w: 85, r: 6, rpe: 8 },
          { w: 90, r: 4, rpe: 9 },
        ]},
        { eid: E.ROW, sets: [
          { w: 65, r: 8, rpe: 7 },
          { w: 75, r: 8, rpe: 8 },
          { w: 80, r: 6, rpe: 8 },
        ]},
        { eid: E.OHP, sets: [
          { w: 35, r: 8, rpe: 7 },
          { w: 40, r: 6, rpe: 8 },
          { w: 45, r: 5, rpe: 9 },
        ]},
      ],
    },
    // ── Sled + Farmers ──
    {
      templateName: "Sled + Farmers Carry",
      status: "completed",
      dateOffset: 17,
      durationMin: 40,
      notes: "Full leg drive session. Split squats are brutal for HYROX prep.",
      exercises: [
        { eid: E.BULGARIAN_SPLIT, sets: [
          { w: 18, r: 8, rpe: 7 },
          { w: 20, r: 8, rpe: 8 },
          { w: 22, r: 6, rpe: 9 },
        ]},
        { eid: E.SQUAT, sets: [
          { w: 90, r: 8, rpe: 7 },
          { w: 100, r: 6, rpe: 8 },
          { w: 110, r: 5, rpe: 9 },
        ]},
        { eid: E.PULL_UP, sets: [
          { w: 1, r: 8, rpe: 7 },
          { w: 1, r: 6, rpe: 8 },
          { w: 1, r: 5, rpe: 9 },
        ]},
        { eid: E.PLANK, sets: [
          { w: 1, r: 1, rpe: 7 },
          { w: 1, r: 1, rpe: 8 },
          { w: 1, r: 1, rpe: 9 },
        ]},
      ],
    },
    // ── Wall Ball + Run Prep ──
    {
      templateName: "Wall Ball + Run Prep",
      status: "completed",
      dateOffset: 19,
      durationMin: 45,
      notes: "High rep OHP + squats for wall ball endurance.",
      exercises: [
        { eid: E.OHP, sets: [
          { w: 30, r: 12, rpe: 7 },
          { w: 35, r: 10, rpe: 8 },
          { w: 35, r: 10, rpe: 8 },
          { w: 40, r: 8, rpe: 9 },
        ]},
        { eid: E.SQUAT, sets: [
          { w: 70, r: 12, rpe: 7 },
          { w: 80, r: 10, rpe: 8 },
          { w: 80, r: 10, rpe: 8 },
        ]},
        { eid: E.BURPEE, sets: [
          { w: 1, r: 10, rpe: 7 },
          { w: 1, r: 10, rpe: 8 },
          { w: 1, r: 10, rpe: 9 },
        ]},
      ],
    },
    // ── Strength circuit + Rower ──
    {
      templateName: "Strength Circuit + Rower",
      status: "completed",
      dateOffset: 21,
      durationMin: 38,
      notes: "Circuit style — minimal rest between exercises. Great HYROX prep.",
      exercises: [
        { eid: E.SQUAT, sets: [
          { w: 80, r: 10, rpe: 7 },
          { w: 80, r: 10, rpe: 8 },
          { w: 90, r: 8, rpe: 9 },
        ]},
        { eid: E.PUSH_UP, sets: [
          { w: 1, r: 15, rpe: 7 },
          { w: 1, r: 15, rpe: 8 },
          { w: 1, r: 12, rpe: 9 },
        ]},
        { eid: E.ROW, sets: [
          { w: 60, r: 10, rpe: 7 },
          { w: 65, r: 8, rpe: 8 },
          { w: 65, r: 8, rpe: 9 },
        ]},
        { eid: E.BURPEE, sets: [
          { w: 1, r: 10, rpe: 7 },
          { w: 1, r: 10, rpe: 8 },
          { w: 1, r: 10, rpe: 9 },
        ]},
      ],
    },
    // ── Assault Bike + Bodyweight ──
    {
      templateName: "Assault Bike + Bodyweight",
      status: "completed",
      dateOffset: 24,
      durationMin: 35,
      notes: "EMOM conditioning. Bike sprints are brutal.",
      exercises: [
        { eid: E.ASSAULT_BIKE, sets: [
          { w: 1, r: 1, rpe: 7 },
          { w: 1, r: 1, rpe: 8 },
          { w: 1, r: 1, rpe: 8 },
          { w: 1, r: 1, rpe: 9 },
          { w: 1, r: 1, rpe: 10 },
        ]},
        { eid: E.PUSH_UP, sets: [
          { w: 1, r: 15, rpe: 7 },
          { w: 1, r: 12, rpe: 8 },
          { w: 1, r: 12, rpe: 9 },
        ]},
        { eid: E.PULL_UP, sets: [
          { w: 1, r: 8, rpe: 7 },
          { w: 1, r: 6, rpe: 8 },
          { w: 1, r: 5, rpe: 9 },
        ]},
      ],
    },
    // ── Interval Run + Core ──
    {
      templateName: "Interval Run + Core",
      status: "completed",
      dateOffset: 27,
      durationMin: 35,
      notes: "400m repeats at the track. Core finisher.",
      exercises: [
        { eid: E.PLANK, sets: [
          { w: 1, r: 1, rpe: 7 },
          { w: 1, r: 1, rpe: 8 },
          { w: 1, r: 1, rpe: 9 },
        ]},
        { eid: E.HL_R, sets: [
          { w: 1, r: 12, rpe: 7 },
          { w: 1, r: 10, rpe: 8 },
          { w: 1, r: 10, rpe: 9 },
        ]},
        { eid: E.BURPEE, sets: [
          { w: 1, r: 10, rpe: 7 },
          { w: 1, r: 10, rpe: 8 },
          { w: 1, r: 10, rpe: 9 },
        ]},
      ],
    },
    // ── Older sessions for history depth ──
    {
      templateName: "Squat Focus — Strength",
      status: "completed",
      dateOffset: 30,
      durationMin: 50,
      notes: "Volume squat day. Building base for HYROX season.",
      exercises: [
        { eid: E.SQUAT, sets: [
          { w: 70, r: 10, rpe: 6 },
          { w: 90, r: 8, rpe: 7 },
          { w: 100, r: 6, rpe: 8 },
          { w: 100, r: 6, rpe: 8 },
        ]},
        { eid: E.RDL, sets: [
          { w: 60, r: 10, rpe: 7 },
          { w: 70, r: 8, rpe: 8 },
          { w: 75, r: 8, rpe: 8 },
        ]},
      ],
    },
    {
      templateName: "Upper Body Press — Strength",
      status: "completed",
      dateOffset: 33,
      durationMin: 45,
      notes: "Volume bench day. Lots of accessories.",
      exercises: [
        { eid: E.BENCH, sets: [
          { w: 60, r: 10, rpe: 6 },
          { w: 70, r: 8, rpe: 7 },
          { w: 75, r: 6, rpe: 8 },
          { w: 80, r: 5, rpe: 8 },
        ]},
        { eid: E.OHP, sets: [
          { w: 30, r: 10, rpe: 7 },
          { w: 35, r: 8, rpe: 8 },
          { w: 40, r: 6, rpe: 8 },
        ]},
        { eid: E.LAT_RAISE, sets: [
          { w: 10, r: 15, rpe: 7 },
          { w: 10, r: 15, rpe: 8 },
          { w: 12, r: 12, rpe: 8 },
        ]},
      ],
    },
    {
      templateName: "Deadlift Focus — Strength",
      status: "completed",
      dateOffset: 36,
      durationMin: 48,
      notes: "Early prep deadlift. Building technique.",
      exercises: [
        { eid: E.DEADLIFT, sets: [
          { w: 90, r: 5, rpe: 6 },
          { w: 110, r: 5, rpe: 7 },
          { w: 130, r: 3, rpe: 8 },
          { w: 140, r: 2, rpe: 8 },
        ]},
        { eid: E.ROW, sets: [
          { w: 60, r: 10, rpe: 7 },
          { w: 65, r: 8, rpe: 8 },
          { w: 70, r: 8, rpe: 8 },
        ]},
      ],
    },
    {
      templateName: "HYROX Station Practice",
      status: "completed",
      dateOffset: 40,
      durationMin: 38,
      notes: "First HYROX practice session. Learning the stations.",
      exercises: [
        { eid: E.ROWER, sets: [
          { w: 1, r: 1, rpe: 7 },
          { w: 1, r: 1, rpe: 8 },
          { w: 1, r: 1, rpe: 8 },
        ]},
        { eid: E.BURPEE, sets: [
          { w: 1, r: 8, rpe: 7 },
          { w: 1, r: 8, rpe: 8 },
          { w: 1, r: 8, rpe: 9 },
        ]},
        { eid: E.SQUAT, sets: [
          { w: 50, r: 12, rpe: 7 },
          { w: 50, r: 12, rpe: 8 },
          { w: 60, r: 10, rpe: 8 },
        ]},
      ],
    },
  ];

  for (const sessionDef of sessions) {
    const startedAt = daysAgo(sessionDef.dateOffset);

    const sess = await create("workout_sessions", {
      user_id: USER_ID,
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
      for (const set of ex.sets) {
        await create("exercise_sets", {
          workout_session_id: sess.id,
          exercise_id: ex.eid,
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

  // ================================================================
  console.log("\n=== Done ===");
  console.log(`  Templates: ${created.templates}`);
  console.log(`  Sessions:  ${created.sessions}`);
  console.log(`  Sets:      ${created.sets}`);
  console.log(`  Total:     ${created.templates + created.sessions + created.sets} records`);
  console.log("\nLogin: test@test.com / test123456");
  console.log("Philosophy: Hybrid Training — Strength + Endurance (The Hybrid Coach)");
}

main().catch(console.error);
