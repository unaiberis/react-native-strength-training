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
const ADMIN_EMAIL  = process.env.PB_ADMIN_EMAIL  || 'aitor@musikak.com';
const ADMIN_PASS   = process.env.PB_ADMIN_PASS   || 'entrenamentua2026';
const SEED_FILE    = process.env.SEED_FILE || join(ROOT, 'supabase', 'seed.sql');

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

    const body = {
      name:               ex.name,
      category:           ex.category,
      equipment:          JSON.stringify(ex.equipment || []),
      body_region:        ex.body_region,
      description:        ex.description || '',
      video_url:          ex.video_url || '',
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
