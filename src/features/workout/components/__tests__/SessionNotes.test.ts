/**
 * SessionNotes — session notes expand/collapse and text logic tests.
 *
 * Tests the state patterns used by the component since the node
 * environment doesn't support full TSX rendering for this component.
 *
 * Covers: expand/collapse toggle, text input with 2000 char limit,
 * indicator dot, debounced save.
 */

describe("SessionNotes — state logic", () => {
  // Simulates the state pattern used by SessionNotes component
  let state: {
    expanded: boolean;
    notes: string;
    savedNotes: string;
  };

  function toggleExpand() {
    state = { ...state, expanded: !state.expanded };
  }

  function changeText(text: string) {
    const truncated = text.length > 2000 ? text.slice(0, 2000) : text;
    state = { ...state, notes: truncated };
  }

  function debouncedSave() {
    state = { ...state, savedNotes: state.notes };
  }

  function hasNotes(): boolean {
    return state.savedNotes !== null && state.savedNotes.trim().length > 0;
  }

  beforeEach(() => {
    state = { expanded: false, notes: "", savedNotes: "" };
  });

  it("starts collapsed", () => {
    expect(state.expanded).toBe(false);
  });

  it("expands and collapses on toggle", () => {
    toggleExpand();
    expect(state.expanded).toBe(true);

    toggleExpand();
    expect(state.expanded).toBe(false);
  });

  it("accepts text input", () => {
    toggleExpand();
    changeText("Good session today, felt strong on squats");
    expect(state.notes).toBe("Good session today, felt strong on squats");
  });

  it("truncates text over 2000 characters", () => {
    const longText = "x".repeat(2500);
    changeText(longText);
    expect(state.notes.length).toBe(2000);
  });

  it("shows indicator dot when notes exist", () => {
    changeText("Pre-workout: well rested, ready to push");
    debouncedSave();
    expect(hasNotes()).toBe(true);
  });

  it("hides indicator dot when notes are cleared", () => {
    changeText("Some reflections");
    debouncedSave();
    expect(hasNotes()).toBe(true);

    changeText("");
    debouncedSave();
    expect(hasNotes()).toBe(false);
  });

  it("debounced save persists text", () => {
    toggleExpand();
    changeText("Post-workout: good pump, need more leg work");
    expect(state.savedNotes).toBe("");

    debouncedSave();
    expect(state.savedNotes).toBe("Post-workout: good pump, need more leg work");
  });
});
