#!/usr/bin/env node
/**
 * Seed teams, memberships, wellness, feedback, coach-sessions, and in_progress
 * session for the Team Model refactoring.
 *
 * NOT destructive by default — additive only. Use --clean to wipe all
 * team-related records first.
 *
 * Usage:
 *   node scripts/seed-teams.mjs
 *   node scripts/seed-teams.mjs --clean
 *
 * Environment variables (all optional):
 *   PB_URL         - PocketBase server URL (default: http://127.0.0.1:8090)
 *   PB_ADMIN_EMAIL - Admin email       (default: aitor@musikak.com)
 *   PB_ADMIN_PASS  - Admin password    (default: entrenamentua2026)
 */

const PB_URL = process.env.PB_URL || "http://127.0.0.1:8090";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || "admin@entrenamentua.com";
const ADMIN_PASS = process.env.PB_ADMIN_PASS || "test123456";

const CLEAN = process.argv.includes("--clean");

// ─── User definitions (resolved by email at runtime) ─────────────────
// Actual users in this PocketBase instance:
const USER_DEFS = [
  { email: "test@test.com",         displayName: "Test Athlete",    role: "athlete" },
  { email: "demo@test.com",         displayName: "Demo Athlete",    role: "athlete" },
  { email: "beginner@test.com",     displayName: "Beginner",        role: "athlete" },
  { email: "intermediate@test.com", displayName: "Intermediate",    role: "athlete" },
  { email: "elorzapaul2001@gmail.com", displayName: "Paul",         role: "coach" },
  { email: "unaiberis@gmail.com",   displayName: "Unai",            role: "coach" },
];

// ─── Team definitions ────────────────────────────────────────────────
const TEAMS = [
  {
    name: "Alpha Squad",
    description: "Strength-focused team — competition prep",
    members: [
      { email: "elorzapaul2001@gmail.com", role: "admin" },
      { email: "unaiberis@gmail.com",      role: "coach" },
      { email: "test@test.com",            role: "athlete" },
      { email: "demo@test.com",            role: "athlete" },
      { email: "beginner@test.com",        role: "athlete" },
    ],
  },
  {
    name: "Beta Squad",
    description: "Hybrid training — strength + endurance",
    members: [
      { email: "elorzapaul2001@gmail.com", role: "admin" },
      { email: "test@test.com",            role: "athlete" },
      { email: "intermediate@test.com",    role: "athlete" },
    ],
  },
  {
    name: "Dev Team",
    description: "Internal testing and QA team",
    members: [
      { email: "unaiberis@gmail.com",    role: "admin" },
      { email: "demo@test.com",          role: "athlete" },
      { email: "intermediate@test.com",  role: "athlete" },
    ],
  },
];

// ─── Wellness seed data (per athlete, last 30 days) ─────────────────
function generateWellnessEntry(athleteId, dateStr) {
  return {
    user_id: athleteId,
    date: dateStr,
    session_rpe: Math.round(3 + Math.random() * 5),       // 3-8
    sleep: Math.round(2 + Math.random() * 3),              // 2-5
    fatigue: Math.round(1 + Math.random() * 3),            // 1-4
    soreness: Math.round(1 + Math.random() * 3),           // 1-4
    mood: Math.round(3 + Math.random() * 2),               // 3-5
  };
}

// ─── Feedback seed data ──────────────────────────────────────────────
const FEEDBACK_ENTRIES = [
  { athlete: "test@test.com",         rating: 4, notes: "Great session, felt strong on squats" },
  { athlete: "demo@test.com",         rating: 3, notes: "Tired today, cut session short" },
  { athlete: "beginner@test.com",     rating: 5, notes: "PR on deadlift! Coach pushed me hard" },
  { athlete: "intermediate@test.com", rating: 4, notes: "Solid workout, good variety" },
];

// ─── Helpers ─────────────────────────────────────────────────────────

async function getAdminToken() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  if (!res.ok) throw new Error(`Admin auth failed: ${await res.text()}`);
  return (await res.json()).token;
}

async function resolveUsers(headers) {
  const res = await fetch(
    `${PB_URL}/api/collections/users/records?perPage=200`,
    { headers },
  );
  if (!res.ok) throw new Error(`Failed to list users: ${await res.text()}`);
  const data = await res.json();
  const byEmail = {};
  for (const u of data.items) {
    byEmail[u.email] = u;
  }
  return byEmail;
}

async function createRecord(headers, collection, data) {
  const res = await fetch(
    `${PB_URL}/api/collections/${collection}/records`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    console.warn(`  [WARN] ${collection}: ${err.substring(0, 120)}`);
    return null;
  }
  return res.json();
}

async function deleteAll(headers, collection, filter = "") {
  let deleted = 0;
  let hasMore = true;
  while (hasMore) {
    const url = `${PB_URL}/api/collections/${collection}/records?perPage=200${
      filter ? `&filter=${encodeURIComponent(filter)}` : ""
    }`;
    const res = await fetch(url, { headers });
    const data = await res.json();
    const ids = (data.items || []).map((i) => i.id);
    for (const id of ids) {
      await fetch(`${PB_URL}/api/collections/${collection}/records/${id}`, {
        method: "DELETE",
        headers,
      });
      deleted++;
    }
    hasMore = ids.length === 200;
  }
  return deleted;
}

async function listAll(headers, collection, filter = "") {
  const url = `${PB_URL}/api/collections/${collection}/records?perPage=200${
    filter ? `&filter=${encodeURIComponent(filter)}` : ""
  }`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function dateStrDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════");
  console.log("   Team Model — Seed Script");
  console.log("═══════════════════════════════════════\n");

  const token = await getAdminToken();
  const headers = {
    Authorization: token,
    "Content-Type": "application/json",
  };
  console.log("✓ Authenticated as admin");

  // Resolve users
  const usersByEmail = await resolveUsers(headers);
  const userRecords = {};
  for (const def of USER_DEFS) {
    const u = usersByEmail[def.email];
    if (!u) {
      console.warn(`  ⚠ User not found: "${def.email}" — skipping`);
      continue;
    }
    userRecords[def.email] = u;
  }
  console.log(`✓ Resolved ${Object.keys(userRecords).length}/${USER_DEFS.length} users`);

  // ─── Clean mode ──────────────────────────────────
  if (CLEAN) {
    console.log("\n🧹 Cleaning existing team-related records...");

    // Delete in dependency order — team-related only.
    // Templates, sessions, and sets are managed by seed-demo-data.mjs.
    const delProgAssign = await deleteAll(headers, "program_assignments");
    console.log(`   Deleted ${delProgAssign} program_assignments`);

    const delInvites = await deleteAll(headers, "team_invites");
    console.log(`   Deleted ${delInvites} team_invites`);

    const delMemberships = await deleteAll(headers, "team_memberships");
    console.log(`   Deleted ${delMemberships} team_memberships`);

    const delTeams = await deleteAll(headers, "teams");
    console.log(`   Deleted ${delTeams} teams`);

    console.log("   Clean complete.\n");
  } else {
    console.log("\n📎 Additive mode — will check for existing records before creating.\n");
  }

  // ─── 1. Create Teams + Memberships ───────────────
  console.log("=== Teams & Memberships ===");
  const existingTeams = await listAll(headers, "teams");
  const existingTeamNames = new Set(existingTeams.map((t) => t.name));
  const teamRecords = {};
  let teamsCreated = 0;
  let membershipsCreated = 0;

  for (const teamDef of TEAMS) {
    if (existingTeamNames.has(teamDef.name)) {
      console.log(`  – ${teamDef.name} (exists, skipping)`);
      // Still need the team record for reference
      const existing = existingTeams.find((t) => t.name === teamDef.name);
      teamRecords[teamDef.name] = existing;
      continue;
    }

    const creator = userRecords[teamDef.members[0].email];
    if (!creator) {
      console.warn(`  ⚠ Creator ${teamDef.members[0].email} not found, skipping team`);
      continue;
    }

    const team = await createRecord(headers, "teams", {
      name: teamDef.name,
      description: teamDef.description ?? null,
      created_by: creator.id,
    });
    if (!team) {
      console.warn(`  ⚠ Failed to create team "${teamDef.name}"`);
      continue;
    }
    teamRecords[teamDef.name] = team;
    teamsCreated++;

    // Create memberships
    for (const memberDef of teamDef.members) {
      const user = userRecords[memberDef.email];
      if (!user) {
        console.warn(`  ⚠ User "${memberDef.email}" not found, skipping membership`);
        continue;
      }
      const membership = await createRecord(headers, "team_memberships", {
        user_id: user.id,
        team_id: team.id,
        role: memberDef.role,
      });
      if (membership) membershipsCreated++;
    }
    console.log(`  ✓ ${teamDef.name} (${teamDef.members.length} members)`);
  }
  console.log(`   Teams: ${teamsCreated} created, Memberships: ${membershipsCreated} created`);

  // ─── 2. Create Program Assignments ───────────────
  console.log("\n=== Program Assignments ===");

  // Fetch existing templates to assign
  const allTemplates = await listAll(headers, "workout_templates");
  const athleteEmails = USER_DEFS.filter((u) => u.role === "athlete").map((u) => u.email);
  const coachEmails = USER_DEFS.filter((u) => u.role === "coach" || u.role === "admin").map((u) => u.email);

  // Assign first template (or any) to each athlete in their teams
  const existingAssignments = await listAll(headers, "program_assignments");
  const existingAssignmentKeys = new Set(
    existingAssignments.map((a) => `${a.athlete_id}:${a.template_id}:${(a.team_id || "")}`),
  );
  let assignmentsCreated = 0;

  for (const teamDef of TEAMS) {
    const team = teamRecords[teamDef.name];
    if (!team) continue;

    const teamAthletes = teamDef.members.filter((m) => m.role === "athlete");
    const teamCoaches = teamDef.members.filter(
      (m) => m.role === "coach" || m.role === "admin",
    );

    for (const athleteDef of teamAthletes) {
      const athlete = userRecords[athleteDef.email];
      if (!athlete) continue;

      for (const coachDef of teamCoaches) {
        const coach = userRecords[coachDef.email];
        if (!coach) continue;

        // Pick a template for this assignment
        const template = allTemplates.length > 0
          ? allTemplates[Math.floor(Math.random() * allTemplates.length)]
          : null;

        if (!template) {
          console.warn("  ⚠ No templates found, skipping program assignment");
          continue;
        }

        const key = `${athlete.id}:${template.id}:${team.id}`;
        if (existingAssignmentKeys.has(key)) continue;

        await createRecord(headers, "program_assignments", {
          athlete_id: athlete.id,
          coach_id: coach.id,
          template_id: template.id,
          team_id: team.id,
          assigned_at: dateStrDaysAgo(randomInt(1, 7)),
          started_at: dateStrDaysAgo(randomInt(1, 7)),
          status: "active",
        });
        assignmentsCreated++;
        existingAssignmentKeys.add(key);
      }
    }
  }
  console.log(`   Assignments: ${assignmentsCreated} created`);

  // ─── 3. Create Wellness Entries ─────────────────
  console.log("\n=== Wellness ===");

  // Collect existing entries keyed by athlete_id:date
  const existingWellnessList = await listAll(headers, "daily_wellness");
  const existingWellnessKeys = new Set(
    existingWellnessList.map((w) => `${w.user_id ?? w.athlete_id}:${w.date}`),
  );

  // Number of days to backfill (14-30, randomized once per run)
  const WELLNESS_DAYS = 14 + Math.floor(Math.random() * 17); // 14-30
  console.log(`   Backfilling ${WELLNESS_DAYS} days per athlete`);

  let wellnessCreated = 0;

  for (const athleteEmail of athleteEmails) {
    const athlete = userRecords[athleteEmail];
    if (!athlete) continue;

    let daysCreated = 0;
    for (let dayOffset = 0; dayOffset < WELLNESS_DAYS; dayOffset++) {
      const d = new Date();
      d.setDate(d.getDate() - dayOffset);
      const dateStr = d.toISOString().split("T")[0];

      const key = `${athlete.id}:${dateStr}`;
      if (existingWellnessKeys.has(key)) continue;

      const entry = generateWellnessEntry(athlete.id, dateStr);
      const result = await createRecord(headers, "daily_wellness", entry);
      if (result) {
        wellnessCreated++;
        daysCreated++;
        existingWellnessKeys.add(key);
      }
    }
    if (daysCreated > 0) {
      console.log(`  ✓ ${athlete.name || athlete.email} — ${daysCreated} entries over ${WELLNESS_DAYS} days`);
    } else {
      console.log(`  – ${athlete.name || athlete.email} (all ${WELLNESS_DAYS} days already exist)`);
    }
  }
  console.log(`   Wellness entries: ${wellnessCreated} created`);

  // ─── 4. Create Feedback ──────────────────────────
  console.log("\n=== Feedback ===");

  // Find completed sessions to attach feedback to
  const completedSessions = await listAll(
    headers,
    "workout_sessions",
    `status = 'completed'`,
  );
  const sessionById = {};
  for (const s of completedSessions) {
    if (!sessionById[s.user_id]) sessionById[s.user_id] = [];
    sessionById[s.user_id].push(s);
  }

  const existingFeedback = await listAll(headers, "workout_feedback");
  const existingFeedbackSessionIds = new Set(
    existingFeedback.map((f) => f.session_id),
  );
  let feedbackCreated = 0;

  for (const fbDef of FEEDBACK_ENTRIES) {
    const athlete = usersByEmail[fbDef.athlete];
    if (!athlete) {
      console.warn(`  ⚠ Athlete "${fbDef.athlete}" not found, skipping feedback`);
      continue;
    }

    // Find a completed session for this athlete
    const sessions = sessionById[athlete.id] || [];
    const availableSession = sessions.find(
      (s) => !existingFeedbackSessionIds.has(s.id),
    );
    if (!availableSession) {
      console.warn(`  ⚠ No available session for ${athlete.name || athlete.email}, skipping feedback`);
      continue;
    }

    await createRecord(headers, "workout_feedback", {
      athlete_id: athlete.id,
      workout_id: availableSession.id,
      rating: fbDef.rating,
      comment: fbDef.notes ?? null,
      synced: true,
    });
    existingFeedbackSessionIds.add(availableSession.id);
    feedbackCreated++;
    console.log(`  ✓ ${athlete.name || athlete.email} (rating: ${fbDef.rating})`);
  }
  console.log(`   Feedback entries: ${feedbackCreated} created`);

  // ─── 5. Create In-Progress Session ───────────────
  console.log("\n=== In-Progress Session ===");

  const testAthlete = userRecords["test@test.com"];
  if (testAthlete) {
    const existingInProgress = await listAll(
      headers,
      "workout_sessions",
      `user_id = '${testAthlete.id}' && status = 'in_progress'`,
    );

    if (existingInProgress.length > 0) {
      console.log(`  – test@test.com already has an in-progress session, skipping`);
    } else {
      // Pick a template
      const template = allTemplates.length > 0
        ? allTemplates[randomInt(0, allTemplates.length - 1)]
        : null;

      const session = await createRecord(headers, "workout_sessions", {
        user_id: testAthlete.id,
        workout_template_id: template ? template.id : null,
        status: "in_progress",
        started_at: daysAgo(0),
        completed_at: null,
        duration_minutes: null,
        notes: "In-progress demo session",
      });

      if (session) {
        console.log("  ✓ Created in-progress session for test@test.com");

        // Add some sets to the in-progress session
        if (template) {
          // Find template exercises
          const tmplExercises = await listAll(
            headers,
            "workout_template_exercises",
            `workout_template_id = '${template.id}'`,
          );

          let setNumber = 1;
          for (const te of tmplExercises.slice(0, 2)) {
            // Only add sets for first 2 exercises
            for (let s = 0; s < 2; s++) {
              await createRecord(headers, "exercise_sets", {
                workout_session_id: session.id,
                exercise_id: te.exercise_id,
                set_number: setNumber++,
                weight_kg: Math.round(40 + Math.random() * 60),
                reps: randomInt(6, 12),
                rpe: randomInt(6, 9),
                is_warmup: s === 0,
                logged_at: daysAgo(0),
              });
            }
          }
          console.log(`     Added ${setNumber - 1} sets across ${Math.min(tmplExercises.length, 2)} exercises`);
        }
      }
    }
  } else {
    console.warn("  ⚠ test@test.com not found, cannot create in-progress session");
  }

  // ─── 6. Team Invites ──────────────────────────────
  console.log("\n=== Team Invites ===");

  const alphaTeam = teamRecords["Alpha Squad"];
  if (alphaTeam) {
    const existingInvites = await listAll(
      headers,
      "team_invites",
      `team_id = '${alphaTeam.id}'`,
    );

    if (existingInvites.length > 0) {
      console.log("  – Alpha Squad already has invites, skipping");
    } else {
      const admin = userRecords["elorzapaul2001@gmail.com"];
      if (admin) {
        // Create one single-use invite valid for 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const invite = await createRecord(headers, "team_invites", {
          team_id: alphaTeam.id,
          code: "ALPHA24",
          role: "athlete",
          max_uses: 10,
          used_count: 0,
          expires_at: expiresAt.toISOString(),
          created_by: admin.id,
        });
        if (invite) console.log("  ✓ Created invite ALPHA24 for Alpha Squad (10 uses, 7 days)");
      }
    }
  }

  // ─── Summary ─────────────────────────────────────
  console.log("\n═══════════════════════════════════════");
  console.log("   Done");
  console.log("═══════════════════════════════════════");
  console.log(`   Teams created:         ${teamsCreated}`);
  console.log(`   Memberships created:   ${membershipsCreated}`);
  console.log(`   Assignments created:   ${assignmentsCreated}`);
  console.log(`   Wellness entries:      ${wellnessCreated}`);
  console.log(`   Feedback entries:      ${feedbackCreated}`);
  console.log("\n   Users:");
  for (const def of USER_DEFS) {
    const u = userRecords[def.email];
    if (u) {
      console.log(`     ${def.email.padEnd(28)} ${(u.name || def.displayName || "?").padEnd(14)} ${def.role}  (${u.id})`);
    } else {
      console.log(`     ${def.email.padEnd(28)} ${"(not found)"}`);
    }
  }
  console.log("\n   Next: run seed-demo-data.mjs for workout templates & sessions\n");
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
