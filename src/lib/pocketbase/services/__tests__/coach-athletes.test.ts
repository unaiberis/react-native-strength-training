// Mock the client module
const mockGetFullList = jest.fn();
const mockGetOne = jest.fn();
const mockUpdate = jest.fn();

const mockPb = {
  collection: jest.fn(() => ({
    getFullList: mockGetFullList,
    getOne: mockGetOne,
    update: mockUpdate,
  })),
};

jest.mock("../../client", () => ({
  pb: mockPb,
}));

import { listAthletes, getAthlete, unlinkAthlete } from "../coach-athletes";
import type { UserRow } from "../../../../types/pocketbase";

const makeUser = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: "athlete-1",
  email: "athlete@test.com",
  displayName: "Test Athlete",
  role: "athlete",
  coach: "coach-1",
  created: "2026-01-01T00:00:00Z",
  updated: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("PocketBase coach-athletes service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listAthletes", () => {
    it("returns enriched athlete summaries for a single athlete", async () => {
      const athletes = [makeUser()];

      // Mock users query
      mockGetFullList.mockResolvedValueOnce(athletes);
      // Mock sessions for athlete-1
      mockGetFullList.mockResolvedValueOnce([{ id: "s1", started_at: "2026-06-01T00:00:00Z" }]);
      // Mock sets for s1
      mockGetFullList.mockResolvedValueOnce([{ weight_kg: 100, reps: 10 }]);
      // Mock all sessions for athlete-1 (compliance)
      mockGetFullList.mockResolvedValueOnce([{ id: "s1", status: "completed" }]);

      const result = await listAthletes("coach-1");

      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe("Test Athlete");
      expect(result[0].totalWorkouts).toBe(1);
      expect(result[0].totalVolumeKg).toBe(1000);
      expect(result[0].complianceRate).toBe(1);
      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: "coach = 'coach-1'",
        sort: "displayName",
      });
    });

    it("returns empty array when no athletes", async () => {
      mockGetFullList.mockResolvedValue([]);

      const result = await listAthletes("coach-1");

      expect(result).toEqual([]);
    });

    it("throws on PocketBase error", async () => {
      mockGetFullList.mockRejectedValue(new Error("PB error"));

      await expect(listAthletes("coach-1")).rejects.toThrow("PB error");
    });
  });

  describe("getAthlete", () => {
    it("returns a single athlete by id", async () => {
      const athlete = makeUser();
      mockGetOne.mockResolvedValue(athlete);

      const result = await getAthlete("athlete-1");

      expect(mockGetOne).toHaveBeenCalledWith("athlete-1");
      expect(result).toEqual(athlete);
    });

    it("returns null when athlete not found", async () => {
      mockGetOne.mockRejectedValue(new Error("The requested resource wasn't found."));

      const result = await getAthlete("nonexistent");

      expect(result).toBeNull();
    });

    it("throws on unexpected PocketBase error", async () => {
      mockGetOne.mockRejectedValue(new Error("Unexpected"));

      await expect(getAthlete("athlete-1")).rejects.toThrow("Unexpected");
    });
  });

  describe("unlinkAthlete", () => {
    it("clears the coach field on the user", async () => {
      mockUpdate.mockResolvedValue(true);

      await unlinkAthlete("athlete-1");

      expect(mockUpdate).toHaveBeenCalledWith("athlete-1", { coach: null });
    });

    it("throws on PocketBase error", async () => {
      mockUpdate.mockRejectedValue(new Error("Update failed"));

      await expect(unlinkAthlete("athlete-1")).rejects.toThrow("Update failed");
    });
  });
});
