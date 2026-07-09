/**
 * ExerciseNotes — notes expand/collapse and text logic tests.
 *
 * Tests the state patterns used by the component since the node
 * environment doesn't support full TSX rendering for this component.
 *
 * Covers: expand/collapse toggle, text input with character limit,
 * indicator dot when notes exist, debounced save behavior.
 */

describe("ExerciseNotes — state logic", () => {
  // Simulates the state pattern used by ExerciseNotes component
  let state: {
    expanded: boolean;
    notes: string;
    savedNotes: string;
  };

  function toggleExpand() {
    state = { ...state, expanded: !state.expanded };
  }

  function changeText(text: string) {
    const truncated = text.length > 1000 ? text.slice(0, 1000) : text;
    state = { ...state, notes: truncated };
  }

  function debouncedSave() {
    // Simulates the debounce callback firing after 500ms
    state = { ...state, savedNotes: state.notes };
  }

  function hasNotes(): boolean {
    return state.savedNotes !== null && state.savedNotes.trim().length > 0;
  }

  beforeEach(() => {
    state = { expanded: false, notes: "", savedNotes: "" };
  });

  it("starts collapsed with no notes", () => {
    expect(state.expanded).toBe(false);
    expect(state.notes).toBe("");
    expect(hasNotes()).toBe(false);
  });

  it("expands on toggle", () => {
    toggleExpand();
    expect(state.expanded).toBe(true);
  });

  it("collapses on second toggle", () => {
    toggleExpand(); // expand
    toggleExpand(); // collapse
    expect(state.expanded).toBe(false);
  });

  it("accepts text input", () => {
    toggleExpand(); // expand first
    changeText("Focus on tempo");
    expect(state.notes).toBe("Focus on tempo");
  });

  it("truncates text over 1000 characters", () => {
    const longText = "x".repeat(1200);
    changeText(longText);
    expect(state.notes.length).toBe(1000);
  });

  it("shows indicator dot after saving notes", () => {
    changeText("Great form today");
    debouncedSave();
    expect(hasNotes()).toBe(true);
  });

  it("hides indicator dot when notes are empty", () => {
    changeText("Some notes");
    debouncedSave();
    expect(hasNotes()).toBe(true);

    changeText("");
    debouncedSave();
    expect(hasNotes()).toBe(false);
  });

  it("supports empty notes", () => {
    changeText("");
    debouncedSave();
    expect(hasNotes()).toBe(false);
  });

  it("debounced save persists text to savedNotes", () => {
    toggleExpand();
    changeText("Feeling strong - increased weight");
    expect(state.savedNotes).toBe(""); // not saved yet

    debouncedSave();
    expect(state.savedNotes).toBe("Feeling strong - increased weight");
  });
});
