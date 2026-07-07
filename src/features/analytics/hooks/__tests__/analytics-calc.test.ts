import {
  calcVolumeByPeriod,
  buildPRTimeline,
  calcConsistency,
} from "../analytics-calc";

// ─── calcVolumeByPeriod ───────────────────────────────────────────────────

describe("calcVolumeByPeriod", () => {
  it("empty sessions returns empty array", () => {
    expect(calcVolumeByPeriod([], "weekly")).toEqual([]);
    expect(calcVolumeByPeriod([], "monthly")).toEqual([]);
  });

  it("sums volume (weight × reps) per session", () => {
    const sessions = [
      {
        id: "s1",
        completed_at: "2026-07-07T10:00:00Z",
        sets: [
          { weight: 100, reps: 5 },
          { weight: 100, reps: 5 },
        ],
      },
    ];
    const result = calcVolumeByPeriod(sessions, "weekly");
    expect(result).toHaveLength(1);
    // Volume = 100×5 + 100×5 = 1000
    expect(result[0].volume).toBe(1000);
    expect(result[0].sessionCount).toBe(1);
  });

  it("groups sessions by week", () => {
    const sessions = [
      {
        id: "s1",
        completed_at: "2026-07-01T10:00:00Z", // Week 27
        sets: [{ weight: 100, reps: 5 }],
      },
      {
        id: "s2",
        completed_at: "2026-07-02T10:00:00Z", // Week 27
        sets: [{ weight: 80, reps: 8 }],
      },
    ];
    const result = calcVolumeByPeriod(sessions, "weekly");
    expect(result).toHaveLength(1);
    expect(result[0].period).toBe("2026-W27");
    expect(result[0].volume).toBe(100 * 5 + 80 * 8); // 500 + 640 = 1140
    expect(result[0].sessionCount).toBe(2);
  });

  it("groups sessions by month", () => {
    const sessions = [
      {
        id: "s1",
        completed_at: "2026-07-01T10:00:00Z",
        sets: [{ weight: 100, reps: 5 }],
      },
      {
        id: "s2",
        completed_at: "2026-06-15T10:00:00Z",
        sets: [{ weight: 80, reps: 8 }],
      },
    ];
    const result = calcVolumeByPeriod(sessions, "monthly");
    expect(result).toHaveLength(2);
    expect(result[0].period).toBe("2026-06");
    expect(result[1].period).toBe("2026-07");
  });

  it("returns periods sorted chronologically", () => {
    const sessions = [
      {
        id: "s2",
        completed_at: "2026-08-01T10:00:00Z",
        sets: [{ weight: 100, reps: 5 }],
      },
      {
        id: "s1",
        completed_at: "2026-07-01T10:00:00Z",
        sets: [{ weight: 80, reps: 8 }],
      },
    ];
    const result = calcVolumeByPeriod(sessions, "monthly");
    expect(result[0].period).toBe("2026-07");
    expect(result[1].period).toBe("2026-08");
  });
});

// ─── buildPRTimeline ──────────────────────────────────────────────────────

describe("buildPRTimeline", () => {
  it("empty sets returns empty array", () => {
    expect(buildPRTimeline([])).toEqual([]);
  });

  it("single set returns single entry", () => {
    const sets = [
      { weight: 100, reps: 5, created_at: "2026-07-07T10:00:00Z" },
    ];
    const result = buildPRTimeline(sets);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-07-07");
    expect(result[0].estimatedOneRm).toBeCloseTo(100 * (1 + 5 / 30), 1);
    expect(result[0].weight).toBe(100);
    expect(result[0].reps).toBe(5);
  });

  it("returns chronological entries", () => {
    const sets = [
      { weight: 100, reps: 5, created_at: "2026-07-07T10:00:00Z" },
      { weight: 80, reps: 8, created_at: "2026-06-15T10:00:00Z" },
    ];
    const result = buildPRTimeline(sets);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-06-15");
    expect(result[1].date).toBe("2026-07-07");
  });

  it("calculates Epley e1RM correctly", () => {
    const sets = [
      { weight: 200, reps: 1, created_at: "2026-07-07T10:00:00Z" },
    ];
    const result = buildPRTimeline(sets);
    // 200 × (1 + 1/30) = 206.67
    expect(result[0].estimatedOneRm).toBeCloseTo(206.67, 1);
  });

  it("filters out sets with zero reps", () => {
    const sets = [
      { weight: 100, reps: 0, created_at: "2026-07-07T10:00:00Z" },
      { weight: 80, reps: 8, created_at: "2026-07-08T10:00:00Z" },
    ];
    const result = buildPRTimeline(sets);
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBe(80);
  });

  it("filters out sets with zero weight", () => {
    const sets = [
      { weight: 0, reps: 5, created_at: "2026-07-07T10:00:00Z" },
    ];
    const result = buildPRTimeline(sets);
    expect(result).toEqual([]);
  });
});

// ─── calcConsistency ──────────────────────────────────────────────────────

describe("calcConsistency", () => {
  it("returns ratio 0 for weeks with no sessions", () => {
    const result = calcConsistency([], 1);
    expect(result).toHaveLength(1);
    expect(result[0].sessionsCompleted).toBe(0);
    expect(result[0].ratio).toBe(0);
  });

  it("returns ratio 1 when sessions match target", () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1);

    const sessions = [
      { completed_at: weekStart.toISOString() },
      { completed_at: new Date(weekStart.getTime() + 86400000).toISOString() },
      { completed_at: new Date(weekStart.getTime() + 2 * 86400000).toISOString() },
    ];

    const result = calcConsistency(sessions, 1);
    expect(result).toHaveLength(1);
    expect(result[0].sessionsCompleted).toBe(3);
    expect(result[0].ratio).toBe(1);
  });

  it("returns ratio between 0 and 1", () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1);

    const sessions = [
      { completed_at: weekStart.toISOString() },
    ];

    const result = calcConsistency(sessions, 1);
    expect(result).toHaveLength(1);
    expect(result[0].sessionsCompleted).toBe(1);
    expect(result[0].targetSessions).toBe(3);
    expect(result[0].ratio).toBeCloseTo(1 / 3, 2);
  });

  it("caps ratio at 1.0", () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1);

    const sessions = [
      { completed_at: weekStart.toISOString() },
      { completed_at: new Date(weekStart.getTime() + 86400000).toISOString() },
      { completed_at: new Date(weekStart.getTime() + 2 * 86400000).toISOString() },
      { completed_at: new Date(weekStart.getTime() + 3 * 86400000).toISOString() },
      { completed_at: new Date(weekStart.getTime() + 4 * 86400000).toISOString() },
    ];

    const result = calcConsistency(sessions, 1);
    expect(result[0].sessionsCompleted).toBe(5);
    expect(result[0].ratio).toBe(1);
  });

  it("returns specified number of weeks", () => {
    const result = calcConsistency([], 4);
    expect(result).toHaveLength(4);
  });
});
