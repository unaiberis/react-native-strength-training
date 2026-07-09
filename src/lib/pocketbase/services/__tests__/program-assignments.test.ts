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
  assignProgram,
  listAssignments,
  listCoachAssignments,
  unassignProgram,
  updateAssignment,
  hasActiveAssignment,
} from "../program-assignments";
import type { ProgramAssignmentRow } from "../../../../types/pocketbase";

const makeAssignment = (
  overrides: Partial<ProgramAssignmentRow> = {},
): ProgramAssignmentRow => ({
  id: "pa-1",
  athlete_id: "athlete-1",
  coach_id: "coach-1",
  template_id: "tmpl-1",
  assigned_at: "2026-07-01",
  started_at: "2026-07-15",
  completed_at: null,
  program_id: null,
  notes: null,
  team_id: null,
  status: "active",
  created: "2026-07-01T00:00:00Z",
  updated: "2026-07-01T00:00:00Z",
  ...overrides,
});

describe("PocketBase program-assignments service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("assignProgram", () => {
    it("creates a new assignment when no duplicate exists", async () => {
      mockGetFullList.mockResolvedValueOnce([]);
      mockCreate.mockResolvedValueOnce(makeAssignment());

      const result = await assignProgram({
        athleteId: "athlete-1",
        coachId: "coach-1",
        templateId: "tmpl-1",
        startedAt: "2026-07-15",
        assignedAt: "2026-07-01",
      });

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter:
          "athlete_id = 'athlete-1' && template_id = 'tmpl-1' && started_at = '2026-07-15'",
        $autoCancel: false,
      });
      expect(mockCreate).toHaveBeenCalledWith({
        athlete_id: "athlete-1",
        coach_id: "coach-1",
        template_id: "tmpl-1",
        assigned_at: "2026-07-01",
        started_at: "2026-07-15",
        team_id: null,
        status: "active",
      });
      expect(result.status).toBe("active");
    });

    it("updates existing assignment when duplicate exists (last assignment wins)", async () => {
      const existing = makeAssignment({ id: "pa-existing" });
      mockGetFullList.mockResolvedValueOnce([existing]);
      mockUpdate.mockResolvedValueOnce({ ...existing, status: "active" });

      const result = await assignProgram({
        athleteId: "athlete-1",
        coachId: "coach-1",
        templateId: "tmpl-1",
        startedAt: "2026-07-15",
        assignedAt: "2026-07-01",
      });

      expect(mockUpdate).toHaveBeenCalledWith("pa-existing", {
        status: "active",
        coach_id: "coach-1",
      });
      expect(result.id).toBe("pa-existing");
    });

    it("throws on creation failure", async () => {
      mockGetFullList.mockResolvedValueOnce([]);
      mockCreate.mockRejectedValue(new Error("Create failed"));

      await expect(
        assignProgram({
          athleteId: "athlete-1",
          coachId: "coach-1",
          templateId: "tmpl-1",
          startedAt: "2026-07-15",
          assignedAt: "2026-07-01",
        }),
      ).rejects.toThrow("Create failed");
    });
  });

  describe("listAssignments", () => {
    it("returns assignments for an athlete", async () => {
      const assignments = [
        makeAssignment(),
        makeAssignment({ id: "pa-2", started_at: "2026-08-01" }),
      ];
      mockGetFullList.mockResolvedValueOnce(assignments);

      const result = await listAssignments("athlete-1");

      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: "athlete_id = 'athlete-1'",
        sort: "-started_at",
      });
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no assignments", async () => {
      mockGetFullList.mockResolvedValue([]);

      const result = await listAssignments("athlete-1");

      expect(result).toEqual([]);
    });
  });

  describe("listCoachAssignments", () => {
    it("returns assignments for teams where user is coach/admin", async () => {
      // Mock memberships query
      mockGetFullList.mockResolvedValueOnce([
        { id: "ms-1", user_id: "coach-1", team_id: "team-1", role: "coach" },
        { id: "ms-2", user_id: "coach-1", team_id: "team-2", role: "admin" },
      ]);
      // Mock assignments query
      mockGetFullList.mockResolvedValueOnce([makeAssignment()]);

      const result = await listCoachAssignments("coach-1");

      expect(mockGetFullList).toHaveBeenNthCalledWith(1, {
        filter: "user_id = 'coach-1' && (role = 'coach' || role = 'admin')",
        $autoCancel: false,
      });
      expect(result).toHaveLength(1);
    });

    it("returns empty when no team memberships", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await listCoachAssignments("coach-1");

      expect(result).toEqual([]);
    });
  });

  describe("unassignProgram", () => {
    it("deletes the assignment", async () => {
      mockDelete.mockResolvedValueOnce(true);

      await unassignProgram("pa-1");

      expect(mockDelete).toHaveBeenCalledWith("pa-1");
    });

    it("throws on deletion failure", async () => {
      mockDelete.mockRejectedValue(new Error("Delete failed"));

      await expect(unassignProgram("pa-1")).rejects.toThrow("Delete failed");
    });
  });

  describe("updateAssignment", () => {
    it("updates status and started_at", async () => {
      mockUpdate.mockResolvedValueOnce(makeAssignment({ status: "completed" }));

      const result = await updateAssignment("pa-1", { status: "completed" });

      expect(mockUpdate).toHaveBeenCalledWith("pa-1", {
        status: "completed",
        started_at: undefined,
      });
      expect(result.status).toBe("completed");
    });

    it("throws when assignment not found", async () => {
      mockUpdate.mockRejectedValue(new Error("Assignment not found"));

      await expect(
        updateAssignment("pa-1", { status: "cancelled" }),
      ).rejects.toThrow("Assignment not found");
    });
  });

  describe("hasActiveAssignment", () => {
    it("returns true when active assignment exists", async () => {
      mockGetFullList.mockResolvedValueOnce([{ id: "pa-1" }]);

      const result = await hasActiveAssignment(
        "athlete-1",
        "tmpl-1",
        "2026-07-15",
      );

      expect(result).toBe(true);
    });

    it("returns false when no active assignment", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await hasActiveAssignment(
        "athlete-1",
        "tmpl-1",
        "2026-07-15",
      );

      expect(result).toBe(false);
    });

    it("returns false on error", async () => {
      mockGetFullList.mockRejectedValue(new Error("Error"));

      const result = await hasActiveAssignment(
        "athlete-1",
        "tmpl-1",
        "2026-07-15",
      );

      expect(result).toBe(false);
    });
  });
});
