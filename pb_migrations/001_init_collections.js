/**
 * PocketBase Migration — v001 Init Collections
 *
 * Creates the 6 core collections: exercises, workout_templates,
 * workout_template_exercises, workout_sessions, exercise_sets, program_blocks.
 *
 * IMPORTANT (PocketBase v0.27.x):
 * - This file goes in pb_migrations/ and runs automatically on server start.
 * - It is idempotent: each collection is checked before creation.
 * - After deployment, verify fields and API rules match the Admin UI config.
 *
 * Run order: files are sorted alphabetically, so 001_ runs first.
 */

/// <reference path="../pb_data/types.pb.d.ts" />

migrate((app) => {
  const dao = app.dao();
  const collections = [
    // ─── exercises ─────────────────────────────────────────────────────
    {
      name: "exercises",
      type: "base",
      system: false,
      listRule: null,     // public
      viewRule: null,     // public
      createRule: null,   // admin only (null = superusers only)
      updateRule: null,   // admin only
      deleteRule: null,   // admin only
      schema: [
        { name: "name",         type: "text",   required: true,  max: 200 },
        { name: "category",     type: "select", required: true,
          options: { values: ["strength","hypertrophy","endurance","mobility","power","cardio","crossfit","hybrid"] }},
        { name: "equipment",     type: "json" },
        { name: "body_region",  type: "text",   required: false },
        { name: "description",  type: "text",   required: false, max: 2000 },
        { name: "default_sets", type: "number", required: false },
        { name: "default_reps", type: "number", required: false },
        { name: "default_rest_seconds", type: "number", required: false },
        { name: "is_public",    type: "bool",   required: false },
      ],
      indexes: [
        "CREATE INDEX idx_exercises_name ON exercises (name)",
        "CREATE INDEX idx_exercises_category ON exercises (category)",
      ],
    },

    // ─── workout_templates ─────────────────────────────────────────────
    {
      name: "workout_templates",
      type: "base",
      system: false,
      listRule: "user_id = @request.auth.id",
      viewRule: "user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: "user_id = @request.auth.id",
      deleteRule: "user_id = @request.auth.id",
      schema: [
        { name: "user_id",         type: "relation", required: true,
          options: { collectionId: "users", maxSelect: 1 }},
        { name: "name",            type: "text",     required: true, max: 100 },
        { name: "description",     type: "text",     required: false, max: 500 },
        { name: "program_block_id", type: "text",    required: false },
        { name: "is_public",       type: "bool",     required: false },
      ],
      indexes: [
        "CREATE INDEX idx_templates_user ON workout_templates (user_id)",
      ],
    },

    // ─── workout_template_exercises ─────────────────────────────────────
    {
      name: "workout_template_exercises",
      type: "base",
      system: false,
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      schema: [
        { name: "workout_template_id", type: "relation", required: true,
          options: { collectionId: "workout_templates", maxSelect: 1 }},
        { name: "exercise_id",        type: "relation", required: true,
          options: { collectionId: "exercises", maxSelect: 1 }},
        { name: "sort_order",         type: "number",   required: true },
        { name: "target_sets",        type: "number",   required: false },
        { name: "target_reps",        type: "number",   required: false },
        { name: "target_rpe_low",     type: "number",   required: false },
        { name: "target_rpe_high",    type: "number",   required: false },
        { name: "rest_seconds",       type: "number",   required: false },
        { name: "notes",              type: "text",     required: false, max: 500 },
      ],
      indexes: [
        "CREATE INDEX idx_wte_template ON workout_template_exercises (workout_template_id)",
        "CREATE INDEX idx_wte_exercise ON workout_template_exercises (exercise_id)",
      ],
    },

    // ─── workout_sessions ───────────────────────────────────────────────
    {
      name: "workout_sessions",
      type: "base",
      system: false,
      listRule: "user_id = @request.auth.id",
      viewRule: "user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: "user_id = @request.auth.id",
      deleteRule: "user_id = @request.auth.id",
      schema: [
        { name: "user_id",             type: "relation", required: true,
          options: { collectionId: "users", maxSelect: 1 }},
        { name: "workout_template_id", type: "relation", required: false,
          options: { collectionId: "workout_templates", maxSelect: 1 }},
        { name: "program_block_id",    type: "text",     required: false },
        { name: "status",              type: "select",   required: true,
          options: { values: ["in_progress","completed","cancelled"] }},
        { name: "started_at",          type: "autodate", required: true },
        { name: "completed_at",        type: "autodate", required: false },
        { name: "duration_minutes",    type: "number",   required: false },
        { name: "notes",               type: "text",     required: false, max: 2000 },
      ],
      indexes: [
        "CREATE INDEX idx_sessions_user ON workout_sessions (user_id)",
        "CREATE INDEX idx_sessions_status ON workout_sessions (status)",
      ],
    },

    // ─── exercise_sets ──────────────────────────────────────────────────
    {
      name: "exercise_sets",
      type: "base",
      system: false,
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      schema: [
        { name: "workout_session_id", type: "relation", required: true,
          options: { collectionId: "workout_sessions", maxSelect: 1 }},
        { name: "exercise_id",       type: "relation", required: true,
          options: { collectionId: "exercises", maxSelect: 1 }},
        { name: "set_number",        type: "number",   required: true },
        { name: "weight_kg",         type: "number",   required: false },
        { name: "reps",              type: "number",   required: false },
        { name: "rpe",               type: "number",   required: false },
        { name: "rir",               type: "number",   required: false },
        { name: "is_warmup",         type: "bool",     required: false },
        { name: "logged_at",         type: "autodate", required: true },
      ],
      indexes: [
        "CREATE INDEX idx_sets_session ON exercise_sets (workout_session_id)",
        "CREATE INDEX idx_sets_exercise ON exercise_sets (exercise_id)",
      ],
    },

    // ─── program_blocks (future use — reserved) ─────────────────────────
    {
      name: "program_blocks",
      type: "base",
      system: false,
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      schema: [
        { name: "user_id",      type: "relation", required: true,
          options: { collectionId: "users", maxSelect: 1 }},
        { name: "name",         type: "text",     required: true, max: 100 },
        { name: "start_date",   type: "date",     required: false },
        { name: "end_date",     type: "date",     required: false },
        { name: "description",  type: "text",     required: false, max: 1000 },
      ],
      indexes: [
        "CREATE INDEX idx_blocks_user ON program_blocks (user_id)",
      ],
    },
  ];

  // Apply each collection — idempotent via findCollectionByNameOrId
  for (const colDef of collections) {
    let collection;
    try {
      collection = dao.findCollectionByNameOrId(colDef.name);
    } catch {
      collection = null;
    }

    if (collection) {
      console.log(`[migration] Collection "${colDef.name}" already exists — skipping`);
      continue;
    }

    collection = new Collection(colDef);
    dao.saveCollection(collection);
    console.log(`[migration] Created collection "${colDef.name}"`);
  }

  console.log("[migration] 001_init_collections complete — 6 collections ensured");
});
