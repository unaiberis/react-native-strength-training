import type {
  ExerciseRow,
  TemplateRow,
  TemplateExerciseRow,
  SessionRow,
  ExerciseSetRow,
} from "../pocketbase";

describe("PocketBase type shapes", () => {
  it("ExerciseRow has the correct structure", () => {
    const exercise: ExerciseRow = {
      id: "abc123",
      name: "Bench Press",
      category: "Strength",
      equipment: ["Barbell", "Bench"],
      body_region: "Chest",
      description: "A classic compound movement",
      default_sets: 4,
      default_reps: 8,
      default_rest_seconds: 90,
      is_public: true,
      is_archived: false,
      created_by: null,
      video_url: null,
      created: "2024-01-01T00:00:00Z",
      updated: "2024-01-02T00:00:00Z",
    };

    expect(exercise.id).toBe("abc123");
    expect(exercise.name).toBe("Bench Press");
    expect(exercise.category).toBe("Strength");
    expect(exercise.equipment).toEqual(["Barbell", "Bench"]);
    expect(exercise.body_region).toBe("Chest");
    expect(exercise.description).toBe("A classic compound movement");
    expect(exercise.default_sets).toBe(4);
    expect(exercise.default_reps).toBe(8);
    expect(exercise.default_rest_seconds).toBe(90);
    expect(exercise.is_public).toBe(true);
    expect(exercise.is_archived).toBe(false);
    expect(exercise.created_by).toBeNull();
    expect(exercise.video_url).toBeNull();
    expect(exercise.created).toBe("2024-01-01T00:00:00Z");
    expect(exercise.updated).toBe("2024-01-02T00:00:00Z");
  });

  it("ExerciseRow allows null equipment and nullable fields", () => {
    const exercise: ExerciseRow = {
      id: "def456",
      name: "Bodyweight Squat",
      category: "Calisthenics",
      equipment: null,
      body_region: null,
      description: null,
      default_sets: 3,
      default_reps: 15,
      default_rest_seconds: 60,
      is_public: false,
      is_archived: false,
      created_by: null,
      video_url: null,
      created: "2024-01-01T00:00:00Z",
      updated: "2024-01-02T00:00:00Z",
    };

    expect(exercise.equipment).toBeNull();
    expect(exercise.body_region).toBeNull();
    expect(exercise.description).toBeNull();
  });

  it("TemplateRow structure is correct", () => {
    const template: TemplateRow = {
      id: "tpl-1",
      user_id: "user-1",
      name: "Push Day",
      description: "Chest, shoulders, triceps",
      program_block_id: null,
      is_public: false,
      created: "2024-01-01T00:00:00Z",
      updated: "2024-01-02T00:00:00Z",
    };

    expect(template.id).toBe("tpl-1");
    expect(template.user_id).toBe("user-1");
    expect(template.name).toBe("Push Day");
    expect(template.description).toBe("Chest, shoulders, triceps");
    expect(template.is_public).toBe(false);
  });

  it("TemplateExerciseRow structure is correct", () => {
    const te: TemplateExerciseRow = {
      id: "te-1",
      workout_template_id: "tpl-1",
      exercise_id: "ex-1",
      sort_order: 1,
      target_sets: 3,
      target_reps: 10,
      target_rpe_low: 7,
      target_rpe_high: 9,
      rest_seconds: 90,
      notes: "Focus on form",
    };

    expect(te.id).toBe("te-1");
    expect(te.workout_template_id).toBe("tpl-1");
    expect(te.sort_order).toBe(1);
    expect(te.target_rpe_low).toBe(7);
    expect(te.target_rpe_high).toBe(9);
  });

  it("TemplateExerciseRow allows null RPE values", () => {
    const te: TemplateExerciseRow = {
      id: "te-2",
      workout_template_id: "tpl-1",
      exercise_id: "ex-2",
      sort_order: 2,
      target_sets: 4,
      target_reps: 8,
      target_rpe_low: null,
      target_rpe_high: null,
      rest_seconds: 120,
      notes: null,
    };

    expect(te.target_rpe_low).toBeNull();
    expect(te.target_rpe_high).toBeNull();
    expect(te.notes).toBeNull();
  });

  it("SessionRow structure with in_progress status", () => {
    const session: SessionRow = {
      id: "sess-1",
      user_id: "user-1",
      workout_template_id: "tpl-1",
      program_block_id: null,
      status: "in_progress",
      started_at: "2024-01-01T10:00:00Z",
      completed_at: null,
      duration_minutes: null,
      notes: null,
      created: "2024-01-01T10:00:00Z",
      updated: "2024-01-01T10:00:00Z",
    };

    expect(session.status).toBe("in_progress");
    expect(session.completed_at).toBeNull();
  });

  it("SessionRow structure with completed status", () => {
    const session: SessionRow = {
      id: "sess-2",
      user_id: "user-1",
      workout_template_id: null,
      program_block_id: null,
      status: "completed",
      started_at: "2024-01-01T10:00:00Z",
      completed_at: "2024-01-01T11:30:00Z",
      duration_minutes: 90,
      notes: "Felt strong today",
      created: "2024-01-01T10:00:00Z",
      updated: "2024-01-01T11:30:00Z",
    };

    expect(session.status).toBe("completed");
    expect(session.duration_minutes).toBe(90);
    expect(session.notes).toBe("Felt strong today");
  });

  it("SessionRow allows cancelled status", () => {
    const session: SessionRow = {
      id: "sess-3",
      user_id: "user-1",
      workout_template_id: null,
      program_block_id: null,
      status: "cancelled",
      started_at: "2024-01-01T10:00:00Z",
      completed_at: null,
      duration_minutes: null,
      notes: "Injured",
      created: "2024-01-01T10:00:00Z",
      updated: "2024-01-01T10:05:00Z",
    };
    expect(session.status).toBe("cancelled");
  });

  it("ExerciseSetRow structure is correct", () => {
    const set: ExerciseSetRow = {
      id: "set-1",
      workout_session_id: "sess-1",
      exercise_id: "ex-1",
      set_number: 1,
      weight_kg: 80,
      reps: 10,
      rpe: 8,
      rir: null,
      is_warmup: false,
      logged_at: "2024-01-01T10:05:00Z",
      created: "2024-01-01T10:05:00Z",
      updated: "2024-01-01T10:05:00Z",
    };

    expect(set.set_number).toBe(1);
    expect(set.weight_kg).toBe(80);
    expect(set.rpe).toBe(8);
    expect(set.rir).toBeNull();
    expect(set.is_warmup).toBe(false);
  });

  it("ExerciseSetRow allows warmup sets and all nullable fields", () => {
    const set: ExerciseSetRow = {
      id: "set-2",
      workout_session_id: "sess-1",
      exercise_id: "ex-2",
      set_number: 1,
      weight_kg: 20,
      reps: 5,
      rpe: null,
      rir: 2,
      is_warmup: true,
      logged_at: "2024-01-01T10:00:00Z",
      created: "2024-01-01T10:00:00Z",
      updated: "2024-01-01T10:00:00Z",
    };

    expect(set.rpe).toBeNull();
    expect(set.rir).toBe(2);
    expect(set.is_warmup).toBe(true);
  });
});
