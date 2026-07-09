// Mock the client module
const mockCreate = jest.fn();
const mockGetFullList = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockPb = {
  collection: jest.fn(() => ({
    create: mockCreate,
    getFullList: mockGetFullList,
    update: mockUpdate,
    delete: mockDelete,
  })),
};

jest.mock("../../client", () => ({
  pb: mockPb,
}));

import {
  getTeamMemberships,
  getMyMemberships,
  getTeamMembers,
  addMember,
  removeMember,
  updateMemberRole,
  getMyAthleteIds,
  getMyRoleInTeam,
  getMyTeamIdsByRole,
} from "../team-memberships";
import type {
  TeamMembershipRow,
  TeamMember,
  TeamRole,
} from "../../../../types/pocketbase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMembership = (
  overrides: Partial<TeamMembershipRow> = {},
): TeamMembershipRow => ({
  id: "ms-1",
  user_id: "user-1",
  team_id: "team-1",
  role: "athlete",
  position: null,
  joined_at: "2026-07-01T00:00:00Z",
  created: "2026-07-01T00:00:00Z",
  updated: "2026-07-01T00:00:00Z",
  ...overrides,
});

const makeTeamMember = (
  overrides: Partial<TeamMember> = {},
): TeamMember => ({
  id: "ms-1",
  user_id: "user-1",
  team_id: "team-1",
  role: "athlete",
  position: null,
  joined_at: "2026-07-01T00:00:00Z",
  created: "2026-07-01T00:00:00Z",
  updated: "2026-07-01T00:00:00Z",
  user_name: "John Doe",
  user_email: "john@example.com",
  user_avatar: null,
  ...overrides,
});

describe("PocketBase team-memberships service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------
  // getTeamMemberships
  // -------------------------------------------------------------------
  describe("getTeamMemberships", () => {
    it("returns memberships for team", async () => {
      const records = [
        makeMembership({ id: "ms-1" }),
        makeMembership({ id: "ms-2", user_id: "user-2", role: "coach" }),
      ];
      mockGetFullList.mockResolvedValueOnce(records);

      const result = await getTeamMemberships("team-1");

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: "team_id = 'team-1'",
        $autoCancel: false,
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("ms-1");
      expect(result[1].id).toBe("ms-2");
    });

    it("returns empty array when team has no members", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getTeamMemberships("team-empty");

      expect(result).toEqual([]);
    });

    it("throws on error", async () => {
      mockGetFullList.mockRejectedValue(new Error("PB error"));

      await expect(getTeamMemberships("team-1")).rejects.toThrow("PB error");
    });
  });

  // -------------------------------------------------------------------
  // getMyMemberships
  // -------------------------------------------------------------------
  describe("getMyMemberships", () => {
    it("returns memberships for user", async () => {
      const records = [
        makeMembership({ id: "ms-1", team_id: "team-1" }),
        makeMembership({ id: "ms-2", team_id: "team-2" }),
      ];
      mockGetFullList.mockResolvedValueOnce(records);

      const result = await getMyMemberships("user-1");

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: "user_id = 'user-1'",
        $autoCancel: false,
      });
      expect(result).toHaveLength(2);
    });

    it("returns empty when user has no memberships", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getMyMemberships("user-none");

      expect(result).toEqual([]);
    });

    it("throws on error", async () => {
      mockGetFullList.mockRejectedValue(new Error("PB error"));

      await expect(getMyMemberships("user-1")).rejects.toThrow("PB error");
    });
  });

  // -------------------------------------------------------------------
  // getTeamMembers
  // -------------------------------------------------------------------
  describe("getTeamMembers", () => {
    it("returns TeamMember[] with expanded user data", async () => {
      const rawRecords = [
        {
          id: "ms-1",
          user_id: "user-1",
          team_id: "team-1",
          role: "athlete",
          position: null,
          joined_at: "2026-07-01T00:00:00Z",
          created: "2026-07-01T00:00:00Z",
          updated: "2026-07-01T00:00:00Z",
          expand: {
            user_id: { displayName: "Alice", email: "alice@test.com", avatar: "ava1" },
          },
        },
        {
          id: "ms-2",
          user_id: "user-2",
          team_id: "team-1",
          role: "coach",
          position: "Head coach",
          joined_at: "2026-07-01T00:00:00Z",
          created: "2026-07-01T00:00:00Z",
          updated: "2026-07-01T00:00:00Z",
          expand: {
            user_id: { displayName: "Bob", email: "bob@test.com", avatar: null },
          },
        },
      ];
      mockGetFullList.mockResolvedValueOnce(rawRecords);

      const result = await getTeamMembers("team-1");

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: "team_id = 'team-1'",
        expand: "user_id",
        $autoCancel: false,
      });
      expect(result).toHaveLength(2);
      expect(result[0].user_name).toBe("Alice");
      expect(result[0].user_email).toBe("alice@test.com");
      expect(result[0].user_avatar).toBe("ava1");
      expect(result[1].user_name).toBe("Bob");
      expect(result[1].user_email).toBe("bob@test.com");
      expect(result[1].position).toBe("Head coach");
    });

    it("filters by role when provided", async () => {
      const rawRecords = [
        {
          id: "ms-1",
          user_id: "user-1",
          team_id: "team-1",
          role: "coach",
          position: null,
          joined_at: "2026-07-01T00:00:00Z",
          created: "2026-07-01T00:00:00Z",
          updated: "2026-07-01T00:00:00Z",
          expand: {
            user_id: { displayName: "Coach A", email: "coach@test.com" },
          },
        },
      ];
      mockGetFullList.mockResolvedValueOnce(rawRecords);

      const result = await getTeamMembers("team-1", "coach");

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: "team_id = 'team-1' && role = 'coach'",
        expand: "user_id",
        $autoCancel: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("coach");
    });

    it("returns empty when team has no matching members", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getTeamMembers("team-1", "admin");

      expect(result).toEqual([]);
    });

    it("throws on error", async () => {
      mockGetFullList.mockRejectedValue(new Error("PB error"));

      await expect(getTeamMembers("team-1")).rejects.toThrow("PB error");
    });
  });

  // -------------------------------------------------------------------
  // addMember
  // -------------------------------------------------------------------
  describe("addMember", () => {
    it("creates membership record", async () => {
      const membership = makeMembership();
      mockCreate.mockResolvedValueOnce(membership);

      const result = await addMember("team-1", "user-2", "athlete", "Beginner");

      expect(mockCreate).toHaveBeenCalledWith({
        user_id: "user-2",
        team_id: "team-1",
        role: "athlete",
        position: "Beginner",
      });
      expect(result.id).toBe("ms-1");
    });

    it("passes null position when not provided", async () => {
      mockCreate.mockResolvedValueOnce(makeMembership());

      await addMember("team-1", "user-2", "athlete");

      expect(mockCreate).toHaveBeenCalledWith({
        user_id: "user-2",
        team_id: "team-1",
        role: "athlete",
        position: null,
      });
    });

    it("throws on error", async () => {
      mockCreate.mockRejectedValue(new Error("Create failed"));

      await expect(
        addMember("team-1", "user-2", "athlete"),
      ).rejects.toThrow("Create failed");
    });
  });

  // -------------------------------------------------------------------
  // removeMember
  // -------------------------------------------------------------------
  describe("removeMember", () => {
    it("deletes membership", async () => {
      mockDelete.mockResolvedValueOnce(true);

      await removeMember("ms-1");

      expect(mockDelete).toHaveBeenCalledWith("ms-1");
    });

    it("throws on error", async () => {
      mockDelete.mockRejectedValue(new Error("Delete failed"));

      await expect(removeMember("bad-id")).rejects.toThrow("Delete failed");
    });
  });

  // -------------------------------------------------------------------
  // updateMemberRole
  // -------------------------------------------------------------------
  describe("updateMemberRole", () => {
    it("updates role", async () => {
      const updated = makeMembership({ role: "coach" });
      mockUpdate.mockResolvedValueOnce(updated);

      const result = await updateMemberRole("ms-1", "coach");

      expect(mockUpdate).toHaveBeenCalledWith("ms-1", {
        role: "coach",
        position: null,
      });
      expect(result.role).toBe("coach");
    });

    it("updates role and position", async () => {
      const updated = makeMembership({ role: "coach", position: "Lead" });
      mockUpdate.mockResolvedValueOnce(updated);

      const result = await updateMemberRole("ms-1", "coach", "Lead");

      expect(mockUpdate).toHaveBeenCalledWith("ms-1", {
        role: "coach",
        position: "Lead",
      });
      expect(result.position).toBe("Lead");
    });

    it("throws on error", async () => {
      mockUpdate.mockRejectedValue(new Error("Update failed"));

      await expect(updateMemberRole("bad-id", "admin")).rejects.toThrow("Update failed");
    });
  });

  // -------------------------------------------------------------------
  // getMyAthleteIds
  // -------------------------------------------------------------------
  describe("getMyAthleteIds", () => {
    it("returns unique athlete IDs from coach's teams", async () => {
      // 1st query: coach/admin memberships
      mockGetFullList.mockResolvedValueOnce([
        { id: "ms-1", user_id: "coach-1", team_id: "team-1", role: "coach" },
        { id: "ms-2", user_id: "coach-1", team_id: "team-2", role: "admin" },
      ]);
      // 2nd query: athlete memberships in those teams
      mockGetFullList.mockResolvedValueOnce([
        { user_id: "athlete-1" },
        { user_id: "athlete-2" },
        { user_id: "athlete-1" }, // duplicate
      ]);

      const result = await getMyAthleteIds("coach-1");

      expect(mockGetFullList).toHaveBeenNthCalledWith(1, {
        filter: "user_id = 'coach-1' && (role = 'coach' || role = 'admin')",
        $autoCancel: false,
      });
      expect(mockGetFullList).toHaveBeenNthCalledWith(2, {
        filter:
          "(team_id = 'team-1' || team_id = 'team-2') && role = 'athlete'",
        $autoCancel: false,
      });
      expect(result).toEqual(["athlete-1", "athlete-2"]);
    });

    it("returns empty when user has no coach/admin memberships", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getMyAthleteIds("user-1");

      expect(result).toEqual([]);
    });

    it("throws on error", async () => {
      mockGetFullList.mockRejectedValue(new Error("PB error"));

      await expect(getMyAthleteIds("coach-1")).rejects.toThrow("PB error");
    });
  });

  // -------------------------------------------------------------------
  // getMyRoleInTeam
  // -------------------------------------------------------------------
  describe("getMyRoleInTeam", () => {
    it("returns role when member", async () => {
      mockGetFullList.mockResolvedValueOnce([
        { role: "coach" },
      ]);

      const result = await getMyRoleInTeam("user-1", "team-1");

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: "user_id = 'user-1' && team_id = 'team-1'",
        $autoCancel: false,
      });
      expect(result).toBe("coach");
    });

    it("returns null when not a member", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getMyRoleInTeam("user-1", "team-unknown");

      expect(result).toBeNull();
    });

    it("returns null on error", async () => {
      mockGetFullList.mockRejectedValue(new Error("PB error"));

      const result = await getMyRoleInTeam("user-1", "team-1");

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // getMyTeamIdsByRole
  // -------------------------------------------------------------------
  describe("getMyTeamIdsByRole", () => {
    it("returns team IDs for role", async () => {
      mockGetFullList.mockResolvedValueOnce([
        { team_id: "team-1" },
        { team_id: "team-2" },
        { team_id: "team-3" },
      ]);

      const result = await getMyTeamIdsByRole("user-1", "coach");

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: "user_id = 'user-1' && role = 'coach'",
        $autoCancel: false,
      });
      expect(result).toEqual(["team-1", "team-2", "team-3"]);
    });

    it("returns empty when no memberships for role", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getMyTeamIdsByRole("user-1", "athlete");

      expect(result).toEqual([]);
    });

    it("throws on error", async () => {
      mockGetFullList.mockRejectedValue(new Error("PB error"));

      await expect(getMyTeamIdsByRole("user-1", "coach")).rejects.toThrow(
        "PB error",
      );
    });
  });
});
