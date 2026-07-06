// Mock the client module
const mockGetFullList = jest.fn();

const mockPb = {
  collection: jest.fn(() => ({
    getFullList: mockGetFullList,
  })),
};

jest.mock("../../client", () => ({
  pb: mockPb,
}));

import {
  getVolumeHistory,
  getComplianceHistory,
  getPREvolution,
} from "../coach-analytics";

describe("PocketBase coach-analytics service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getVolumeHistory", () => {
    it("returns weekly volume data points", async () => {
      const sessions = [
        { id: "s1", started_at: "2026-06-01T10:00:00Z" },
        { id: "s2", started_at: "2026-06-08T10:00:00Z" },
      ];
      mockGetFullList.mockResolvedValueOnce(sessions);
      // Sets for week 1 (s1)
      mockGetFullList.mockResolvedValueOnce([
        { weight_kg: 100, reps: 10 },
      ]);
      // Sets for week 2 (s2)
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getVolumeHistory("athlete-1", 12);

      expect(result.length).toBe(2);
      expect(result[0].totalVolumeKg).toBeGreaterThan(0);
      expect(result[0].sessionCount).toBe(1);
      expect(mockGetFullList).toHaveBeenCalledTimes(3);
    });

    it("returns empty array when no sessions", async () => {
      mockGetFullList.mockResolvedValue([]);

      const result = await getVolumeHistory("athlete-1");

      expect(result).toEqual([]);
    });

    it("throws on PocketBase error", async () => {
      mockGetFullList.mockRejectedValue(new Error("PB error"));

      await expect(getVolumeHistory("athlete-1")).rejects.toThrow("PB error");
    });
  });

  describe("getComplianceHistory", () => {
    it("returns weekly compliance data points", async () => {
      const sessions = [
        { id: "s1", started_at: "2026-06-01T10:00:00Z", status: "completed" },
        { id: "s2", started_at: "2026-06-01T14:00:00Z", status: "completed" },
        { id: "s3", started_at: "2026-06-08T10:00:00Z", status: "cancelled" },
      ];
      mockGetFullList.mockResolvedValueOnce(sessions);

      const result = await getComplianceHistory("athlete-1", 12);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].rate).toBeGreaterThan(0);
      // Verify the filter includes the athlete filter
      const callArgs = mockGetFullList.mock.calls[0][0];
      expect(callArgs.filter).toContain("user_id = 'athlete-1'");
      expect(callArgs.sort).toBe("started_at");
    });

    it("returns empty array when no sessions", async () => {
      mockGetFullList.mockResolvedValue([]);

      const result = await getComplianceHistory("athlete-1");

      expect(result).toEqual([]);
    });
  });

  describe("getPREvolution", () => {
    it("returns PR evolution points", async () => {
      const sessions = [
        { id: "s1", started_at: "2026-06-01T10:00:00Z" },
        { id: "s2", started_at: "2026-06-08T10:00:00Z" },
      ];
      mockGetFullList.mockResolvedValueOnce(sessions);
      // Sets for session batch (both sessions in one batch since 2 < 50)
      mockGetFullList.mockResolvedValueOnce([
        {
          workout_session_id: "s1",
          exercise_id: "ex-1",
          weight_kg: 100,
          reps: 5,
          is_warmup: false,
          logged_at: "2026-06-01T10:00:00Z",
        },
      ]);
      // Exercise names
      mockGetFullList.mockResolvedValueOnce([
        { id: "ex-1", name: "Bench Press" },
      ]);

      const result = await getPREvolution("athlete-1", 24);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].exerciseName).toBe("Bench Press");
      expect(result[0].value).toBeGreaterThan(0);
    });

    it("returns empty array when no sessions", async () => {
      mockGetFullList.mockResolvedValue([]);

      const result = await getPREvolution("athlete-1");

      expect(result).toEqual([]);
    });

    it("returns empty array when no working sets", async () => {
      mockGetFullList.mockResolvedValueOnce([{ id: "s1", started_at: "2026-06-01T10:00:00Z" }]);
      // Sets call returns empty — no working sets
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await getPREvolution("athlete-1");

      expect(result).toEqual([]);
    });
  });
});
