import { createWellnessEntry, getWellnessEntry } from "../wellness";

// Mock the PocketBase client
jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn().mockReturnThis(),
    create: jest.fn(),
    getFirstListItem: jest.fn(),
  },
}));

describe("wellness service", () => {
  const mockCreate = jest.fn();
  const mockGetFirst = jest.fn();

  beforeEach(() => {
    const { pb } = require("@/lib/pocketbase/client");
    pb.collection.mockReturnValue({ create: mockCreate, getFirstListItem: mockGetFirst });
    jest.clearAllMocks();
  });

  describe("createWellnessEntry", () => {
    it("creates a wellness entry with all fields", async () => {
      const userId = "user123";
      const data = {
        date: "2026-07-07",
        session_rpe: 8,
        sleep: 4,
        fatigue: 3,
        soreness: 2,
        mood: 5,
        session_id: "session456",
      };
      const expectedResponse = {
        id: "wellness1",
        ...data,
        user_id: userId,
        created_at: "2026-07-07T10:00:00Z",
      };
      mockCreate.mockResolvedValue(expectedResponse);

      const result = await createWellnessEntry(userId, data);
      expect(mockCreate).toHaveBeenCalledWith({
        user_id: userId,
        date: data.date,
        session_rpe: 8,
        sleep: 4,
        fatigue: 3,
        soreness: 2,
        mood: 5,
        session_id: "session456",
      });
      expect(result).toEqual(expectedResponse);
    });

    it("creates a wellness entry with minimal fields", async () => {
      const userId = "user123";
      const data = { date: "2026-07-07" };
      mockCreate.mockResolvedValue({
        id: "w1",
        user_id: userId,
        date: "2026-07-07",
        session_rpe: null,
        sleep: null,
        fatigue: null,
        soreness: null,
        mood: null,
        session_id: null,
        created_at: "2026-07-07T10:00:00Z",
      });

      await createWellnessEntry(userId, data);
      expect(mockCreate).toHaveBeenCalledWith({
        user_id: userId,
        date: "2026-07-07",
        session_rpe: null,
        sleep: null,
        fatigue: null,
        soreness: null,
        mood: null,
        session_id: null,
      });
    });
  });

  describe("getWellnessEntry", () => {
    it("returns a wellness entry for user+date", async () => {
      const expected = {
        id: "w1",
        user_id: "u1",
        date: "2026-07-07",
        session_rpe: 7,
      };
      mockGetFirst.mockResolvedValue(expected);

      const result = await getWellnessEntry("u1", "2026-07-07");
      expect(result).toEqual(expected);
      expect(mockGetFirst).toHaveBeenCalledWith(
        'user_id="u1" && date="2026-07-07"',
      );
    });

    it("returns null when no entry found", async () => {
      mockGetFirst.mockRejectedValue(new Error("Not found"));

      const result = await getWellnessEntry("u1", "2026-07-07");
      expect(result).toBeNull();
    });
  });
});
