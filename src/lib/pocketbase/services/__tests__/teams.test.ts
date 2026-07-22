// Mock the client module
const mockCreate = jest.fn();
const mockGetFullList = jest.fn();
const mockGetOne = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockPb = {
  collection: jest.fn(() => ({
    create: mockCreate,
    getFullList: mockGetFullList,
    getOne: mockGetOne,
    update: mockUpdate,
    delete: mockDelete,
  })),
};

jest.mock("../../client", () => ({
  pb: mockPb,
}));

import {
  getMyTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getUserTeams,
} from "../teams";
import type { TeamRow, TeamMembershipRow, TeamRole } from "../../../../types/pocketbase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeTeam = (overrides: Partial<TeamRow> = {}): TeamRow => ({
  id: "team-1",
  name: "Test Team",
  description: "A test team",
  created_by: "user-1",
  created: "2026-07-01T00:00:00Z",
  updated: "2026-07-01T00:00:00Z",
  ...overrides,
});

const makeMembership = (
  overrides: Partial<TeamMembershipRow> = {},
  expandTeam?: TeamRow,
): any => {
  const base: any = {
    id: "ms-1",
    user_id: "user-1",
    team_id: "team-1",
    role: "admin" as TeamRole,
    position: null,
    joined_at: "2026-07-01T00:00:00Z",
    created: "2026-07-01T00:00:00Z",
    updated: "2026-07-01T00:00:00Z",
    ...overrides,
  };
  if (expandTeam) {
    base.expand = { team_id: expandTeam };
  }
  return base;
};

describe("PocketBase teams service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // getMyTeams
  // -----------------------------------------------------------------------
  describe("getMyTeams", () => {
    it("returns teams from expanded memberships", async () => {
      const team = makeTeam();
      const memberships = [
        makeMembership({ id: "ms-1", team_id: "team-1" }, team),
        makeMembership(
          { id: "ms-2", user_id: "user-1", team_id: "team-2", role: "coach" },
          makeTeam({ id: "team-2", name: "Team Two" }),
        ),
      ];
      mockGetFullList.mockResolvedValueOnce(memberships);

      const result = await getMyTeams("user-1");

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: "user_id = 'user-1'",
        expand: "team_id",
        $autoCancel: false,
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("team-1");
      expect(result[0].name).toBe("Test Team");
      expect(result[1].id).toBe("team-2");
      expect(result[1].name).toBe("Team Two");
    });

    it("returns empty array when no memberships", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getMyTeams("user-1");

      expect(result).toEqual([]);
    });

    it("throws on error", async () => {
      mockGetFullList.mockRejectedValue(new Error("PB error"));

      await expect(getMyTeams("user-1")).rejects.toThrow("PB error");
    });
  });

  // -----------------------------------------------------------------------
  // getTeamById
  // -----------------------------------------------------------------------
  describe("getTeamById", () => {
    it("returns team record", async () => {
      const team = makeTeam();
      mockGetOne.mockResolvedValueOnce(team);

      const result = await getTeamById("team-1");

      expect(mockGetOne).toHaveBeenCalledWith("team-1");
      expect(result.id).toBe("team-1");
      expect(result.name).toBe("Test Team");
    });

    it("throws on error", async () => {
      mockGetOne.mockRejectedValue(new Error("Not found"));

      await expect(getTeamById("bad-id")).rejects.toThrow("Not found");
    });
  });

  // -----------------------------------------------------------------------
  // createTeam
  // -----------------------------------------------------------------------
  describe("createTeam", () => {
    it("creates team + membership, returns team", async () => {
      const team = makeTeam();
      mockCreate.mockResolvedValueOnce(team);          // teams.create
      mockCreate.mockResolvedValueOnce(makeMembership()); // team_memberships.create

      const result = await createTeam("Test Team", "A test team", "user-1");

      expect(mockCreate).toHaveBeenNthCalledWith(1, {
        name: "Test Team",
        description: "A test team",
        created_by: "user-1",
      });
      expect(mockCreate).toHaveBeenNthCalledWith(2, {
        user_id: "user-1",
        team_id: "team-1",
        role: "admin",
      });
      expect(result.id).toBe("team-1");
    });

    it("passes null description when not provided", async () => {
      const team = makeTeam({ description: null });
      mockCreate.mockResolvedValueOnce(team);
      mockCreate.mockResolvedValueOnce(makeMembership());

      await createTeam("Test Team", undefined, "user-1");

      expect(mockCreate).toHaveBeenNthCalledWith(1, {
        name: "Test Team",
        description: null,
        created_by: "user-1",
      });
    });

    it("throws on creation failure", async () => {
      mockCreate.mockRejectedValue(new Error("Create failed"));

      await expect(
        createTeam("Test Team", "desc", "user-1"),
      ).rejects.toThrow("Create failed");
    });
  });

  // -----------------------------------------------------------------------
  // updateTeam
  // -----------------------------------------------------------------------
  describe("updateTeam", () => {
    it("updates team name", async () => {
      const updated = makeTeam({ name: "Updated Name" });
      mockUpdate.mockResolvedValueOnce(updated);

      const result = await updateTeam("team-1", { name: "Updated Name" });

      expect(mockUpdate).toHaveBeenCalledWith("team-1", { name: "Updated Name" });
      expect(result.name).toBe("Updated Name");
    });

    it("updates team description", async () => {
      const updated = makeTeam({ description: "New description" });
      mockUpdate.mockResolvedValueOnce(updated);

      const result = await updateTeam("team-1", { description: "New description" });

      expect(mockUpdate).toHaveBeenCalledWith("team-1", { description: "New description" });
      expect(result.description).toBe("New description");
    });

    it("throws on error", async () => {
      mockUpdate.mockRejectedValue(new Error("Update failed"));

      await expect(updateTeam("bad-id", { name: "Nope" })).rejects.toThrow("Update failed");
    });
  });

  // -----------------------------------------------------------------------
  // deleteTeam
  // -----------------------------------------------------------------------
  describe("deleteTeam", () => {
    it("deletes team", async () => {
      mockDelete.mockResolvedValueOnce(true);

      await deleteTeam("team-1");

      expect(mockDelete).toHaveBeenCalledWith("team-1");
    });

    it("throws on error", async () => {
      mockDelete.mockRejectedValue(new Error("Delete failed"));

      await expect(deleteTeam("bad-id")).rejects.toThrow("Delete failed");
    });
  });

  // -----------------------------------------------------------------------
  // getUserTeams
  // -----------------------------------------------------------------------
  describe("getUserTeams", () => {
    it("returns UserTeam[] with counts and coaches", async () => {
      const team1 = makeTeam({ id: "team-1", name: "Team Alpha" });
      const team2 = makeTeam({ id: "team-2", name: "Team Beta" });

      // 1st getFullList: user memberships with team expand
      const memberships = [
        makeMembership(
          { id: "ms-1", team_id: "team-1", role: "admin" },
          team1,
        ),
        makeMembership(
          { id: "ms-2", team_id: "team-2", role: "coach" },
          team2,
        ),
      ];
      mockGetFullList.mockResolvedValueOnce(memberships);

      // 2nd getFullList: ALL members across both teams (single query) with user expand
      mockGetFullList.mockResolvedValueOnce([
        {
          team_id: "team-1",
          role: "admin",
          expand: {
            user_id: { id: "user-1", displayName: "Me", email: "me@test.com" },
          },
        },
        {
          team_id: "team-1",
          role: "athlete",
          expand: {
            user_id: { id: "user-2", displayName: "Athlete A", email: "a@test.com" },
          },
        },
        {
          team_id: "team-1",
          role: "athlete",
          expand: {
            user_id: { id: "user-3", displayName: "Athlete B", email: "b@test.com" },
          },
        },
        {
          team_id: "team-2",
          role: "coach",
          expand: {
            user_id: { id: "user-4", displayName: "Coach Smith", email: "smith@test.com" },
          },
        },
        {
          team_id: "team-2",
          role: "athlete",
          expand: {
            user_id: { id: "user-2", displayName: "Athlete A", email: "a@test.com" },
          },
        },
      ]);

      const result = await getUserTeams("user-1");

      expect(result).toHaveLength(2);

      // Team 1
      expect(result[0].id).toBe("team-1");
      expect(result[0].name).toBe("Team Alpha");
      expect(result[0].membership_role).toBe("admin");
      expect(result[0].member_count).toBe(3);
      expect(result[0].athlete_count).toBe(2);
      expect(result[0].coach_count).toBe(1);
      // Only admin/coach entries appear in coaches[]
      expect(result[0].coaches).toHaveLength(1);
      expect(result[0].coaches[0].displayName).toBe("Me");

      // Team 2
      expect(result[1].id).toBe("team-2");
      expect(result[1].name).toBe("Team Beta");
      expect(result[1].membership_role).toBe("coach");
      expect(result[1].member_count).toBe(2);
      expect(result[1].athlete_count).toBe(1);
      expect(result[1].coach_count).toBe(1);
      expect(result[1].coaches).toHaveLength(1);
      expect(result[1].coaches[0].displayName).toBe("Coach Smith");
    });

    it("deduplicates coaches by user id", async () => {
      const team = makeTeam({ id: "team-1", name: "One Team" });

      // 1st: my membership
      mockGetFullList.mockResolvedValueOnce([
        makeMembership({ id: "ms-1", team_id: "team-1", role: "athlete" }, team),
      ]);

      // 2nd: all members — same coach appears once
      mockGetFullList.mockResolvedValueOnce([
        {
          team_id: "team-1",
          role: "coach",
          expand: { user_id: { id: "coach-1", displayName: "Coach A", email: "a@coach.com" } },
        },
        {
          team_id: "team-1",
          role: "coach",
          expand: { user_id: { id: "coach-1", displayName: "Coach A", email: "a@coach.com" } },
        },
        {
          team_id: "team-1",
          role: "athlete",
          expand: { user_id: { id: "ath-1", displayName: "Athlete", email: "ath@test.com" } },
        },
      ]);

      const result = await getUserTeams("user-1");
      expect(result[0].coaches).toHaveLength(1);
    });

    it("returns empty when no memberships", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getUserTeams("user-1");

      expect(result).toEqual([]);
    });

    it("throws on error", async () => {
      mockGetFullList.mockRejectedValue(new Error("PB error"));

      await expect(getUserTeams("user-1")).rejects.toThrow("PB error");
    });
  });
});
