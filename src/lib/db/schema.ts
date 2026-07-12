/**
 * SQLite schema definition and migration runner.
 *
 * Defines the 8 core tables needed for offline sync, plus indexes
 * and schema version tracking via the `sync_meta` table.
 *
 * All statements use `IF NOT EXISTS` so `runMigrations()` is idempotent.
 */

import type { SQLiteDatabase } from "expo-sqlite";

const SCHEMA_VERSION_KEY = "schema_version";
const CURRENT_SCHEMA_VERSION = "6";

// ─── DDL Statements ─────────────────────────────────────────────────────

const CREATE_EXERCISES = `
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  equipment TEXT,
  body_region TEXT,
  default_sets INTEGER NOT NULL DEFAULT 3,
  default_reps INTEGER NOT NULL DEFAULT 10,
  description TEXT,
  synced_at TEXT
);`;

const CREATE_WORKOUT_TEMPLATES = `
CREATE TABLE IF NOT EXISTS workout_templates (
  id TEXT PRIMARY KEY,
  local_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  dirty INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT,
  created_at TEXT,
  updated_at TEXT
);`;

const CREATE_WORKOUT_TEMPLATE_EXERCISES = `
CREATE TABLE IF NOT EXISTS workout_template_exercises (
  id TEXT PRIMARY KEY,
  local_id TEXT UNIQUE,
  template_id TEXT NOT NULL REFERENCES workout_templates(id),
  exercise_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps INTEGER NOT NULL DEFAULT 10,
  rest_seconds INTEGER NOT NULL DEFAULT 90,
  notes TEXT,
  dirty INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT
);`;

const CREATE_WORKOUT_SESSIONS = `
CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  local_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  template_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('active','completed','cancelled')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_seconds INTEGER,
  notes TEXT,
  dirty INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT
);`;

const CREATE_EXERCISE_SETS = `
CREATE TABLE IF NOT EXISTS exercise_sets (
  id TEXT PRIMARY KEY,
  local_id TEXT UNIQUE,
  session_id TEXT NOT NULL REFERENCES workout_sessions(id),
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg REAL NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  rpe REAL,
  rir INTEGER,
  is_warmup INTEGER NOT NULL DEFAULT 0,
  dirty INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT
);`;

const CREATE_CHANGE_QUEUE = `
CREATE TABLE IF NOT EXISTS change_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL CHECK(action IN ('create','update','delete')),
  collection TEXT NOT NULL,
  local_id TEXT,
  record_id TEXT,
  data TEXT,
  group_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_flight','dead_letter','auth_error')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

const CREATE_ID_MAPPING = `
CREATE TABLE IF NOT EXISTS id_mapping (
  local_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  collection TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (local_id, collection)
);`;

const CREATE_SYNC_META = `
CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);`;

const CREATE_DAILY_WELLNESS = `
CREATE TABLE IF NOT EXISTS daily_wellness (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  session_rpe INTEGER,
  sleep INTEGER,
  fatigue INTEGER,
  soreness INTEGER,
  mood INTEGER,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);`;

const CREATE_WORKOUT_FEEDBACK = `
CREATE TABLE IF NOT EXISTS workout_feedback (
  id TEXT PRIMARY KEY,
  local_id TEXT UNIQUE,
  session_id TEXT NOT NULL,
  athlete_id TEXT NOT NULL,
  coach_id TEXT,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  notes TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);`;

const CREATE_REACT_QUERY_CACHE = `
CREATE TABLE IF NOT EXISTS react_query_cache (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);`;

const CREATE_TEAMS = `
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

const CREATE_TEAM_MEMBERSHIPS = `
CREATE TABLE IF NOT EXISTS team_memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'coach', 'athlete')),
  position TEXT,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, team_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);`;

// ─── Indexes ────────────────────────────────────────────────────────────

const CREATE_INDEXES = [
  // exercises
  `CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);`,
  `CREATE INDEX IF NOT EXISTS idx_exercises_synced ON exercises(synced_at);`,

  // workout_templates
  `CREATE INDEX IF NOT EXISTS idx_templates_dirty ON workout_templates(dirty);`,

  // workout_template_exercises
  `CREATE INDEX IF NOT EXISTS idx_wte_template ON workout_template_exercises(template_id);`,
  `CREATE INDEX IF NOT EXISTS idx_wte_dirty ON workout_template_exercises(dirty);`,

  // workout_sessions
  `CREATE INDEX IF NOT EXISTS idx_sessions_status ON workout_sessions(status);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_dirty ON workout_sessions(dirty);`,

  // exercise_sets
  `CREATE INDEX IF NOT EXISTS idx_sets_session ON exercise_sets(session_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sets_dirty ON exercise_sets(dirty);`,

  // change_queue
  `CREATE INDEX IF NOT EXISTS idx_queue_status ON change_queue(status);`,
  `CREATE INDEX IF NOT EXISTS idx_queue_created ON change_queue(created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_queue_group ON change_queue(group_id);`,

  // workout_feedback
  `CREATE INDEX IF NOT EXISTS idx_feedback_athlete ON workout_feedback(athlete_id);`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_synced ON workout_feedback(synced);`,

  // teams
  `CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);`,

  // team_memberships
  `CREATE INDEX IF NOT EXISTS idx_team_memberships_user_id ON team_memberships(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_team_memberships_team_id ON team_memberships(team_id);`,
  `CREATE INDEX IF NOT EXISTS idx_team_memberships_role ON team_memberships(role);`,
];

const SEED_SCHEMA_VERSION = `
INSERT OR IGNORE INTO sync_meta (key, value) VALUES ('${SCHEMA_VERSION_KEY}', '${CURRENT_SCHEMA_VERSION}');`;

const UPDATE_SCHEMA_VERSION = `
UPDATE sync_meta SET value = '${CURRENT_SCHEMA_VERSION}' WHERE key = '${SCHEMA_VERSION_KEY}' AND value != '${CURRENT_SCHEMA_VERSION}';`;

const ALTER_ADD_TEMPO = `ALTER TABLE exercise_sets ADD COLUMN tempo TEXT;`;
const ALTER_ADD_VIDEO_URL = `ALTER TABLE exercises ADD COLUMN video_url TEXT;`;

// ─── Table Definitions (for testing / introspection) ────────────────────

export const TABLES: readonly string[] = [
  "exercises",
  "workout_templates",
  "workout_template_exercises",
  "workout_sessions",
  "exercise_sets",
  "change_queue",
  "id_mapping",
  "sync_meta",
  "daily_wellness",
  "react_query_cache",
  "workout_feedback",
  "teams",
  "team_memberships",
] as const;

// ─── Migration Runner ───────────────────────────────────────────────────

/**
 * Run all schema migrations to ensure the database is up-to-date.
 *
 * Idempotent — safe to call multiple times. Creates all tables and
 * indexes with `IF NOT EXISTS`, then seeds or updates the schema
 * version in `sync_meta`.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Check if we're already at the current schema version
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM sync_meta WHERE key = '${SCHEMA_VERSION_KEY}'`,
    );
    if (row?.value === CURRENT_SCHEMA_VERSION) {
      return; // Already up to date — skip
    }
  } catch {
    // sync_meta doesn't exist yet — first run, continue
  }

  await db.execAsync(CREATE_EXERCISES);
  await db.execAsync(CREATE_WORKOUT_TEMPLATES);
  await db.execAsync(CREATE_WORKOUT_TEMPLATE_EXERCISES);
  await db.execAsync(CREATE_WORKOUT_SESSIONS);
  await db.execAsync(CREATE_EXERCISE_SETS);
  await db.execAsync(CREATE_CHANGE_QUEUE);
  await db.execAsync(CREATE_ID_MAPPING);
  await db.execAsync(CREATE_SYNC_META);
  await db.execAsync(CREATE_DAILY_WELLNESS);
  await db.execAsync(CREATE_REACT_QUERY_CACHE);
  await db.execAsync(CREATE_WORKOUT_FEEDBACK);
  await db.execAsync(CREATE_TEAMS);
  await db.execAsync(CREATE_TEAM_MEMBERSHIPS);

  // Create indexes
  for (const indexSql of CREATE_INDEXES) {
    await db.execAsync(indexSql);
  }

  // Migration v1 → v2: add tempo column to exercise_sets
  const tempoCheck = await db.getAllAsync<{ col_exists: number }>(
    "SELECT COUNT(*) as col_exists FROM pragma_table_info('exercise_sets') WHERE name = 'tempo'"
  );
  if (tempoCheck[0].col_exists === 0) {
    await db.execAsync("ALTER TABLE exercise_sets ADD COLUMN tempo TEXT;");
  }

  // Migration v3 → v4: add video_url column to exercises
  const videoCheck = await db.getAllAsync<{ col_exists: number }>(
    "SELECT COUNT(*) as col_exists FROM pragma_table_info('exercises') WHERE name = 'video_url'"
  );
  if (videoCheck[0].col_exists === 0) {
    await db.execAsync("ALTER TABLE exercises ADD COLUMN video_url TEXT;");
  }

  // Seed schema version if not exists, then update if outdated
  await db.execAsync(SEED_SCHEMA_VERSION);
  await db.execAsync(UPDATE_SCHEMA_VERSION);
}
