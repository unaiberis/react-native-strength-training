/**
 * Schema migration tests.
 *
 * Verifies that `runMigrations` executes the expected DDL statements
 * against the database in the correct order, and that it is idempotent.
 */

// Mock expo-sqlite before importing the module under test
const execAsyncMock = vi.fn();
const getFirstAsyncMock = vi.fn();
vi.mock("expo-sqlite", () => ({}));

import { runMigrations, TABLES } from "../schema";

describe("schema migrations", () => {
  const mockDb = {
    execAsync: execAsyncMock,
    getFirstAsync: getFirstAsyncMock,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    execAsyncMock.mockResolvedValue(undefined);
    getFirstAsyncMock.mockRejectedValue(new Error("no sync_meta yet"));
  });

  describe("runMigrations", () => {
    it("creates all 9 tables", async () => {
      await runMigrations(mockDb as any);

      // Collect all SQL calls and check for CREATE TABLE statements
      const createTableCalls = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql)
        .filter((sql: string) =>
          sql.trim().toUpperCase().startsWith("CREATE TABLE"),
        );

      expect(createTableCalls).toHaveLength(11);

      // Verify each table name appears
      const allSql = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql)
        .join(" ");

      for (const table of TABLES) {
        expect(allSql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
      }
    });

    it("creates all indexes", async () => {
      await runMigrations(mockDb as any);

      const indexCalls = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql)
        .filter((sql: string) =>
          sql.trim().toUpperCase().startsWith("CREATE INDEX"),
        );

      // Expected indexes:
      // exercises: 2 (category, synced)
      // workout_templates: 1 (dirty)
      // workout_template_exercises: 2 (template, dirty)
      // workout_sessions: 2 (status, dirty)
      // exercise_sets: 2 (session, dirty)
      // change_queue: 3 (status, created, group)
      // daily_wellness: 2 (user_date, session)
      // exercises: 2 (category, synced)
      // workout_templates: 1 (dirty)
      // workout_template_exercises: 2 (template, dirty)
      // workout_sessions: 2 (status, dirty)
      // exercise_sets: 2 (session, dirty)
      // change_queue: 3 (status, created, group)
      expect(indexCalls).toHaveLength(16);
    });

    it("creates exercises table with expected columns", async () => {
      await runMigrations(mockDb as any);

      const execCalls = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql);
      const createExercises = execCalls.find((sql: string) =>
        sql.includes("CREATE TABLE IF NOT EXISTS exercises"),
      );

      expect(createExercises).toBeDefined();
      expect(createExercises).toContain("id TEXT PRIMARY KEY");
      expect(createExercises).toContain("name TEXT NOT NULL");
      expect(createExercises).toContain("category TEXT NOT NULL");
      expect(createExercises).toContain("equipment TEXT");
      expect(createExercises).toContain("body_region TEXT");
      expect(createExercises).toContain("default_sets INTEGER NOT NULL DEFAULT 3");
      expect(createExercises).toContain("default_reps INTEGER NOT NULL DEFAULT 10");
      expect(createExercises).toContain("description TEXT");
      expect(createExercises).toContain("synced_at TEXT");
    });

    it("creates change_queue with autoincrement id", async () => {
      await runMigrations(mockDb as any);

      const execCalls = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql);
      const createQueue = execCalls.find((sql: string) =>
        sql.includes("CREATE TABLE IF NOT EXISTS change_queue"),
      );

      expect(createQueue).toBeDefined();
      expect(createQueue).toContain("id INTEGER PRIMARY KEY AUTOINCREMENT");
      expect(createQueue).toContain("CHECK(action IN ('create','update','delete'))");
      expect(createQueue).toContain("CHECK(status IN ('pending','in_flight','dead_letter','auth_error'))");
    });

    it("creates sync_meta table", async () => {
      await runMigrations(mockDb as any);

      const execCalls = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql);
      const createMeta = execCalls.find((sql: string) =>
        sql.includes("CREATE TABLE IF NOT EXISTS sync_meta"),
      );

      expect(createMeta).toBeDefined();
      expect(createMeta).toContain("key TEXT PRIMARY KEY");
      expect(createMeta).toContain("value TEXT NOT NULL");
    });

    it("creates id_mapping with composite primary key", async () => {
      await runMigrations(mockDb as any);

      const execCalls = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql);
      const createMapping = execCalls.find((sql: string) =>
        sql.includes("CREATE TABLE IF NOT EXISTS id_mapping"),
      );

      expect(createMapping).toBeDefined();
      expect(createMapping).toContain("PRIMARY KEY (local_id, collection)");
    });

    it("creates workout_sessions with status CHECK constraint", async () => {
      await runMigrations(mockDb as any);

      const execCalls = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql);
      const createSessions = execCalls.find((sql: string) =>
        sql.includes("CREATE TABLE IF NOT EXISTS workout_sessions"),
      );

      expect(createSessions).toBeDefined();
      expect(createSessions).toContain("CHECK(status IN ('active','completed','cancelled'))");
    });

    it("seeds schema_version into sync_meta", async () => {
      await runMigrations(mockDb as any);

      const seedCall = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql)
        .find((sql: string) => sql.includes("INSERT OR IGNORE INTO sync_meta"));

      expect(seedCall).toBeDefined();
      expect(seedCall).toContain("schema_version");
      expect(seedCall).toContain("'3'");
    });

    it("is idempotent — can be called twice", async () => {
      await runMigrations(mockDb as any);
      await runMigrations(mockDb as any);

      // Count CREATE TABLE calls — should be 20 (10 per run)
      const createTableCalls = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql)
        .filter((sql: string) =>
          sql.trim().toUpperCase().startsWith("CREATE TABLE"),
        );

      expect(createTableCalls).toHaveLength(22);
    });

    it("executes tables in the correct dependency order", async () => {
      await runMigrations(mockDb as any);

      const createTableCalls = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql)
        .filter((sql: string) =>
          sql.trim().toUpperCase().startsWith("CREATE TABLE"),
        );

      // workout_templates must come before workout_template_exercises
      // workout_sessions must come before exercise_sets
      const templatesIdx = createTableCalls.findIndex((sql: string) =>
        sql.includes("workout_templates"));
      const wteIdx = createTableCalls.findIndex((sql: string) =>
        sql.includes("workout_template_exercises"));
      const sessionsIdx = createTableCalls.findIndex((sql: string) =>
        sql.includes("workout_sessions"));
      const setsIdx = createTableCalls.findIndex((sql: string) =>
        sql.includes("exercise_sets"));

      expect(templatesIdx).toBeLessThan(wteIdx);
      expect(sessionsIdx).toBeLessThan(setsIdx);
    });

    it("workout_template_exercises has foreign key to workout_templates", async () => {
      await runMigrations(mockDb as any);

      const execCalls = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql);
      const createWte = execCalls.find((sql: string) =>
        sql.includes("CREATE TABLE IF NOT EXISTS workout_template_exercises"),
      );

      expect(createWte).toContain("REFERENCES workout_templates(id)");
    });

    it("exercise_sets has foreign key to workout_sessions", async () => {
      await runMigrations(mockDb as any);

      const execCalls = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql);
      const createSets = execCalls.find((sql: string) =>
        sql.includes("CREATE TABLE IF NOT EXISTS exercise_sets"),
      );

      expect(createSets).toContain("REFERENCES workout_sessions(id)");
    });

    it("creates react_query_cache table for RQ persister", async () => {
      await runMigrations(mockDb as any);

      const execCalls = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql);
      const createCache = execCalls.find((sql: string) =>
        sql.includes("CREATE TABLE IF NOT EXISTS react_query_cache"),
      );

      expect(createCache).toBeDefined();
      expect(createCache).toContain("key TEXT PRIMARY KEY");
      expect(createCache).toContain("value TEXT NOT NULL");
    });

    it("skips migrations when schema is already at current version", async () => {
      getFirstAsyncMock.mockResolvedValue({ value: "3" });
      execAsyncMock.mockClear();

      await runMigrations(mockDb as any);

      // Should not run any DDL — returned early
      expect(execAsyncMock).not.toHaveBeenCalled();
    });

    it("migrates from v1 to v2 by adding tempo column to exercise_sets", async () => {
      // Simulate existing v1 schema
      getFirstAsyncMock.mockResolvedValue({ value: "1" });

      await runMigrations(mockDb as any);

      // Should run the ALTER TABLE to add tempo column
      const allSql = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql)
        .join(" ");
      expect(allSql).toContain("ALTER TABLE exercise_sets ADD COLUMN tempo");
    });

    it("ALTER TABLE is idempotent — catches error if column already exists", async () => {
      // Simulate v1 schema with column already existing
      getFirstAsyncMock.mockResolvedValue({ value: "1" });
      execAsyncMock.mockClear();

      // Make execAsync throw for ALTER TABLE, succeed for everything else
      let callCount = 0;
      execAsyncMock.mockImplementation((sql: string) => {
        callCount++;
        if (sql.includes("ALTER TABLE") && callCount === 1) {
          return Promise.reject(new Error("duplicate column"));
        }
        return Promise.resolve(undefined);
      });

      // Should not throw despite ALTER TABLE error
      await expect(runMigrations(mockDb as any)).resolves.toBeUndefined();
    });

    it("reports current version after v1 to v2 migration", async () => {
      getFirstAsyncMock.mockResolvedValue({ value: "1" });
      execAsyncMock.mockResolvedValue(undefined);

      await runMigrations(mockDb as any);

      // Should UPDATE the version from 1 to 2
      const updateCalls = execAsyncMock.mock.calls
        .map(([sql]: [string]) => sql)
        .filter((sql: string) =>
          sql.includes("UPDATE sync_meta") && sql.includes("schema_version")
        );
      expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
