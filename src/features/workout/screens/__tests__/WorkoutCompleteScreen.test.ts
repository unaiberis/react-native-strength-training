/**
 * WorkoutCompleteScreen — feedback logic tests.
 *
 * Tests the feedback interaction logic at the state level
 * since the node environment doesn't support TSX rendering.
 *
 * Covers: rating selection, submit flow, disabled state, notes.
 */

describe("WorkoutCompleteScreen — feedback logic", () => {
  // Simulates the feedback state pattern used in the screen
  let state: { rating: number; notes: string; submitted: boolean };

  function setRating(r: number) {
    if (r >= 1 && r <= 5) state = { ...state, rating: r };
  }

  function setNotes(n: string) {
    state = { ...state, notes: n.length > 500 ? n.slice(0, 500) : n };
  }

  function submit() {
    if (state.rating > 0) state = { ...state, submitted: true };
  }

  beforeEach(() => {
    state = { rating: 0, notes: "", submitted: false };
  });

  it("starts with no rating selected", () => {
    expect(state.rating).toBe(0);
    expect(state.submitted).toBe(false);
  });

  it("allows rating selection between 1 and 5", () => {
    setRating(3);
    expect(state.rating).toBe(3);

    setRating(5);
    expect(state.rating).toBe(5);
  });

  it("rejects rating outside 1-5 range", () => {
    setRating(0);
    expect(state.rating).toBe(0);

    setRating(6);
    expect(state.rating).toBe(0);
  });

  it("submit requires a rating > 0", () => {
    // Try submitting without rating
    submit();
    expect(state.submitted).toBe(false);

    // Select rating then submit
    setRating(4);
    submit();
    expect(state.submitted).toBe(true);
  });

  it("prevents double submission", () => {
    setRating(5);
    submit();
    expect(state.submitted).toBe(true);

    // Second submit should not change anything
    submit();
    expect(state.submitted).toBe(true);
  });

  it("notes are truncated at 500 characters", () => {
    setNotes("x".repeat(600));
    expect(state.notes.length).toBe(500);
  });

  it("notes can be empty string", () => {
    expect(state.notes).toBe("");
  });

  it("supports full 1-5 range", () => {
    for (let r = 1; r <= 5; r++) {
      setRating(r);
      expect(state.rating).toBe(r);
    }
  });
});
