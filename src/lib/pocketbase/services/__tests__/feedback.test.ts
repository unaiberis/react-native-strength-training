// Mock the client module so we control pb behavior
const mockCreate = jest.fn();
const mockGetFullList = jest.fn();
const mockGetList = jest.fn();

const mockPb = {
  collection: jest.fn(() => ({
    create: mockCreate,
    getFullList: mockGetFullList,
    getList: mockGetList,
  })),
};

jest.mock("../../client", () => ({
  pb: mockPb,
}));

import { submitFeedback, listFeedback } from "../feedback";
import type { WorkoutFeedbackRow } from "../../../../types/pocketbase";

const makeFeedbackRow = (
  overrides: Partial<WorkoutFeedbackRow> = {},
): WorkoutFeedbackRow => ({
  id: "fb-1",
  session_id: "sess-1",
  athlete_id: "athlete-1",
  coach_id: "coach-1",
  rating: 4,
  notes: "Great workout!",
  created_at: "2026-07-06T10:00:00Z",
  updated: "2026-07-06T10:00:00Z",
  ...overrides,
});

describe("PocketBase feedback service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("submitFeedback", () => {
    it("creates a feedback record in PocketBase and returns the row", async () => {
      const fb = makeFeedbackRow();
      mockCreate.mockResolvedValueOnce(fb);

      const result = await submitFeedback({
        sessionId: "sess-1",
        athleteId: "athlete-1",
        coachId: "coach-1",
        rating: 4,
        notes: "Great workout!",
      });

      expect(mockPb.collection).toHaveBeenCalledWith("workout_feedback");
      expect(mockCreate).toHaveBeenCalledWith({
        session_id: "sess-1",
        athlete_id: "athlete-1",
        coach_id: "coach-1",
        rating: 4,
        notes: "Great workout!",
      });
      expect(result.id).toBe("fb-1");
      expect(result.rating).toBe(4);
    });

    it("accepts null coachId", async () => {
      const fb = makeFeedbackRow({ coach_id: null, rating: 3, notes: null });
      mockCreate.mockResolvedValueOnce(fb);

      const result = await submitFeedback({
        sessionId: "sess-1",
        athleteId: "athlete-1",
        coachId: null,
        rating: 3,
        notes: null,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        session_id: "sess-1",
        athlete_id: "athlete-1",
        coach_id: null,
        rating: 3,
        notes: null,
      });
      expect(result.rating).toBe(3);
      expect(result.notes).toBeNull();
    });

    it("throws when PocketBase returns no record", async () => {
      mockCreate.mockResolvedValueOnce(null);

      await expect(
        submitFeedback({
          sessionId: "sess-1",
          athleteId: "athlete-1",
          rating: 5,
        }),
      ).rejects.toThrow("Failed to submit feedback:");
    });
  });

  describe("listFeedback", () => {
    it("returns feedback for an athlete ordered by newest first", async () => {
      const rows = [
        makeFeedbackRow({ id: "fb-2", rating: 5, created_at: "2026-07-06T12:00:00Z" }),
        makeFeedbackRow({ id: "fb-1", rating: 3, created_at: "2026-07-05T10:00:00Z" }),
      ];
      mockGetFullList.mockResolvedValueOnce(rows);

      const result = await listFeedback("athlete-1");

      expect(mockPb.collection).toHaveBeenCalledWith("workout_feedback");
      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: "athlete_id = 'athlete-1'",
        sort: "-created_at",
      });
      expect(result).toHaveLength(2);
      expect(result[0].rating).toBe(5);
    });

    it("returns empty array when athlete has no feedback", async () => {
      mockGetFullList.mockResolvedValueOnce([]);

      const result = await listFeedback("athlete-1");

      expect(result).toEqual([]);
    });

    it("throws on PocketBase error", async () => {
      mockGetFullList.mockRejectedValueOnce(new Error("Network error"));

      await expect(listFeedback("athlete-1")).rejects.toThrow(
        "Failed to list feedback:",
      );
    });
  });
});
