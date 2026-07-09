// Mock the client module
const mockCreate = jest.fn();
const mockGetFullList = jest.fn();
const mockUpdate = jest.fn();

const mockPb = {
  collection: jest.fn(() => ({
    create: mockCreate,
    getFullList: mockGetFullList,
    update: mockUpdate,
  })),
};

jest.mock("../../client", () => ({
  pb: mockPb,
}));

import {
  createInvite,
  getInviteByCode,
  joinTeamByInvite,
  getTeamInvites,
} from "../team-invites";
import type {
  TeamInviteRow,
  TeamMembershipRow,
  TeamRole,
} from "../../../../types/pocketbase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeInvite = (overrides: Partial<TeamInviteRow> = {}): TeamInviteRow => ({
  id: "inv-1",
  team_id: "team-1",
  code: "ABC12345",
  role: "athlete",
  max_uses: null,
  used_count: 0,
  expires_at: null,
  created_by: "user-1",
  created: "2026-07-01T00:00:00Z",
  updated: "2026-07-01T00:00:00Z",
  ...overrides,
});

const makeMembership = (
  overrides: Partial<TeamMembershipRow> = {},
): TeamMembershipRow => ({
  id: "ms-new",
  user_id: "user-2",
  team_id: "team-1",
  role: "athlete",
  position: null,
  joined_at: "2026-07-10T00:00:00Z",
  created: "2026-07-10T00:00:00Z",
  updated: "2026-07-10T00:00:00Z",
  ...overrides,
});

describe("PocketBase team-invites service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------
  // createInvite
  // -------------------------------------------------------------------
  describe("createInvite", () => {
    it("creates invite record", async () => {
      const invite = makeInvite();
      mockCreate.mockResolvedValueOnce(invite);

      const result = await createInvite("team-1", "athlete", "user-1");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          team_id: "team-1",
          role: "athlete",
          max_uses: null,
          used_count: 0,
          expires_at: null,
          created_by: "user-1",
        }),
      );
      expect(result.id).toBe("inv-1");
      expect(result.code).toBe("ABC12345");
    });

    it("accepts optional maxUses and expiresAt", async () => {
      const invite = makeInvite({
        max_uses: 10,
        expires_at: "2026-12-31T00:00:00Z",
      });
      mockCreate.mockResolvedValueOnce(invite);

      const result = await createInvite(
        "team-1",
        "athlete",
        "user-1",
        10,
        "2026-12-31T00:00:00Z",
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          team_id: "team-1",
          role: "athlete",
          max_uses: 10,
          expires_at: "2026-12-31T00:00:00Z",
          used_count: 0,
        }),
      );
      expect(result.max_uses).toBe(10);
    });

    it("generates a random 8-character code", async () => {
      mockCreate.mockResolvedValueOnce(makeInvite());

      await createInvite("team-1", "athlete", "user-1");

      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg.code).toMatch(/^[A-Za-z0-9]{8}$/);
    });

    it("throws on error", async () => {
      mockCreate.mockRejectedValue(new Error("Create failed"));

      await expect(
        createInvite("team-1", "athlete", "user-1"),
      ).rejects.toThrow("Create failed");
    });
  });

  // -------------------------------------------------------------------
  // getInviteByCode
  // -------------------------------------------------------------------
  describe("getInviteByCode", () => {
    it("returns invite when found", async () => {
      const invite = makeInvite();
      mockGetFullList.mockResolvedValueOnce([invite]);

      const result = await getInviteByCode("ABC12345");

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: "code = 'ABC12345'",
        $autoCancel: false,
      });
      expect(result).not.toBeNull();
      expect(result!.id).toBe("inv-1");
      expect(result!.code).toBe("ABC12345");
    });

    it("returns null when not found", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getInviteByCode("NONEXIST");

      expect(result).toBeNull();
    });

    it("returns null on error", async () => {
      mockGetFullList.mockRejectedValue(new Error("PB error"));

      const result = await getInviteByCode("ERROR");

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // joinTeamByInvite
  // -------------------------------------------------------------------
  describe("joinTeamByInvite", () => {
    it("validates and creates membership + increments used_count", async () => {
      const invite = makeInvite({ max_uses: 10, used_count: 3 });
      const membership = makeMembership();

      // getInviteByCode → getFullList returns invite
      mockGetFullList.mockResolvedValueOnce([invite]);
      // create membership
      mockCreate.mockResolvedValueOnce(membership);
      // update invite used_count
      mockUpdate.mockResolvedValueOnce({ ...invite, used_count: 4 });

      const result = await joinTeamByInvite("ABC12345", "user-2");

      expect(mockCreate).toHaveBeenCalledWith({
        user_id: "user-2",
        team_id: "team-1",
        role: "athlete",
      });
      expect(mockUpdate).toHaveBeenCalledWith("inv-1", {
        used_count: 4,
      });
      expect(result.id).toBe("ms-new");
    });

    it("throws on invalid code", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      await expect(
        joinTeamByInvite("BADCODE", "user-2"),
      ).rejects.toThrow("Invalid invite code");
    });

    it("throws on expired invite", async () => {
      const invite = makeInvite({
        expires_at: "2020-01-01T00:00:00Z", // past
        max_uses: null,
      });
      mockGetFullList.mockResolvedValueOnce([invite]);

      await expect(
        joinTeamByInvite("EXPIRED", "user-2"),
      ).rejects.toThrow("Invite has expired");
    });

    it("throws on max uses reached", async () => {
      const invite = makeInvite({
        max_uses: 5,
        used_count: 5,
        expires_at: null, // no expiration
      });
      mockGetFullList.mockResolvedValueOnce([invite]);

      await expect(
        joinTeamByInvite("FULL", "user-2"),
      ).rejects.toThrow("Invite has reached maximum uses");
    });

    it("throws on membership creation failure", async () => {
      const invite = makeInvite();
      mockGetFullList.mockResolvedValueOnce([invite]);
      mockCreate.mockRejectedValue(new Error("Create failed"));

      await expect(
        joinTeamByInvite("ABC12345", "user-2"),
      ).rejects.toThrow("Create failed");
    });

    it("re-throws generic error when wrapped", async () => {
      const invite = makeInvite();
      mockGetFullList.mockResolvedValueOnce([invite]);
      mockCreate.mockRejectedValue(new Error("Network error"));

      await expect(
        joinTeamByInvite("ABC12345", "user-2"),
      ).rejects.toThrow("Network error");
    });
  });

  // -------------------------------------------------------------------
  // getTeamInvites
  // -------------------------------------------------------------------
  describe("getTeamInvites", () => {
    it("returns invites for team", async () => {
      const invites = [
        makeInvite({ id: "inv-1" }),
        makeInvite({ id: "inv-2", code: "XYZ67890" }),
      ];
      mockGetFullList.mockResolvedValueOnce(invites);

      const result = await getTeamInvites("team-1");

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: "team_id = 'team-1'",
        sort: "-created",
        $autoCancel: false,
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("inv-1");
      expect(result[1].code).toBe("XYZ67890");
    });

    it("returns empty when team has no invites", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getTeamInvites("team-empty");

      expect(result).toEqual([]);
    });

    it("throws on error", async () => {
      mockGetFullList.mockRejectedValue(new Error("PB error"));

      await expect(getTeamInvites("team-1")).rejects.toThrow("PB error");
    });
  });
});
