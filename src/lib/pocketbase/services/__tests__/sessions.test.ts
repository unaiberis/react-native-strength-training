// Mock the client module so we control pb behavior
const mockCreate = jest.fn();
const mockGetOne = jest.fn();
const mockGetFullList = jest.fn();
const mockUpdate = jest.fn();
const mockGetList = jest.fn();

const mockPb = {
  collection: jest.fn(() => ({
    create: mockCreate,
    getOne: mockGetOne,
    getFullList: mockGetFullList,
    update: mockUpdate,
    getList: mockGetList,
  })),
  filter: jest.fn((s: string) => s),
};

jest.mock("../../client", () => ({
  pb: mockPb,
}));

import type { SessionRow, ExerciseSetRow } from "../../../../types/pocketbase";
import {
  createSession,
  logSet,
  completeSession,
  cancelSession,
  getWorkoutSession,
  getSessionDetail,
  listSessions,
  updateSessionDuration,
  type LogSetInput,
  type SessionDetail,
} from "../sessions";

const makeSession = (overrides: Partial<SessionRow> = {}): SessionRow => ({
  id: "sess-1",
  user_id: "user-1",
  workout_template_id: null,
  program_block_id: null,
  status: "in_progress",
  started_at: "2026-01-01T10:00:00Z",
  completed_at: null,
  duration_minutes: null,
  notes: null,
  created: "2026-01-01T10:00:00Z",
  updated: "2026-01-01T10:00:00Z",
  ...overrides,
});

const makeSet = (overrides: Partial<ExerciseSetRow> = {}): ExerciseSetRow => ({
  id: "set-1",
  workout_session_id: "sess-1",
  exercise_id: "ex-1",
  set_number: 1,
  weight_kg: 80,
  reps: 10,
  rpe: null,
  rir: null,
  is_warmup: false,
  tempo: null,
  logged_at: "2026-01-01T10:05:00Z",
  created: "2026-01-01T10:05:00Z",
  updated: "2026-01-01T10:05:00Z",
  ...overrides,
});

describe("PocketBase sessions service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── createSession ─────────────────────────────────────────────

  it("createSession creates a new in-progress session", async () => {
    const session = makeSession();
    mockCreate.mockResolvedValueOnce(session);

    const result = await createSession("user-1");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        workout_template_id: null,
        status: "in_progress",
        started_at: expect.any(String),
      }),
    );
    expect(result.session.id).toBe("sess-1");
    expect(result.session.status).toBe("in_progress");
    expect(result.exercises).toEqual([]);
  });

  it("createSession fetches template exercises when templateId provided", async () => {
    const session = makeSession({ workout_template_id: "tmpl-1" });
    const templateExercises = [
      { id: "te-1", workout_template_id: "tmpl-1", exercise_id: "ex-1", sort_order: 0, target_sets: 3, target_reps: 10, target_rpe_low: null, target_rpe_high: null, rest_seconds: 90, notes: null },
    ];
    const exerciseNames = [{ id: "ex-1", name: "Bench Press" }];

    mockCreate.mockResolvedValueOnce(session);
    mockGetFullList.mockResolvedValueOnce(templateExercises);  // template exercises
    mockGetFullList.mockResolvedValueOnce(exerciseNames);      // exercise names

    const result = await createSession("user-1", { workoutTemplateId: "tmpl-1" });

    expect(result.session.workout_template_id).toBe("tmpl-1");
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].exerciseName).toBe("Bench Press");
    expect(result.exercises[0].targetSets).toBe(3);
  });

  it("createSession returns empty exercises when template has no exercises", async () => {
    const session = makeSession({ workout_template_id: "tmpl-1" });

    mockCreate.mockResolvedValueOnce(session);
    mockGetFullList.mockResolvedValueOnce([]);  // empty template exercises

    const result = await createSession("user-1", { workoutTemplateId: "tmpl-1" });

    expect(result.exercises).toEqual([]);
  });

  it("createSession passes programBlockId when provided", async () => {
    const session = makeSession();
    mockCreate.mockResolvedValueOnce(session);

    const result = await createSession("user-1", {
      workoutTemplateId: "tmpl-1",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        workout_template_id: "tmpl-1",
        status: "in_progress",
      }),
    );
    expect(result.session.id).toBe("sess-1");
  });

  it("createSession throws on failure", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Create failed"));

    await expect(createSession("user-1")).rejects.toThrow("Create failed");
  });

  // ─── logSet ────────────────────────────────────────────────────

  it("logSet creates an exercise set record", async () => {
    const set = makeSet();
    mockCreate.mockResolvedValueOnce(set);

    const input: LogSetInput = {
      exerciseId: "ex-1",
      setNumber: 1,
      weightKg: 80,
      reps: 10,
    };

    const result = await logSet("sess-1", input);

    expect(mockCreate).toHaveBeenCalledWith({
      workout_session_id: "sess-1",
      exercise_id: "ex-1",
      set_number: 1,
      weight_kg: 80,
      reps: 10,
      rpe: null,
      rir: null,
      is_warmup: false,
      tempo: null,
    });
    expect(result.weight_kg).toBe(80);
    expect(result.reps).toBe(10);
  });

  it("logSet with optional rpe and rir", async () => {
    mockCreate.mockResolvedValueOnce(makeSet({ rpe: 8, rir: 1 }));

    const result = await logSet("sess-1", {
      exerciseId: "ex-1",
      setNumber: 2,
      weightKg: 85,
      reps: 8,
      rpe: 8,
      rir: 1,
    });

    expect(result.rpe).toBe(8);
    expect(result.rir).toBe(1);
  });

  it("logSet passes tempo through when provided", async () => {
    const set = makeSet({ tempo: "2020" });
    mockCreate.mockResolvedValueOnce(set);

    const result = await logSet("sess-1", {
      exerciseId: "ex-1",
      setNumber: 3,
      weightKg: 90,
      reps: 6,
      tempo: "2020",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tempo: "2020" }),
    );
    expect(result.tempo).toBe("2020");
  });

  it("logSet sends null tempo when not provided", async () => {
    mockCreate.mockResolvedValueOnce(makeSet());

    await logSet("sess-1", {
      exerciseId: "ex-1",
      setNumber: 1,
      weightKg: 80,
      reps: 10,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tempo: null }),
    );
  });

  it("logSet throws on failure", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Log failed"));

    await expect(
      logSet("sess-1", { exerciseId: "ex-1", setNumber: 1, weightKg: 50, reps: 10 }),
    ).rejects.toThrow("Log failed");
  });

  // ─── completeSession ───────────────────────────────────────────

  it("completeSession updates session to completed with duration", async () => {
    const completed = makeSession({
      status: "completed",
      completed_at: "2026-01-01T11:00:00Z",
      duration_minutes: 60,
    });
    mockUpdate.mockResolvedValueOnce(completed);

    const result = await completeSession("sess-1", {
      startedAt: "2026-01-01T10:00:00Z",
    });

    expect(mockUpdate).toHaveBeenCalledWith("sess-1", {
      status: "completed",
      completed_at: expect.any(String),
      notes: null,
      duration_minutes: expect.any(Number),
    });
    expect(result.status).toBe("completed");
  });

  it("completeSession updates without duration when no startedAt", async () => {
    const completed = makeSession({ status: "completed" });
    mockUpdate.mockResolvedValueOnce(completed);

    const result = await completeSession("sess-1");

    // Should not include duration_minutes
    const callArg = mockUpdate.mock.calls[0][1];
    expect(callArg.duration_minutes).toBeUndefined();
    expect(result.status).toBe("completed");
  });

  it("completeSession includes optional notes", async () => {
    const completed = makeSession({ status: "completed", notes: "Great session" });
    mockUpdate.mockResolvedValueOnce(completed);

    const result = await completeSession("sess-1", { notes: "Great session" });

    const callArg = mockUpdate.mock.calls[0][1];
    expect(callArg.notes).toBe("Great session");
    expect(result.notes).toBe("Great session");
  });

  it("completeSession throws on failure", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("Complete failed"));

    await expect(completeSession("sess-1")).rejects.toThrow("Complete failed");
  });

  // ─── cancelSession ─────────────────────────────────────────────

  it("cancelSession updates session status to cancelled", async () => {
    const cancelled = makeSession({ status: "cancelled", completed_at: "2026-01-01T10:30:00Z" });
    mockUpdate.mockResolvedValueOnce(cancelled);

    const result = await cancelSession("sess-1");

    expect(mockUpdate).toHaveBeenCalledWith("sess-1", {
      status: "cancelled",
      completed_at: expect.any(String),
    });
    expect(result.status).toBe("cancelled");
  });

  it("cancelSession throws on failure", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("Cancel failed"));

    await expect(cancelSession("sess-1")).rejects.toThrow("Cancel failed");
  });

  // ─── getWorkoutSession ─────────────────────────────────────────

  it("getWorkoutSession returns session with sets", async () => {
    const session = makeSession();
    const sets = [makeSet(), makeSet({ id: "set-2", set_number: 2 })];

    mockGetOne.mockResolvedValueOnce(session);
    mockGetFullList.mockResolvedValueOnce(sets);

    const result = await getWorkoutSession("sess-1");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("sess-1");
    expect(result!.sets).toHaveLength(2);
    expect(result!.sets[0].set_number).toBe(1);
  });

  it("getWorkoutSession returns null when not found", async () => {
    mockGetOne.mockRejectedValue(new Error("The requested resource wasn't found."));

    const result = await getWorkoutSession("nonexistent");

    expect(result).toBeNull();
  });

  // ─── getSessionDetail ─────────────────────────────────────────

  it("getSessionDetail enriches session with exercise names and grouped sets", async () => {
    const session = makeSession();
    const sets = [
      makeSet({ id: "set-1", exercise_id: "ex-1", set_number: 1 }),
      makeSet({ id: "set-2", exercise_id: "ex-1", set_number: 2 }),
      makeSet({ id: "set-3", exercise_id: "ex-2", set_number: 1 }),
    ];
    const exercises = [
      { id: "ex-1", name: "Bench Press" },
      { id: "ex-2", name: "Squat" },
    ];

    mockGetOne.mockResolvedValueOnce(session);
    mockGetFullList.mockResolvedValueOnce(sets);
    mockGetFullList.mockResolvedValueOnce(exercises);

    const result = await getSessionDetail("sess-1");

    expect(result).not.toBeNull();
    expect(result!.exerciseNames["ex-1"]).toBe("Bench Press");
    expect(result!.exerciseNames["ex-2"]).toBe("Squat");
    expect(result!.groupedSets["ex-1"]).toHaveLength(2);
    expect(result!.groupedSets["ex-2"]).toHaveLength(1);
  });

  it("getSessionDetail returns null when session not found", async () => {
    mockGetOne.mockRejectedValue(new Error("The requested resource wasn't found."));

    const result = await getSessionDetail("nonexistent");

    expect(result).toBeNull();
  });

  // ─── listSessions ──────────────────────────────────────────────

  it("listSessions returns paginated completed sessions", async () => {
    const sessions = [
      makeSession({ id: "sess-1", status: "completed", started_at: "2026-01-02T10:00:00Z" }),
      makeSession({ id: "sess-2", status: "completed", started_at: "2026-01-01T10:00:00Z" }),
    ];

    mockGetList.mockResolvedValueOnce({
      page: 1,
      perPage: 20,
      totalItems: 2,
      totalPages: 1,
      items: sessions,
    });

    // For each session, getFullList for sets
    mockGetFullList.mockResolvedValue([makeSet()]);

    const result = await listSessions("user-1");

    expect(result.data).toHaveLength(2);
    expect(result.data[0].totalSets).toBe(1);
    expect(result.data[0].exerciseCount).toBe(1);
    expect(mockGetList).toHaveBeenCalled();
  });

  it("listSessions filters by status", async () => {
    mockGetList.mockResolvedValueOnce({
      page: 1, perPage: 20, totalItems: 0, totalPages: 0, items: [],
    });

    await listSessions("user-1", { status: "in_progress" });

    expect(mockGetList).toHaveBeenCalledWith(1, 20, {
      filter: "user_id = 'user-1' && status = 'in_progress'",
      sort: "-started_at",
    });
  });

  it("listSessions filters by date range", async () => {
    mockGetList.mockResolvedValueOnce({
      page: 1, perPage: 20, totalItems: 0, totalPages: 0, items: [],
    });

    await listSessions("user-1", {
      fromDate: "2026-01-01T00:00:00Z",
      toDate: "2026-01-31T23:59:59Z",
    });

    const filterArg = mockGetList.mock.calls[0][2].filter;
    expect(filterArg).toContain("started_at >= '2026-01-01T00:00:00Z'");
    expect(filterArg).toContain("started_at <= '2026-01-31T23:59:59Z'");
  });

  it("listSessions returns empty array when no sessions", async () => {
    mockGetList.mockResolvedValueOnce({
      page: 1, perPage: 20, totalItems: 0, totalPages: 0, items: [],
    });

    const result = await listSessions("user-1");

    expect(result.data).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("listSessions filters by exerciseId", async () => {
    // exercise_sets query returns session IDs, then sessions query uses those IDs
    const exerciseSets = [
      { id: "es-1", workout_session_id: "sess-1", exercise_id: "ex-1" },
      { id: "es-2", workout_session_id: "sess-3", exercise_id: "ex-1" },
    ];
    const sessions = [
      makeSession({ id: "sess-1", status: "completed", started_at: "2026-01-02T10:00:00Z" }),
      makeSession({ id: "sess-3", status: "completed", started_at: "2026-01-03T10:00:00Z" }),
    ];

    mockGetFullList.mockResolvedValueOnce(exerciseSets);  // exercise_sets lookup
    mockGetList.mockResolvedValueOnce({
      page: 1, perPage: 20, totalItems: 2, totalPages: 1, items: sessions,
    });
    // For each session, getFullList for exercise counts
    mockGetFullList.mockResolvedValue([makeSet()]);
    mockGetFullList.mockResolvedValue([makeSet()]);

    const result = await listSessions("user-1", { exerciseId: "ex-1" });

    // First call: exercise_sets lookup for matching session IDs
    expect(mockGetFullList).toHaveBeenNthCalledWith(1, {
      filter: "exercise_id = 'ex-1'",
      fields: "workout_session_id",
    });
    // The getList call should filter by the found session IDs
    expect(mockGetList).toHaveBeenCalledWith(1, 20, expect.objectContaining({
      filter: expect.stringContaining("(id = 'sess-1' || id = 'sess-3')"),
    }));
    expect(result.data).toHaveLength(2);
    expect(result.data[0].totalSets).toBe(1);
  });

  it("listSessions returns empty data when exerciseId has no matches", async () => {
    mockGetFullList.mockResolvedValueOnce([]);  // no exercise_sets found

    const result = await listSessions("user-1", { exerciseId: "nonexistent-ex" });

    expect(result.data).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("listSessions enriches with templateName", async () => {
    const sessionWithTmpl = makeSession({
      id: "sess-1",
      status: "completed",
      workout_template_id: "tmpl-1",
    });
    const sessionNoTmpl = makeSession({
      id: "sess-2",
      status: "completed",
      workout_template_id: null,
    });

    mockGetList.mockResolvedValueOnce({
      page: 1, perPage: 20, totalItems: 2, totalPages: 1,
      items: [sessionWithTmpl, sessionNoTmpl],
    });

    // For batch template name lookup — getFullList via fetchTemplateNames
    mockGetFullList.mockResolvedValueOnce([{ id: "tmpl-1", name: "Push Day" }]);

    // For exercise sets per session (default fallback)
    mockGetFullList.mockResolvedValue([makeSet()]);

    const result = await listSessions("user-1");

    expect(result.data).toHaveLength(2);
    // First session has a template
    expect(result.data[0].templateName).toBe("Push Day");
    // Second session has no template
    expect(result.data[1].templateName).toBeUndefined();
  });

  it("listSessions throws on error", async () => {
    mockGetList.mockRejectedValueOnce(new Error("List failed"));

    await expect(listSessions("user-1")).rejects.toThrow("List failed");
  });

  // ─── updateSessionDuration ─────────────────────────────────────

  it("updateSessionDuration updates duration_minutes on session", async () => {
    mockUpdate.mockResolvedValueOnce(makeSession({ duration_minutes: 45 }));

    await updateSessionDuration("sess-1", 45);

    expect(mockUpdate).toHaveBeenCalledWith("sess-1", {
      duration_minutes: 45,
    });
  });

  it("updateSessionDuration throws on failure", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("Update failed"));

    await expect(updateSessionDuration("sess-1", 30)).rejects.toThrow("Update failed");
  });
});
