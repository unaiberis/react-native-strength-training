/**
 * Database module tests.
 *
 * Uses a mock for expo-sqlite since the node test environment
 * does not have native SQLite support.
 */
// Mock expo-sqlite before importing the module under test

// Vitest v4: hoisted mock variables
const dbMocks = vi.hoisted(() => {
  const mockExecAsync = vi.fn();
  const mockCloseAsync = vi.fn();
  const mockOpenDatabaseAsync = vi.fn();
    return { mockExecAsync, mockCloseAsync, mockOpenDatabaseAsync };
});
const { mockExecAsync, mockCloseAsync, mockOpenDatabaseAsync } = dbMocks;

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: dbMocks.mockOpenDatabaseAsync,
}));

import { getDb, closeDb, isOpen, resetDb } from "../database";

describe("database module", () => {
  const mockDb = {
    execAsync: mockExecAsync,
    closeAsync: mockCloseAsync,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
    mockOpenDatabaseAsync.mockResolvedValue(mockDb);
    mockExecAsync.mockResolvedValue(undefined);
    mockCloseAsync.mockResolvedValue(undefined);
  });

  describe("getDb", () => {
    it("opens a database with the default name", async () => {
      const db = await getDb();
      expect(mockOpenDatabaseAsync).toHaveBeenCalledWith("strength-training.db");
      expect(db).toBe(mockDb);
    });

    it("opens a database with a custom name", async () => {
      const db = await getDb(":memory:");
      expect(mockOpenDatabaseAsync).toHaveBeenCalledWith(":memory:");
      expect(db).toBe(mockDb);
    });

    it("enables foreign keys after opening", async () => {
      await getDb();
      expect(mockExecAsync).toHaveBeenCalledWith("PRAGMA foreign_keys = ON;");
    });

    it("returns the same instance on multiple calls (singleton)", async () => {
      const db1 = await getDb();
      const db2 = await getDb();
      expect(db1).toBe(db2);
      expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(1);
    });

    it("re-opens after closeDb", async () => {
      await getDb();
      await closeDb();
      await getDb();
      expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe("closeDb", () => {
    it("closes the database and resets the singleton", async () => {
      await getDb();
      expect(isOpen()).toBe(true);

      await closeDb();
      expect(mockCloseAsync).toHaveBeenCalledTimes(1);
      expect(isOpen()).toBe(false);
    });

    it("is safe to call when database is not open", async () => {
      await expect(closeDb()).resolves.toBeUndefined();
    });

    it("is safe to call multiple times", async () => {
      await getDb();
      await closeDb();
      await closeDb();
      expect(mockCloseAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe("isOpen", () => {
    it("returns false before getDb is called", () => {
      expect(isOpen()).toBe(false);
    });

    it("returns true after getDb succeeds", async () => {
      await getDb();
      expect(isOpen()).toBe(true);
    });

    it("returns false after closeDb", async () => {
      await getDb();
      await closeDb();
      expect(isOpen()).toBe(false);
    });
  });
});
