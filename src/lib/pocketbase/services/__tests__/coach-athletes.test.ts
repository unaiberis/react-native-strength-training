// Mock the client module
const mockGetFullList = jest.fn();
const mockGetOne = jest.fn();
const mockDelete = jest.fn();

const mockPb = {
  collection: jest.fn(() => ({
    getFullList: mockGetFullList,
    getOne: mockGetOne,
    delete: mockDelete,
  })),
};

jest.mock("../../client", () => ({
  pb: mockPb,
}));

import { listAthletes, getAthlete, getAthleteCoach, unlinkAthlete } from "../coach-athletes";
import type { UserRow } from "../../../../types/pocketbase";

const makeUser = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: "athlete-1",
  email: "athlete@test.com",
  displayName: "Test Athlete",
  role: "athlete",
  coach: null,
  created: "2026-01-01T00:00:00Z",
  updated: "2026-01-01T00:00:00Z",
  ...overrides,
});

function mockMemberships(teamIds: string[], userId: string) {
  return teamIds.map((tid) => ({
    id: `ms-${tid}`,
    user_id: userId,
    team_id: tid,
    role: "coach",
  }));
}

function mockAthleteMemberships(teamIds: string[], athleteIds: string[]) {
  const result: any[] = [];
  for (const tid of teamIds) {
    for (const uid of athleteIds) {
      result.push({ id: `ms-${tid}-${uid}`, user_id: uid, team_id: tid, role: "athlete" });
    }
  }
  return result;
}

describe("PocketBase coach-athletes service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listAthletes", () => {
    it("returns enriched athlete summaries for a single athlete", async () => {
      // Mock memberships: user is coach in team-1
      mockGetFullList.mockResolvedValueOnce(mockMemberships(["team-1"], "coach-1"));
      // Mock athlete memberships in team-1
      mockGetFullList.mockResolvedValueOnce(mockAthleteMemberships(["team-1"], ["athlete-1"]));
      // Mock team_memberships with expand (replaces direct users query)
      mockGetFullList.mockResolvedValueOnce([
        {
          id: "ms-team-1-athlete-1",
          user_id: "athlete-1",
          team_id: "team-1",
          role: "athlete",
          expand: { user_id: makeUser() },
        },
      ]);
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

      // Verify it queried memberships first, not coach field
      expect(mockGetFullList).toHaveBeenNthCalledWith(1, {
        filter: "user_id = 'coach-1' && (role = 'coach' || role = 'admin')",
        $autoCancel: false,
      });
    });

    it("returns empty array when no memberships", async () => {
      mockGetFullList.mockResolvedValue([]);

      const result = await listAthletes("coach-1");

      expect(result).toEqual([]);
    });

    it("returns empty array when no athletes in teams", async () => {
      mockGetFullList.mockResolvedValueOnce(mockMemberships(["team-1"], "coach-1"));
      mockGetFullList.mockResolvedValueOnce([]);

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
    it("removes athlete from team memberships", async () => {
      mockGetFullList.mockResolvedValue([{ id: "ms-1" }]);
      mockDelete.mockResolvedValue(true);

      await unlinkAthlete("athlete-1", "team-1");

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: "user_id = 'athlete-1' && team_id = 'team-1'",
        $autoCancel: false,
      });
      expect(mockDelete).toHaveBeenCalledWith("ms-1");
    });

    it("throws on PocketBase error", async () => {
      mockGetFullList.mockRejectedValue(new Error("Query failed"));

      await expect(unlinkAthlete("athlete-1", "team-1")).rejects.toThrow("Query failed");
    });
  });

  describe("getAthleteCoach", () => {
    it("returns coaches for an athlete by looking up team memberships", async () => {
      // Step 1: athlete's memberships
      mockGetFullList.mockResolvedValueOnce([
        { id: "ms-a1", user_id: "athlete-1", team_id: "team-1", role: "athlete" },
      ]);
      // Step 2: coach member in that team
      mockGetFullList.mockResolvedValueOnce([
        { id: "ms-c1", user_id: "coach-1", team_id: "team-1", role: "coach", expand: { user_id: {} } },
      ]);
      // Step 3: user records for coaches
      mockGetFullList.mockResolvedValueOnce([
        { id: "coach-1", displayName: "Coach One", email: "coach@test.com" },
      ]);

      const result = await getAthleteCoach("athlete-1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("coach-1");
      expect(result[0].displayName).toBe("Coach One");
      expect(result[0].email).toBe("coach@test.com");

      // Verify query sequence
      expect(mockGetFullList).toHaveBeenNthCalledWith(1, {
        filter: "user_id = 'athlete-1'",
        $autoCancel: false,
      });
    });

    it("returns empty array when athlete has no team memberships", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getAthleteCoach("athlete-1");

      expect(result).toEqual([]);
    });

    it("returns empty array when no coach/admin in teams", async () => {
      mockGetFullList.mockResolvedValueOnce([
        { id: "ms-a1", user_id: "athlete-1", team_id: "team-1", role: "athlete" },
      ]);
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getAthleteCoach("athlete-1");

      expect(result).toEqual([]);
    });

    it("deduplicates coaches appearing in multiple teams", async () => {
      // Athlete is in two teams
      mockGetFullList.mockResolvedValueOnce([
        { id: "ms-a1", user_id: "athlete-1", team_id: "team-1", role: "athlete" },
        { id: "ms-a2", user_id: "athlete-1", team_id: "team-2", role: "athlete" },
      ]);
      // Coach memberships — same coach in both teams
      mockGetFullList.mockResolvedValueOnce([
        { id: "ms-c1", user_id: "coach-1", team_id: "team-1", role: "coach" },
        { id: "ms-c2", user_id: "coach-1", team_id: "team-2", role: "coach" },
      ]);
      // User query — only one coach
      mockGetFullList.mockResolvedValueOnce([
        { id: "coach-1", displayName: "Coach One", email: "coach@test.com" },
      ]);

      const result = await getAthleteCoach("athlete-1");

      expect(result).toHaveLength(1);
    });

    it("throws on PocketBase error", async () => {
      mockGetFullList.mockRejectedValue(new Error("PB error"));

      await expect(getAthleteCoach("athlete-1")).rejects.toThrow("PB error");
    });

    it("returns empty displayName when field is empty string (no nullish coalescing)", async () => {
      mockGetFullList.mockResolvedValueOnce([
        { id: "ms-a1", user_id: "athlete-1", team_id: "team-1", role: "athlete" },
      ]);
      mockGetFullList.mockResolvedValueOnce([
        { id: "ms-c1", user_id: "coach-1", team_id: "team-1", role: "coach" },
      ]);
      mockGetFullList.mockResolvedValueOnce([
        { id: "coach-1", displayName: "", email: "john@test.com" },
      ]);

      const result = await getAthleteCoach("athlete-1");

      expect(result[0].displayName).toBe("");
    });
  });
});
