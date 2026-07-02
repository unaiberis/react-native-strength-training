#!/usr/bin/env node

/**
 * PocketBase Seed System — Deterministic, Reproducible, Validatable
 *
 * Generates demo data for 3 profiles:
 *   - Beginner: 16 weeks, fast newbie gains
 *   - Intermediate: 36 weeks, includes a plateau + breakout
 *   - Advanced: 78 weeks, 18 months of consistent training
 *
 * Usage:
 *   node scripts/seed/index.mjs
 *
 * Environment variables:
 *   PB_URL              - PocketBase URL (default: http://127.0.0.1:8090)
 *   PB_ADMIN_EMAIL      - Admin email (default: aitor@musikak.com)
 *   PB_ADMIN_PASS       - Admin password (default: entrenamentua2026)
 *   SEED_DATE=auto      - Use today's date as end date instead of fixed
 */

import { createPRNG } from './helpers/prng.mjs';
import {
  authenticate,
  createRecord,
  getAllRecords,
  deleteAllRecords,
  upsertRecord,
  findExisting,
  deleteRecord,
} from './helpers/api.mjs';
import {
  checkReferentialIntegrity,
  checkCompleteness,
  validateExercises,
} from './helpers/validators.mjs';
import { EXERCISES } from './data/exercises.mjs';
import { TEMPLATES } from './data/templates.mjs';
import { PROFILES } from './data/profiles.mjs';
import { generateSessions } from './generators/sessions.mjs';

const SEED = 'entrenamentua-demo-2026';
const DELAY_MS = 15;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('   PocketBase Seed System');
  console.log('   Deterministic · Reproducible · Multi-Profile');
  console.log('═══════════════════════════════════════════════════');
  console.log(`   Seed: ${SEED}`);
  console.log(
    `   Date mode: ${process.env.SEED_DATE === 'auto' ? 'DYNAMIC (today)' : 'FIXED (2026-06-30)'}`
  );
  console.log('');

  // ── 1. Authenticate ────────────────────────────────────────────────
  console.log('🔑 Step 1: Authenticating …');
  const auth = await authenticate();
  const { headers, baseUrl } = auth;
  console.log('   ✓ Authenticated as admin\n');

  // ── 2. Clean existing demo data ────────────────────────────────────
  console.log('🗑️  Step 2: Cleaning existing demo data …');
  for (const col of [
    'exercise_sets',
    'workout_sessions',
    'workout_template_exercises',
    'workout_templates',
  ]) {
    const count = await deleteAllRecords(col, headers, baseUrl);
    console.log(`   ✓ ${col}: ${count} records deleted`);
  }

  const oldExercises = await getAllRecords('exercises', '', headers, baseUrl);
  let deletedExercises = 0;
  for (const ex of oldExercises) {
    await deleteRecord('exercises', ex.id, headers, baseUrl);
    deletedExercises++;
  }
  if (deletedExercises > 0) {
    console.log(
      `   ✓ exercises: ${deletedExercises} records deleted (will recreate ${EXERCISES.length} fresh)`
    );
  }

  // Delete old users (except the admin's own record)
  const existingUsers = await getAllRecords('users', '', headers, baseUrl);
  for (const user of existingUsers) {
    if (
      PROFILES.some((p) => p.email === user.email) ||
      user.email === 'aitor@musikak.com'
    ) {
      // These will be reused or preserved
    }
  }

  console.log('');

  // ── 3. Validate exercise definitions ───────────────────────────────
  console.log('✓ Step 3: Validating exercise definitions …');
  const validation = validateExercises(EXERCISES);
  if (!validation.valid) {
    for (const issue of validation.issues) {
      console.warn(`   ⚠  ${issue}`);
    }
  }
  console.log(
    `   ✓ ${validation.count} exercises defined, ${validation.issues.length} issues\n`
  );

  // ── 4. Upsert exercises (shared across all profiles) ───────────────
  console.log('📚 Step 4: Upserting exercises (shared) …');
  const exerciseIdMap = {};
  let created = 0,
    errors = 0;

  for (let i = 0; i < EXERCISES.length; i++) {
    const ex = EXERCISES[i];
    const data = {
      name: ex.name,
      category: ex.category,
      body_region: ex.body_region || null,
      description: ex.description || null,
      default_sets: ex.default_sets,
      default_reps: ex.default_reps,
      default_rest_seconds: ex.default_rest_seconds,
      is_public: ex.is_public,
      equipment: ex.equipment || [],
    };

    try {
      const record = await upsertRecord(
        'exercises',
        'name',
        ex.name,
        data,
        headers,
        baseUrl
      );
      if (record) {
        exerciseIdMap[ex.name] = record.id;
        created++;
      } else {
        const found = await findExisting(
          'exercises',
          'name',
          ex.name,
          headers,
          baseUrl
        );
        if (found) {
          exerciseIdMap[ex.name] = found.id;
        } else {
          errors++;
        }
      }
    } catch (err) {
      console.warn(
        `   ✗ [${i + 1}/${EXERCISES.length}] ${ex.name}: ${err.message}`
      );
      errors++;
    }
    if ((i + 1) % 20 === 0) await sleep(DELAY_MS);
  }
  console.log(
    `   ✓ ${created} created, ${errors} errors, ${Object.keys(exerciseIdMap).length}/${EXERCISES.length} IDs mapped\n`
  );

  // ── 5-7. Per-profile pipeline ────────────────────────────────────
  const seedDateAuto = process.env.SEED_DATE === 'auto';
  let globalStats = {
    users: 0,
    exercises: EXERCISES.length,
    templates: 0,
    templateExercises: 0,
    sessions: 0,
    exerciseSets: 0,
    warmupSets: 0,
    workingSets: 0,
    personalRecordsDetectable: 0,
  };

  for (const profile of PROFILES) {
    console.log(`═══════════════════════════════════════════════════`);
    console.log(`   Profile: ${profile.id} (${profile.email})`);
    console.log(`   ${profile.weeks} weeks — ${profile.description}`);
    if (profile.plateau) {
      console.log(
        `   Plateau: weeks ${profile.plateau.startWeek}–${profile.plateau.endWeek}`
      );
    }
    console.log(`═══════════════════════════════════════════════════\n`);

    // ── 5a. Ensure user exists ────────────────────────────────────
    const existing = await findExisting(
      'users',
      'email',
      profile.email,
      headers,
      baseUrl
    );
    let userId;
    if (existing) {
      userId = existing.id;
    } else {
      const user = await createRecord(
        'users',
        {
          email: profile.email,
          password: profile.password,
          passwordConfirm: profile.password,
          emailVisibility: true,
          name: profile.name,
        },
        headers,
        baseUrl
      );
      if (user) {
        userId = user.id;
      } else {
        // Try auth to get existing record
        const loginRes = await fetch(
          `${baseUrl}/api/collections/users/auth-with-password`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identity: profile.email,
              password: profile.password,
            }),
          }
        );
        if (loginRes.ok) {
          const data = await loginRes.json();
          userId = data.record.id;
        } else {
          console.warn(`   ⚠  Failed to create/find user ${profile.email}`);
          continue;
        }
      }
    }
    console.log(`   ✓ User: ${profile.email} (${userId})`);

    // ── 5b. Create templates for this user ────────────────────────
    const existingUserTemplates = await getAllRecords(
      'workout_templates',
      `user_id = '${userId}'`,
      headers,
      baseUrl
    );
    const existingByName = {};
    for (const t of existingUserTemplates) existingByName[t.name] = t;

    const templateIdMap = {};
    let templateExCount = 0;

    for (const tmpl of TEMPLATES) {
      let tmplRecord = existingByName[tmpl.name] || null;
      if (!tmplRecord) {
        tmplRecord = await createRecord(
          'workout_templates',
          {
            user_id: userId,
            name: tmpl.name,
            description: tmpl.description || null,
            is_public: tmpl.is_public !== false,
          },
          headers,
          baseUrl
        );
      }
      if (!tmplRecord) {
        console.warn(`   ⚠  Failed to create template: ${tmpl.name}`);
        continue;
      }

      templateIdMap[tmpl.name] = tmplRecord.id;

      // Delete existing template exercises for this template
      const existingTE = await getAllRecords(
        'workout_template_exercises',
        `workout_template_id = '${tmplRecord.id}'`,
        headers,
        baseUrl
      );
      for (const te of existingTE) {
        await deleteRecord(
          'workout_template_exercises',
          te.id,
          headers,
          baseUrl
        );
      }

      // Create fresh
      let exCount = 0;
      for (let sortOrder = 0; sortOrder < tmpl.exercises.length; sortOrder++) {
        const exDef = tmpl.exercises[sortOrder];
        const exerciseId = exerciseIdMap[exDef.exerciseName];
        if (!exerciseId) {
          console.warn(
            `   ⚠  [${tmpl.name}] Exercise not found: "${exDef.exerciseName}"`
          );
          continue;
        }
        const teRecord = await createRecord(
          'workout_template_exercises',
          {
            workout_template_id: tmplRecord.id,
            exercise_id: exerciseId,
            sort_order: sortOrder + 1,
            target_sets: exDef.targetSets,
            target_reps: exDef.targetReps,
            target_rpe_low: exDef.targetRpeLow ?? null,
            target_rpe_high: exDef.targetRpeHigh ?? null,
            rest_seconds: exDef.restSeconds,
          },
          headers,
          baseUrl
        );
        if (teRecord) exCount++;
      }
      templateExCount += exCount;
      await sleep(DELAY_MS);
    }

    console.log(
      `   ✓ ${TEMPLATES.length} templates, ${templateExCount} template exercises`
    );
    globalStats.templates += TEMPLATES.length;
    globalStats.templateExercises += templateExCount;

    // ── 6. Generate sessions for this profile ─────────────────────
    const prng = createPRNG(SEED + '-' + profile.id);
    const options = {
      progressionOverrides: profile.progressionOverrides,
      plateau: profile.plateau,
      guaranteePR: true,
      noSkipLastWeeks: 3,
      seedDateAuto,
    };

    const sessions = generateSessions(
      TEMPLATES,
      templateIdMap,
      exerciseIdMap,
      userId,
      prng,
      profile.weeks,
      options
    );

    console.log(`   → ${sessions.length} sessions to create`);

    let sessionCount = 0;
    let setCount = 0;

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const startedAt = s.startedAt;
      const completedAt = new Date(
        new Date(startedAt).getTime() + s.durationMinutes * 60000
      ).toISOString();

      const sessRecord = await createRecord(
        'workout_sessions',
        {
          user_id: s.userId,
          workout_template_id: s.workoutTemplateId,
          status: s.status || 'completed',
          started_at: startedAt,
          completed_at: completedAt,
          duration_minutes: s.durationMinutes,
          notes: s.notes || null,
        },
        headers,
        baseUrl
      );

      if (!sessRecord) continue;
      sessionCount++;

      for (const set of s.exercises) {
        await createRecord(
          'exercise_sets',
          {
            workout_session_id: sessRecord.id,
            exercise_id: set.exerciseId,
            set_number: set.setNumber,
            weight_kg: set.weight_kg,
            reps: set.reps,
            rpe: set.rpe ?? null,
            is_warmup: set.is_warmup ?? false,
            logged_at: startedAt,
          },
          headers,
          baseUrl
        );
        setCount++;
      }

      if ((i + 1) % 50 === 0) {
        process.stdout.write(
          `   → Batch ${Math.floor((i + 1) / 50)}: ${i + 1}/${sessions.length} sessions, ${setCount} sets\n`
        );
        await sleep(DELAY_MS * 2);
      }
    }

    console.log(
      `   ✓ ${sessionCount} sessions · ${setCount} exercise sets created`
    );
    globalStats.sessions += sessionCount;
    globalStats.exerciseSets += setCount;

    // ── 7. Validate this profile ──────────────────────────────────
    console.log(`\n   ── Validation for ${profile.id} ──`);
    const integrity = await checkReferentialIntegrity(userId, headers, baseUrl);
    if (integrity.total === 0) {
      console.log('   ✓ Referential integrity: ALL FKs valid');
    } else {
      console.log('   ⚠  Broken references:', integrity.total);
    }

    const completeness = await checkCompleteness(userId, headers, baseUrl);
    globalStats.warmupSets += completeness.warmupSets;
    globalStats.workingSets += completeness.workingSets;
    globalStats.personalRecordsDetectable +=
      completeness.personalRecordsDetectable;

    console.log(
      `   ✓ Sessions: ${completeness.sessions}, Sets: ${completeness.exerciseSets}, PRs: ${completeness.personalRecordsDetectable}`
    );
    console.log('');
  }

  // ══════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ══════════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════');
  console.log('   Seed Complete — All Profiles');
  console.log('═══════════════════════════════════════════════════');

  for (const profile of PROFILES) {
    console.log(`   ${profile.id}: ${profile.email} / ${profile.password}`);
  }

  console.log('');
  console.log(`   Exercises:          ${globalStats.exercises}`);
  console.log(`   Templates:          ${globalStats.templates}`);
  console.log(`   Template Exercises: ${globalStats.templateExercises}`);
  console.log(`   Sessions:           ${globalStats.sessions}`);
  console.log(`   Exercise Sets:      ${globalStats.exerciseSets}`);
  console.log(`   Warmup Sets:        ${globalStats.warmupSets}`);
  console.log(`   Working Sets:       ${globalStats.workingSets}`);
  console.log(
    `   PR Detectable:      ${globalStats.personalRecordsDetectable}`
  );
  console.log('');
  console.log(`   Seed: ${SEED}`);
  console.log(`   Date mode: ${seedDateAuto ? 'dynamic' : 'fixed'}`);
  console.log('');
  console.log('   To verify: node scripts/verify-seed.mjs');
  console.log('');

  process.exit(0);
}

main().catch((err) => {
  console.error(`\n❌ FATAL: ${err.message}`);
  if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
  process.exit(1);
});
