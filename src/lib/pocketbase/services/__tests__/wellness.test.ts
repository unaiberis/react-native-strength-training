import { saveWellness, listWellness } from "../wellness";

const mockCreate = jest.fn();
const mockGetList = jest.fn();

jest.mock("../../client", () => ({
  pb: {
    collection: jest.fn(() => ({
      create: mockCreate,
      getList: mockGetList,
    })),
  },
}));

const USER_ID = "user_abc123";
const WELLNESS_INPUT = {
  sessionId: "session_xyz",
  date: "2026-07-06",
  sessionRpe: 7,
  sleepQuality: 4,
  fatigue: 3,
  soreness: 2,
  mood: 5,
  notes: "Feeling good",
};

describe("saveWellness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a wellness record with all fields mapped correctly", async () => {
const expectedRecord = {
      id: "wellness_001",
      user_id: USER_ID,
      session_id: "session_xyz",
      date: "2026-07-06",
      session_rpe: 7,
      sleep_quality: 4,
      fatigue: 3,
      soreness: 2,
      mood: 5,
      notes: "Feeling good",
      created_at: "2026-07-06T12:00:00Z",
    };
    mockCreate.mockResolvedValue(expectedRecord);

const result = await saveWellness(USER_ID, WELLNESS_INPUT);

    expect(mockCreate).toHaveBeenCalledWith({
      user_id: USER_ID,
      session_id: "session_xyz",
      date: "2026-07-06",
      session_rpe: 7,
      sleep_quality: 4,
      fatigue: 3,
      soreness: 2,
      mood: 5,
      notes: "Feeling good",
    });
    expect(result).toEqual(expectedRecord);
  });

  it("sets null for optional fields when not provided", async () => {
    mockCreate.mockResolvedValue({ id: "wellness_002" });

    await saveWellness(USER_ID, {
      date: "2026-07-06",
      sessionRpe: 5,
      sleepQuality: 3,
      fatigue: 3,
      soreness: 2,
      mood: 4,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: null,
        notes: null,
      }),
    );
  });

  it("throws when create returns null", async () => {
    mockCreate.mockResolvedValue(null);

    await expect(saveWellness(USER_ID, WELLNESS_INPUT)).rejects.toThrow(
      "Failed to save wellness entry",
    );
  });

  it("throws and wraps error from PocketBase", async () => {
    mockCreate.mockRejectedValue(new Error("Network error"));

    await expect(saveWellness(USER_ID, WELLNESS_INPUT)).rejects.toThrow(
      "Network error",
    );
  });

  it("handles generic thrown values", async () => {
    mockCreate.mockRejectedValue("string error");

    await expect(saveWellness(USER_ID, WELLNESS_INPUT)).rejects.toThrow(
      "Failed to save wellness entry",
    );
  });
});

describe("listWellness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches wellness entries with default pagination", async () => {
    mockGetList.mockResolvedValue({
      items: [{ id: "w1" }, { id: "w2" }],
      totalItems: 2,
    });

const result = await listWellness(USER_ID);

    expect(mockGetList).toHaveBeenCalledWith(1, 20, {
      filter: "user_id = 'user_abc123'",
      sort: "-date",
    });
    expect(result.data).toHaveLength(2);
    expect(result.count).toBe(2);
  });

  it("applies date range filters when provided", async () => {
    mockGetList.mockResolvedValue({ items: [], totalItems: 0 });

    await listWellness(USER_ID, {
      fromDate: "2026-06-01",
      toDate: "2026-07-01",
    });

    expect(mockGetList).toHaveBeenCalledWith(1, 20, {
      filter:
        "user_id = 'user_abc123' && date >= '2026-06-01' && date <= '2026-07-01'",
      sort: "-date",
    });
  });

  it("uses custom pagination when provided", async () => {
    mockGetList.mockResolvedValue({ items: [], totalItems: 0 });

    await listWellness(USER_ID, { page: 2, pageSize: 10 });

    expect(mockGetList).toHaveBeenCalledWith(3, 10, expect.any(Object));
  });

  it("returns empty data when items is null", async () => {
    mockGetList.mockResolvedValue({ items: null, totalItems: 0 });

const result = await listWellness(USER_ID);

    expect(result.data).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("throws on network error", async () => {
    mockGetList.mockRejectedValue(new Error("Network error"));

    await expect(listWellness(USER_ID)).rejects.toThrow("Network error");
  });
});
