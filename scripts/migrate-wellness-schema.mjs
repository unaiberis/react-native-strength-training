#!/usr/bin/env node
/**
 * Migrate `daily_wellness` collection schema from old fields
 * (athlete_id, rpe, sleep_quality, energy) to new fields
 * (user_id, session_rpe, sleep, fatigue, soreness, mood, session_id).
 *
 * Usage:
 *   node scripts/migrate-wellness-schema.mjs
 *
 * Environment variables (all optional):
 *   PB_URL         - PocketBase server URL (default: http://127.0.0.1:8090)
 *   PB_ADMIN_EMAIL - Admin email       (default: admin@entrenamentua.com)
 *   PB_ADMIN_PASS  - Admin password    (default: test123456)
 */

const PB_URL = process.env.PB_URL || "http://127.0.0.1:8090";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || "admin@entrenamentua.com";
const ADMIN_PASS = process.env.PB_ADMIN_PASS || "test123456";
const COLLECTION = "daily_wellness";

// ─── Helpers ─────────────────────────────────────────────────────────────

async function getAdminToken() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Auth failed: ${err.substring(0, 200)}`);
  }
  const data = await res.json();
  return data.token;
}

async function getCollection(headers, name) {
  const res = await fetch(`${PB_URL}/api/collections/${name}`, { headers });
  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.text();
    throw new Error(`Get collection failed: ${err.substring(0, 200)}`);
  }
  return res.json();
}

async function updateCollection(headers, name, data) {
  const res = await fetch(`${PB_URL}/api/collections/${name}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Update collection failed: ${err.substring(0, 200)}`);
  }
  return res.json();
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

async function updateRecord(headers, collection, id, data) {
  const res = await fetch(
    `${PB_URL}/api/collections/${collection}/records/${id}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    console.warn(`  [WARN] Failed to update ${id}: ${err.substring(0, 100)}`);
  }
  return res.json();
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔧 Migrating "${COLLECTION}" schema on ${PB_URL}\n`);

  // 1. Authenticate as admin
  const token = await getAdminToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  console.log("  ✓ Admin authenticated\n");

  // 2. Check if collection exists
  const collection = await getCollection(headers, COLLECTION);
  if (!collection) {
    // Collection doesn't exist — nothing to migrate. The seed will create it.
    console.log(`  ℹ️  Collection "${COLLECTION}" does not exist.`);
    console.log(`     Create it by running: npm run seed:teams\n`);
    return;
  }
  console.log(`  ✓ Collection "${COLLECTION}" exists (${collection.name})\n`);

  // 3. Detect which schema the collection currently has
  const hasOldFields = collection.fields?.some(
    (f) => f.name === "athlete_id" || f.name === "rpe" || f.name === "sleep_quality",
  );
  const hasNewFields = collection.fields?.some(
    (f) => f.name === "user_id" || f.name === "session_rpe",
  );

  console.log(`  Schema detection:`);
  console.log(`    Has old fields (athlete_id, rpe, sleep_quality, energy): ${hasOldFields ? "YES" : "no"}`);
  console.log(`    Has new fields (user_id, session_rpe, sleep, fatigue):  ${hasNewFields ? "YES" : "no"}`);

  if (hasNewFields && !hasOldFields) {
    console.log(`\n  ✅ Schema already up to date. Nothing to do.\n`);
    return;
  }

  if (!hasOldFields && !hasNewFields) {
    console.log(`\n  ❓ Unknown schema — neither old nor new fields detected. Aborting.\n`);
    return;
  }

  // 4. Build the new field list — keep non-conflicting fields, replace old ones
  const keptFields = collection.fields.filter(
    (f) =>
      !["athlete_id", "rpe", "sleep_quality", "energy"].includes(f.name) &&
      !f.name.startsWith("_"),
  );

  const newFields = [
    ...keptFields.filter((f) => f.name !== "user_id" && f.name !== "session_rpe"),
    // id, created, updated are auto-managed by PocketBase
    { name: "user_id", type: "text", required: true, indexed: true },
    { name: "date", type: "date", required: true },
    { name: "session_rpe", type: "number", min: 1, max: 10 },
    { name: "sleep", type: "number", min: 1, max: 5 },
    { name: "fatigue", type: "number", min: 1, max: 5 },
    { name: "soreness", type: "number", min: 1, max: 5 },
    { name: "mood", type: "number", min: 1, max: 5 },
    { name: "session_id", type: "text" },
  ];

  console.log(`\n  Updating schema fields...`);
  await updateCollection(headers, COLLECTION, { fields: newFields });
  console.log(`  ✓ Schema updated\n`);

  // 5. Migrate existing records (map old field values to new ones)
  const existingRecords = await listAll(headers, COLLECTION);
  console.log(`  Migrating ${existingRecords.length} existing records...`);

  let migrated = 0;
  for (const record of existingRecords) {
    const patch = {};
    const hasOldData = record.athlete_id || record.rpe != null || record.sleep_quality != null;

    if (!hasOldData) continue;

    if (record.athlete_id && !record.user_id) {
      patch.user_id = record.athlete_id;
    }
    if (record.rpe != null && record.session_rpe == null) {
      patch.session_rpe = record.rpe;
    }
    if (record.sleep_quality != null && record.sleep == null) {
      patch.sleep = record.sleep_quality;
    }
    if (record.energy != null && record.fatigue == null) {
      // energy is conceptually inverted: high energy = low fatigue
      // Map energy (1-5) to fatigue (1-5) with ~inverse
      patch.fatigue = Math.min(5, Math.max(1, 6 - record.energy));
    }

    if (Object.keys(patch).length > 0) {
      await updateRecord(headers, COLLECTION, record.id, patch);
      migrated++;
    }
  }

  console.log(`  ✓ ${migrated} records migrated\n`);

  // 6. Create UNIQUE index equivalent via a list rule or schema constraint
  // PocketBase doesn't support multi-field unique via API directly,
  // but the app's SQLite schema has UNIQUE(user_id, date).
  // For PB we document the constraint and handle duplicate detection in the service.

  console.log(`  ─── Post-migration notes ───`);
  console.log(`  • API rules for list/view should filter: @request.auth.id = user_id`);
  console.log(`  • create: only for own user`);

  console.log(`\n✅ Migration complete.\n`);
}

main().catch((err) => {
  console.error("\n❌ Migration failed:", err.message);
  process.exit(1);
});
