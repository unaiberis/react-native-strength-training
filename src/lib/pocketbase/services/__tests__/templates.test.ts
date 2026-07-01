// Mock the client module so we control pb behavior
const mockCreate = jest.fn();
const mockGetOne = jest.fn();
const mockGetFullList = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockPb = {
  collection: jest.fn(() => ({
    create: mockCreate,
    getOne: mockGetOne,
    getFullList: mockGetFullList,
    update: mockUpdate,
    delete: mockDelete,
  })),
};

jest.mock("../../client", () => ({
  pb: mockPb,
}));

import type { TemplateRow, TemplateExerciseRow } from "../../../../types/pocketbase";
import type { WorkoutTemplateInput } from "../../../../shared/schemas/template";
import {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  reorderTemplateExercises,
  type TemplateWithExercises,
} from "../templates";

const makeTemplate = (overrides: Partial<TemplateRow> = {}): TemplateRow => ({
  id: "tmpl-1",
  user_id: "user-1",
  name: "Push Day",
  description: "Chest, shoulders, triceps",
  program_block_id: null,
  is_public: false,
  created: "2026-01-01T00:00:00Z",
  updated: "2026-01-01T00:00:00Z",
  ...overrides,
});

const makeTemplateExercise = (
  overrides: Partial<TemplateExerciseRow> = {},
): TemplateExerciseRow => ({
  id: "te-1",
  workout_template_id: "tmpl-1",
  exercise_id: "ex-1",
  sort_order: 0,
  target_sets: 3,
  target_reps: 10,
  target_rpe_low: null,
  target_rpe_high: null,
  rest_seconds: 90,
  notes: null,
  ...overrides,
});

const validInput: WorkoutTemplateInput = {
  name: "Push Day",
  description: "Chest day",
  isPublic: false,
  exercises: [
    {
      exerciseId: "ex-1",
      sortOrder: 0,
      targetSets: 3,
      targetReps: 10,
      targetRpeLow: null,
      targetRpeHigh: null,
      restSeconds: 90,
      notes: null,
    },
  ],
};

describe("PocketBase templates service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── createTemplate ─────────────────────────────────────────────

  it("createTemplate creates template and exercises", async () => {
    const template = makeTemplate();
    const exercise = makeTemplateExercise();
    mockCreate.mockResolvedValueOnce(template);
    mockCreate.mockResolvedValueOnce(exercise);

    const result = await createTemplate("user-1", validInput);

    // First call: create the template
    expect(mockCreate).toHaveBeenNthCalledWith(1, {
      user_id: "user-1",
      name: "Push Day",
      description: "Chest day",
      program_block_id: null,
      is_public: false,
    });

    // Second call: create the exercise
    expect(mockCreate).toHaveBeenNthCalledWith(2, {
      workout_template_id: "tmpl-1",
      exercise_id: "ex-1",
      sort_order: 0,
      target_sets: 3,
      target_reps: 10,
      target_rpe_low: null,
      target_rpe_high: null,
      rest_seconds: 90,
      notes: null,
    });

    expect(result.id).toBe("tmpl-1");
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].exercise_id).toBe("ex-1");
  });

  it("createTemplate creates multiple exercises", async () => {
    const template = makeTemplate();
    const input: WorkoutTemplateInput = {
      name: "Full Body",
      isPublic: false,
      exercises: [
        { exerciseId: "ex-1", sortOrder: 0, targetSets: 3, targetReps: 10, restSeconds: 90 },
        { exerciseId: "ex-2", sortOrder: 1, targetSets: 3, targetReps: 12, restSeconds: 60 },
      ],
    };

    mockCreate.mockResolvedValueOnce(template);
    mockCreate.mockResolvedValueOnce(makeTemplateExercise({ id: "te-1", exercise_id: "ex-1", sort_order: 0 }));
    mockCreate.mockResolvedValueOnce(makeTemplateExercise({ id: "te-2", exercise_id: "ex-2", sort_order: 1 }));

    const result = await createTemplate("user-1", input);

    expect(mockCreate).toHaveBeenCalledTimes(3); // 1 template + 2 exercises
    expect(result.exercises).toHaveLength(2);
  });

  it("createTemplate throws on template creation failure", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Failed to create template"));

    await expect(createTemplate("user-1", validInput)).rejects.toThrow("Failed to create template");
  });

  it("createTemplate throws on exercise creation failure", async () => {
    mockCreate.mockResolvedValueOnce(makeTemplate());
    mockCreate.mockRejectedValueOnce(new Error("Failed to create exercise"));

    await expect(createTemplate("user-1", validInput)).rejects.toThrow("Failed to create exercise");
  });

  it("createTemplate passes programBlockId when provided", async () => {
    const template = makeTemplate();
    const exercise = makeTemplateExercise();
    mockCreate.mockResolvedValueOnce(template);
    mockCreate.mockResolvedValueOnce(exercise);

    await createTemplate("user-1", {
      ...validInput,
      programBlockId: "block-1",
    });

    expect(mockCreate).toHaveBeenNthCalledWith(1, {
      user_id: "user-1",
      name: "Push Day",
      description: "Chest day",
      program_block_id: "block-1",
      is_public: false,
    });
  });

  // ─── listTemplates ──────────────────────────────────────────────

  it("listTemplates returns templates with exercises", async () => {
    const templates = [
      makeTemplate({ id: "tmpl-1", name: "Push Day" }),
      makeTemplate({ id: "tmpl-2", name: "Pull Day" }),
    ];
    const ex1 = makeTemplateExercise({ workout_template_id: "tmpl-1" });
    const ex2 = makeTemplateExercise({
      id: "te-2",
      workout_template_id: "tmpl-2",
      exercise_id: "ex-2",
      sort_order: 1,
    });

    mockGetFullList.mockResolvedValueOnce(templates);
    mockGetFullList.mockResolvedValueOnce([ex1]);
    mockGetFullList.mockResolvedValueOnce([ex2]);

    const result = await listTemplates("user-1");

    expect(mockGetFullList).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Push Day");
    expect(result[0].exercises).toHaveLength(1);
    expect(result[1].exercises).toHaveLength(1);
  });

  it("listTemplates returns empty array when no templates", async () => {
    mockGetFullList.mockResolvedValue([]);

    const result = await listTemplates("user-1");

    expect(result).toEqual([]);
  });

  it("listTemplates throws on PocketBase error", async () => {
    mockGetFullList.mockRejectedValue(new Error("PB error"));

    await expect(listTemplates("user-1")).rejects.toThrow("PB error");
  });

  // ─── getTemplate ────────────────────────────────────────────────

  it("getTemplate returns template with exercises", async () => {
    const template = makeTemplate();
    const exercises = [
      makeTemplateExercise(),
      makeTemplateExercise({ id: "te-2", sort_order: 1 }),
    ];

    mockGetOne.mockResolvedValueOnce(template);
    mockGetFullList.mockResolvedValueOnce(exercises);

    const result = await getTemplate("tmpl-1");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("tmpl-1");
    expect(result!.exercises).toHaveLength(2);
  });

  it("getTemplate returns null when not found", async () => {
    mockGetOne.mockRejectedValue(new Error("The requested resource wasn't found."));

    const result = await getTemplate("nonexistent");

    expect(result).toBeNull();
  });

  it("getTemplate throws on unexpected error", async () => {
    mockGetOne.mockRejectedValue(new Error("Unexpected"));

    await expect(getTemplate("tmpl-1")).rejects.toThrow("Unexpected");
  });

  // ─── updateTemplate ─────────────────────────────────────────────

  it("updateTemplate updates metadata and replaces exercises", async () => {
    const updatedTemplate = makeTemplate({ name: "Updated Push" });
    const existingExercise = makeTemplateExercise({ id: "te-old" });

    // Order: 1) update template, 2) get existing exercises, 3) delete each, 4) create new
    mockUpdate.mockResolvedValueOnce(updatedTemplate);
    mockGetFullList.mockResolvedValueOnce([existingExercise]);        // getTemplateExercises
    mockDelete.mockResolvedValueOnce(true);                            // delete te-old
    mockCreate.mockResolvedValueOnce(makeTemplateExercise({ id: "te-new" }));

    const result = await updateTemplate("tmpl-1", {
      name: "Updated Push",
      description: null,
      isPublic: false,
      exercises: [
        { exerciseId: "ex-1", sortOrder: 0, targetSets: 4, targetReps: 8, restSeconds: 120 },
      ],
    });

    expect(mockUpdate).toHaveBeenCalledWith("tmpl-1", {
      name: "Updated Push",
      description: null,
      program_block_id: null,
      is_public: false,
    });

    expect(mockDelete).toHaveBeenCalledWith("te-old"); // delete existing exercise

    expect(result.name).toBe("Updated Push");
    expect(result.exercises).toHaveLength(1);
  });

  it("updateTemplate passes programBlockId when provided", async () => {
    const updatedTemplate = makeTemplate({ name: "Updated Push", program_block_id: "block-1" });
    const existingExercise = makeTemplateExercise({ id: "te-old" });

    mockUpdate.mockResolvedValueOnce(updatedTemplate);
    mockGetFullList.mockResolvedValueOnce([existingExercise]);
    mockDelete.mockResolvedValueOnce(true);
    mockCreate.mockResolvedValueOnce(makeTemplateExercise({ id: "te-new" }));

    await updateTemplate("tmpl-1", {
      name: "Updated Push",
      description: null,
      programBlockId: "block-1",
      isPublic: false,
      exercises: [
        { exerciseId: "ex-1", sortOrder: 0, targetSets: 4, targetReps: 8, restSeconds: 120 },
      ],
    });

    expect(mockUpdate).toHaveBeenCalledWith("tmpl-1", {
      name: "Updated Push",
      description: null,
      program_block_id: "block-1",
      is_public: false,
    });
  });

  it("updateTemplate throws on update failure", async () => {
    mockUpdate.mockRejectedValue(new Error("Update failed"));

    await expect(
      updateTemplate("tmpl-1", {
        name: "Fail",
        isPublic: false,
        exercises: [{ exerciseId: "ex-1", sortOrder: 0, targetSets: 3, targetReps: 10, restSeconds: 90 }],
      }),
    ).rejects.toThrow("Update failed");
  });

  // ─── deleteTemplate ─────────────────────────────────────────────

  it("deleteTemplate deletes template and cascade handles exercises", async () => {
    mockDelete.mockResolvedValueOnce(true);

    await deleteTemplate("tmpl-1");

    expect(mockDelete).toHaveBeenCalledWith("tmpl-1");
  });

  it("deleteTemplate throws on failure", async () => {
    mockDelete.mockRejectedValue(new Error("Delete failed"));

    await expect(deleteTemplate("tmpl-1")).rejects.toThrow("Delete failed");
  });

  // ─── reorderTemplateExercises ───────────────────────────────────

  it("reorderTemplateExercises updates sort_order for each exercise", async () => {
    mockUpdate.mockResolvedValue(true);

    await reorderTemplateExercises("tmpl-1", ["te-2", "te-1", "te-3"]);

    expect(mockUpdate).toHaveBeenCalledTimes(3);
    expect(mockUpdate).toHaveBeenNthCalledWith(1, "te-2", { sort_order: 0 });
    expect(mockUpdate).toHaveBeenNthCalledWith(2, "te-1", { sort_order: 1 });
    expect(mockUpdate).toHaveBeenNthCalledWith(3, "te-3", { sort_order: 2 });
  });

  it("reorderTemplateExercises throws on update failure", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("Reorder failed"));

    await expect(
      reorderTemplateExercises("tmpl-1", ["te-1"]),
    ).rejects.toThrow("Reorder failed");
  });
});
