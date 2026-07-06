/**
 * PocketBase Migration — Coach Features (Phase 2)
 *
 * Execute via PocketBase Admin JS Console or copy-paste into the
 * Admin UI > Settings > Import Collections JSON (as JavaScript migration).
 *
 * Steps:
 * 1. Add `role` field to users collection (if not present)
 * 2. Add `is_archived`, `created_by`, `video_url` to exercises collection
 * 3. Create `program_assignments` collection
 * 4. Seed test coach account
 *
 * ⚠️ Run this against your PocketBase instance AFTER backing up pb_data/
 */

async function migrateCoachFeatures(pb) {
  const log = (msg) => console.log(`[migrate-coach] ${msg}`);

  // ─── 1. Ensure users collection has role field ──────────────────────
  try {
    const usersCollection = await pb.collections.getOne("users");
    const hasRole = usersCollection.fields?.some(
      (f) => f.name === "role",
    );
    if (!hasRole) {
      log("Adding `role` field to users collection...");
      await pb.collections.update("users", {
        fields: [
          ...usersCollection.fields,
          {
            name: "role",
            type: "select",
            required: true,
            values: ["athlete", "coach"],
            defaultValue: "athlete",
          },
          {
            name: "coach",
            type: "relation",
            required: false,
            collectionId: usersCollection.id,
            maxSelect: 1,
          },
        ],
      });
      log("✅ `role` and `coach` fields added to users.");
    } else {
      log("✅ `role` field already exists on users.");
    }
  } catch (err) {
    log(`⚠️  Could not update users collection: ${err.message}`);
  }

  // ─── 2. Update exercises collection ────────────────────────────────
  try {
    const exercisesCollection = await pb.collections.getOne("exercises");
    const currentFields = exercisesCollection.fields ?? [];

    const hasArchived = currentFields.some((f) => f.name === "is_archived");
    const hasCreatedBy = currentFields.some((f) => f.name === "created_by");
    const hasVideoUrl = currentFields.some((f) => f.name === "video_url");

    const newFields = [...currentFields];

    if (!hasArchived) {
      newFields.push({
        name: "is_archived",
        type: "bool",
        required: true,
        defaultValue: false,
      });
    }
    if (!hasCreatedBy) {
      newFields.push({
        name: "created_by",
        type: "relation",
        required: false,
        collectionId: (await pb.collections.getOne("users")).id,
        maxSelect: 1,
      });
    }
    if (!hasVideoUrl) {
      newFields.push({
        name: "video_url",
        type: "url",
        required: false,
      });
    }

    if (!hasArchived || !hasCreatedBy || !hasVideoUrl) {
      await pb.collections.update("exercises", { fields: newFields });
      log("✅ exercises collection updated (is_archived, created_by, video_url).");
    } else {
      log("✅ exercises collection already has all coach fields.");
    }
  } catch (err) {
    log(`⚠️  Could not update exercises collection: ${err.message}`);
  }

  // ─── 3. Create program_assignments collection ──────────────────────
  try {
    const existing = await pb.collections.getFullList({
      filter: "name = 'program_assignments'",
    });

    if (existing.length === 0) {
      const usersColl = await pb.collections.getOne("users");
      const templatesColl = await pb.collections.getOne("workout_templates");

      await pb.collections.create({
        name: "program_assignments",
        type: "base",
        listRule: "@request.auth.id = coach || @request.auth.id = athlete",
        viewRule: "@request.auth.id = coach || @request.auth.id = athlete",
        createRule: "@request.auth.id = coach",
        updateRule: "@request.auth.id = coach",
        deleteRule: "@request.auth.id = coach",
        fields: [
          {
            name: "athlete",
            type: "relation",
            required: true,
            collectionId: usersColl.id,
            maxSelect: 1,
          },
          {
            name: "coach",
            type: "relation",
            required: true,
            collectionId: usersColl.id,
            maxSelect: 1,
          },
          {
            name: "template",
            type: "relation",
            required: true,
            collectionId: templatesColl.id,
            maxSelect: 1,
          },
          {
            name: "start_date",
            type: "date",
            required: true,
          },
          {
            name: "status",
            type: "select",
            required: true,
            values: ["active", "completed", "cancelled"],
            defaultValue: "active",
          },
        ],
        indexes: [
          "CREATE UNIQUE INDEX idx_unique_assignment ON program_assignments (athlete, template, start_date);",
        ],
      });
      log("✅ program_assignments collection created.");
    } else {
      log("✅ program_assignments collection already exists.");
    }
  } catch (err) {
    log(`⚠️  Could not create program_assignments: ${err.message}`);
  }

  // ─── 4. Seed test coach account ─────────────────────────────────────
  try {
    const existingCoach = await pb.collection("users").getFullList({
      filter: "email = 'coach@test.com'",
    });

    if (existingCoach.length === 0) {
      await pb.collection("users").create({
        email: "coach@test.com",
        password: "Coach123!",
        passwordConfirm: "Coach123!",
        displayName: "Test Coach",
        role: "coach",
      });
      log("✅ Test coach account created (coach@test.com / Coach123!).");
    } else {
      log("✅ Test coach account already exists.");
    }
  } catch (err) {
    log(`⚠️  Could not seed test coach: ${err.message}`);
  }

  log("🎉 Coach features migration complete!");
}

// Self-execute if run directly (e.g. via `node scripts/migrate-coach-features.mjs`)
// Requires PocketBase JS SDK running in Node.
const isMain = process.argv[1]?.endsWith("migrate-coach-features.mjs");
if (isMain) {
  const PocketBase = require("pocketbase");
  const pbUrl = process.env.EXPO_PUBLIC_POCKETBASE_URL ?? "http://127.0.0.1:8090";
  const adminEmail = process.env.PB_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.PB_ADMIN_PASSWORD ?? "admin123";

  const pb = new PocketBase(pbUrl);
  pb.admins.authWithPassword(adminEmail, adminPassword)
    .then(() => migrateCoachFeatures(pb))
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

export { migrateCoachFeatures };
