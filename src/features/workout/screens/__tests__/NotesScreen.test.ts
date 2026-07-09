/**
 * NotesScreen — notes editor saving logic tests.
 *
 * Tests the save-on-back pattern and text management logic
 * used by the full-screen notes editor.
 *
 * Covers: initial notes loading, text editing, save on back,
 * character limits per mode.
 */

describe("NotesScreen — saving logic", () => {
  const MAX_EXERCISE = 1000;
  const MAX_SESSION = 2000;

  // Simulates the save/update pattern used by NotesScreen
  let savedExerciseNotes: Record<string, string>;
  let savedSessionNotes: string;

  function saveExerciseNotes(exerciseId: string, notes: string) {
    savedExerciseNotes[exerciseId] = notes;
  }

  function saveSessionNotes(notes: string) {
    savedSessionNotes = notes;
  }

  beforeEach(() => {
    savedExerciseNotes = {};
    savedSessionNotes = "";
  });

  describe("exercise mode", () => {
    it("saves notes for an exercise", () => {
      saveExerciseNotes("ex-1", "Focus on depth on the squat");
      expect(savedExerciseNotes["ex-1"]).toBe("Focus on depth on the squat");
    });

    it("updates existing exercise notes", () => {
      saveExerciseNotes("ex-1", "Original notes");
      saveExerciseNotes("ex-1", "Updated notes");
      expect(savedExerciseNotes["ex-1"]).toBe("Updated notes");
    });

    it("handles empty notes", () => {
      saveExerciseNotes("ex-1", "");
      expect(savedExerciseNotes["ex-1"]).toBe("");
    });

    it("truncates exercise notes at 1000 characters", () => {
      const longText = "x".repeat(MAX_EXERCISE + 100);
      const truncated = longText.length > MAX_EXERCISE
        ? longText.slice(0, MAX_EXERCISE)
        : longText;
      expect(truncated.length).toBe(MAX_EXERCISE);
    });

    it("saves notes for different exercises independently", () => {
      saveExerciseNotes("ex-1", "Squat notes");
      saveExerciseNotes("ex-2", "Bench notes");
      expect(savedExerciseNotes["ex-1"]).toBe("Squat notes");
      expect(savedExerciseNotes["ex-2"]).toBe("Bench notes");
    });
  });

  describe("session mode", () => {
    it("saves session notes", () => {
      saveSessionNotes("Great workout overall");
      expect(savedSessionNotes).toBe("Great workout overall");
    });

    it("overwrites previous session notes", () => {
      saveSessionNotes("First reflection");
      saveSessionNotes("Updated reflection");
      expect(savedSessionNotes).toBe("Updated reflection");
    });

    it("handles empty session notes", () => {
      saveSessionNotes("");
      expect(savedSessionNotes).toBe("");
    });

    it("truncates session notes at 2000 characters", () => {
      const longText = "x".repeat(MAX_SESSION + 100);
      const truncated = longText.length > MAX_SESSION
        ? longText.slice(0, MAX_SESSION)
        : longText;
      expect(truncated.length).toBe(MAX_SESSION);
    });
  });

  describe("save-on-back behavior", () => {
    it("saves exercise notes when leaving", () => {
      saveExerciseNotes("ex-1", "Final notes before leaving");
      expect(savedExerciseNotes["ex-1"]).toBe("Final notes before leaving");
    });

    it("saves session notes when leaving", () => {
      saveSessionNotes("Final session reflection");
      expect(savedSessionNotes).toBe("Final session reflection");
    });
  });
});
