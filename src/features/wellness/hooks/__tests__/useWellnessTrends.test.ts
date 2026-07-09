import { computeWellnessTrends, type WellnessRow } from "../useWellnessTrends";

describe("computeWellnessTrends", () => {
  // Fixed reference date so tests are deterministic regardless of when they run
  const REFERENCE_DATE = new Date("2026-07-05T12:00:00Z");

  const baseEntries: WellnessRow[] = [
    {
      id: "1",
      user_id: "user-1",
      date: "2026-07-01",
      session_rpe: 7,
      sleep: 4,
      fatigue: 3,
      soreness: 2,
      mood: 5,
      session_id: null,
      created_at: "2026-07-01T10:00:00Z",
    },
    {
      id: "2",
      user_id: "user-1",
      date: "2026-07-02",
      session_rpe: 8,
      sleep: 3,
      fatigue: 4,
      soreness: 3,
      mood: 4,
      session_id: "s1",
      created_at: "2026-07-02T10:00:00Z",
    },
    {
      id: "3",
      user_id: "user-1",
      date: "2026-07-03",
      session_rpe: 6,
      sleep: 5,
      fatigue: 2,
      soreness: 1,
      mood: 5,
      session_id: null,
      created_at: "2026-07-03T10:00:00Z",
    },
  ];

  it("returns three period buckets", () => {
    const result = computeWellnessTrends(baseEntries, REFERENCE_DATE);
    expect(result.periods).toHaveLength(3);
    expect(result.periods.map((p) => p.period)).toEqual(["7d", "30d", "90d"]);
  });

  it("computes correct averages for 7d period with recent data", () => {
    const result = computeWellnessTrends(baseEntries, REFERENCE_DATE);
    const sevenDay = result.periods.find((p) => p.period === "7d")!;
    // Avg RPE: (7 + 8 + 6) / 3 = 7
    expect(sevenDay.avgSessionRpe).toBeCloseTo(7, 1);
    // Avg sleep: (4 + 3 + 5) / 3 = 4
    expect(sevenDay.avgSleep).toBeCloseTo(4, 1);
    // Avg fatigue: (3 + 4 + 2) / 3 = 3
    expect(sevenDay.avgFatigue).toBeCloseTo(3, 1);
    // Avg soreness: (2 + 3 + 1) / 3 = 2
    expect(sevenDay.avgSoreness).toBeCloseTo(2, 1);
    // Avg mood: (5 + 4 + 5) / 3 ≈ 4.67
    expect(sevenDay.avgMood).toBeCloseTo(4.67, 1);
    expect(sevenDay.entryCount).toBe(3);
  });

  it("returns null averages for empty entries", () => {
    const result = computeWellnessTrends([], REFERENCE_DATE);
    result.periods.forEach((period) => {
      expect(period.avgSessionRpe).toBeNull();
      expect(period.avgSleep).toBeNull();
      expect(period.avgFatigue).toBeNull();
      expect(period.avgSoreness).toBeNull();
      expect(period.avgMood).toBeNull();
      expect(period.entryCount).toBe(0);
    });
  });

  it("builds time series sorted by date", () => {
    const result = computeWellnessTrends(baseEntries, REFERENCE_DATE);
    expect(result.timeSeries).toHaveLength(3);
    expect(result.timeSeries[0].date).toBe("2026-07-01");
    expect(result.timeSeries[1].date).toBe("2026-07-02");
    expect(result.timeSeries[2].date).toBe("2026-07-03");
    expect(result.timeSeries[0].sessionRpe).toBe(7);
    expect(result.timeSeries[1].sleep).toBe(3);
  });

  it("handles entries with null values", () => {
    // Use a reference date close to the entry so it falls within the 7d window
    const refForNullTest = new Date("2026-07-03T12:00:00Z");
    const entriesWithNulls: WellnessRow[] = [
      {
        id: "1",
        user_id: "user-1",
        date: "2026-07-01",
        session_rpe: null,
        sleep: null,
        fatigue: null,
        soreness: null,
        mood: null,
        session_id: null,
        created_at: "2026-07-01T10:00:00Z",
      },
    ];

    const result = computeWellnessTrends(entriesWithNulls, refForNullTest);
    expect(result.timeSeries).toHaveLength(1);
    result.periods.forEach((period) => {
      expect(period.avgSessionRpe).toBeNull();
      expect(period.entryCount).toBe(1);
    });
  });

  it("handles partial null values correctly", () => {
    // Use a reference date close to the entry so it falls within the 7d window
    const refForPartialNull = new Date("2026-07-03T12:00:00Z");
    const partialEntries: WellnessRow[] = [
      {
        id: "1",
        user_id: "user-1",
        date: "2026-07-01",
        session_rpe: 7,
        sleep: null,
        fatigue: 3,
        soreness: null,
        mood: 5,
        session_id: null,
        created_at: "2026-07-01T10:00:00Z",
      },
    ];

    const result = computeWellnessTrends(partialEntries, refForPartialNull);
    const sevenDay = result.periods.find((p) => p.period === "7d")!;
    expect(sevenDay.avgSessionRpe).toBe(7);
    expect(sevenDay.avgSleep).toBeNull(); // all nulls → null
    expect(sevenDay.avgFatigue).toBe(3);
    expect(sevenDay.avgSoreness).toBeNull(); // all nulls → null
    expect(sevenDay.avgMood).toBe(5);
  });

  it("excludes entries outside the 7d window", () => {
    const oldEntry: WellnessRow = {
      id: "old",
      user_id: "user-1",
      date: "2025-01-01", // over a year ago
      session_rpe: 10,
      sleep: 5,
      fatigue: 1,
      soreness: 1,
      mood: 5,
      session_id: null,
      created_at: "2025-01-01T10:00:00Z",
    };

    const result = computeWellnessTrends([...baseEntries, oldEntry], REFERENCE_DATE);
    const sevenDay = result.periods.find((p) => p.period === "7d")!;
    expect(sevenDay.entryCount).toBe(3); // old entry excluded
    expect(sevenDay.avgSessionRpe).toBeCloseTo(7, 1);
  });
});
