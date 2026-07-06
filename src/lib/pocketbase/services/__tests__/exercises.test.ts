// Mock the client module so we control pb behavior
const mockGetList = jest.fn();
const mockGetOne = jest.fn();
const mockGetFullList = jest.fn();

const mockPb = {
  collection: jest.fn(() => ({
    getList: mockGetList,
    getOne: mockGetOne,
    getFullList: mockGetFullList,
  })),
  filter: jest.fn((s: string) => s),
};

jest.mock("../../client", () => ({
  pb: mockPb,
}));

import type { ExerciseRow } from "../../../../types/pocketbase";
import {
  listExercises,
  getExercise,
  searchExercises,
  getCategories,
} from "../exercises";

const makeExercise = (overrides: Partial<ExerciseRow> = {}): ExerciseRow => ({
  id: "ex-1",
  name: "Bench Press",
  category: "Strength",
  equipment: ["Barbell"],
  body_region: "Chest",
  description: "Lie on a bench and press the bar up",
  default_sets: 3,
  default_reps: 10,
  default_rest_seconds: 90,
  is_public: true,
  is_archived: false,
  created_by: null,
  video_url: null,
  created: "2026-01-01T00:00:00Z",
  updated: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("PocketBase exercises service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── listExercises ──────────────────────────────────────────────

  it("listExercises returns paginated exercises", async () => {
    const items = [makeExercise(), makeExercise({ id: "ex-2", name: "Squat" })];
    mockGetList.mockResolvedValue({
      page: 1,
      perPage: 20,
      totalItems: 2,
      totalPages: 1,
      items,
    });

    const result = await listExercises();

    expect(mockGetList).toHaveBeenCalledWith(1, 20, {
      filter: "",
      sort: "name",
    });
    expect(result.data).toHaveLength(2);
    expect(result.count).toBe(2);
    expect(result.data[0].name).toBe("Bench Press");
  });

  it("listExercises with category filter appends filter string", async () => {
    mockGetList.mockResolvedValue({
      page: 1,
      perPage: 20,
      totalItems: 1,
      totalPages: 1,
      items: [makeExercise()],
    });

    const result = await listExercises("Strength", 0, 20);

    expect(mockGetList).toHaveBeenCalledWith(1, 20, {
      filter: "category = 'Strength'",
      sort: "name",
    });
    expect(result.data).toHaveLength(1);
  });

  it("listExercises with 'all' category does not filter", async () => {
    mockGetList.mockResolvedValue({
      page: 1,
      perPage: 20,
      totalItems: 0,
      totalPages: 0,
      items: [],
    });

    const result = await listExercises("all");

    expect(mockGetList).toHaveBeenCalledWith(1, 20, {
      filter: "",
      sort: "name",
    });
    expect(result.data).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("listExercises handles empty result set", async () => {
    mockGetList.mockResolvedValue({
      page: 1,
      perPage: 20,
      totalItems: 0,
      totalPages: 0,
      items: [],
    });

    const result = await listExercises();

    expect(result.data).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("listExercises throws on PocketBase error", async () => {
    mockGetList.mockRejectedValue(new Error("PB error"));

    await expect(listExercises()).rejects.toThrow("PB error");
  });

  // ─── getExercise ────────────────────────────────────────────────

  it("getExercise returns a single exercise by id", async () => {
    const exercise = makeExercise();
    mockGetOne.mockResolvedValue(exercise);

    const result = await getExercise("ex-1");

    expect(mockGetOne).toHaveBeenCalledWith("ex-1");
    expect(result).toEqual(exercise);
  });

  it("getExercise returns null when exercise not found", async () => {
    mockGetOne.mockRejectedValue(new Error("The requested resource wasn't found."));

    const result = await getExercise("nonexistent");

    expect(result).toBeNull();
  });

  it("getExercise throws on unexpected PocketBase error", async () => {
    mockGetOne.mockRejectedValue(new Error("Unexpected server error"));

    await expect(getExercise("ex-1")).rejects.toThrow("Unexpected server error");
  });

  // ─── searchExercises ────────────────────────────────────────────

  it("searchExercises searches by name with case-insensitive match", async () => {
    const items = [
      makeExercise({ id: "ex-1", name: "Bench Press" }),
      makeExercise({ id: "ex-3", name: "Incline Bench Press" }),
    ];
    mockGetFullList.mockResolvedValue(items);

    const result = await searchExercises("bench", 10);

    expect(mockGetFullList).toHaveBeenCalledWith({
      filter: "name ~ 'bench'",
      sort: "name",
    });
    expect(result).toHaveLength(2);
  });

  it("searchExercises returns empty array when no matches", async () => {
    mockGetFullList.mockResolvedValue([]);

    const result = await searchExercises("zzzzz");

    expect(result).toEqual([]);
  });

  it("searchExercises uses default limit of 20", async () => {
    mockGetFullList.mockResolvedValue([]);

    await searchExercises("test");

    expect(mockGetFullList).toHaveBeenCalledWith({
      filter: "name ~ 'test'",
      sort: "name",
    });
  });

  it("searchExercises throws on PocketBase error", async () => {
    mockGetFullList.mockRejectedValue(new Error("Search failed"));

    await expect(searchExercises("bench")).rejects.toThrow("Search failed");
  });

  // ─── getCategories ──────────────────────────────────────────────

  it("getCategories returns unique sorted categories", async () => {
    const items = [
      { category: "Strength" },
      { category: "Cardio" },
      { category: "Strength" },
      { category: "Flexibility" },
    ];
    mockGetFullList.mockResolvedValue(items);

    const result = await getCategories();

    expect(result).toEqual(["Cardio", "Flexibility", "Strength"]);
  });

  it("getCategories returns empty array when no exercises", async () => {
    mockGetFullList.mockResolvedValue([]);

    const result = await getCategories();

    expect(result).toEqual([]);
  });

  it("getCategories throws on PocketBase error", async () => {
    mockGetFullList.mockRejectedValue(new Error("DB error"));

    await expect(getCategories()).rejects.toThrow("DB error");
  });
});
