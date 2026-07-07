import {
  computeProgressionStats,
  computeProgressionSMA,
  type ProgressionDataPoint,
} from "../useProgression";

describe("computeProgressionStats", () => {
  const dataPoints: ProgressionDataPoint[] = [
    { date: "2026-07-01", sessionId: "s1", maxWeight: 100, bestE1RM: 110, totalVolume: 1000, setCount: 3 },
    { date: "2026-07-08", sessionId: "s2", maxWeight: 110, bestE1RM: 120, totalVolume: 1200, setCount: 4 },
    { date: "2026-07-15", sessionId: "s3", maxWeight: 105, bestE1RM: 115, totalVolume: 900, setCount: 3 },
  ];

  it("computes best weight from data points", () => {
    const result = computeProgressionStats(dataPoints);
    expect(result.bestWeight).toBe(110);
  });

  it("computes best e1RM from data points", () => {
    const result = computeProgressionStats(dataPoints);
    expect(result.bestE1RM).toBe(120);
  });

  it("counts sessions correctly", () => {
    const result = computeProgressionStats(dataPoints);
    expect(result.sessionCount).toBe(3);
  });

  it("returns zeros for empty data", () => {
    const result = computeProgressionStats([]);
    expect(result.bestWeight).toBe(0);
    expect(result.bestE1RM).toBe(0);
    expect(result.sessionCount).toBe(0);
  });

  it("handles single data point", () => {
    const single = [dataPoints[0]];
    const result = computeProgressionStats(single);
    expect(result.bestWeight).toBe(100);
    expect(result.bestE1RM).toBe(110);
    expect(result.sessionCount).toBe(1);
  });
});

describe("computeProgressionSMA", () => {
  const dataPoints: ProgressionDataPoint[] = [
    { date: "2026-07-01", sessionId: "s1", maxWeight: 100, bestE1RM: 110, totalVolume: 1000, setCount: 3 },
    { date: "2026-07-08", sessionId: "s2", maxWeight: 110, bestE1RM: 120, totalVolume: 1200, setCount: 4 },
    { date: "2026-07-15", sessionId: "s3", maxWeight: 105, bestE1RM: 115, totalVolume: 900, setCount: 3 },
    { date: "2026-07-22", sessionId: "s4", maxWeight: 120, bestE1RM: 130, totalVolume: 1500, setCount: 5 },
    { date: "2026-07-29", sessionId: "s5", maxWeight: 115, bestE1RM: 125, totalVolume: 1400, setCount: 4 },
  ];

  it("returns null for early points below window size", () => {
    const result = computeProgressionSMA(dataPoints, 3);
    expect(result[0].sma).toBeNull();
    expect(result[1].sma).toBeNull();
  });

  it("computes SMA once enough points exist", () => {
    const result = computeProgressionSMA(dataPoints, 3);
    // SMA at index 2: (100 + 110 + 105) / 3 = 105
    expect(result[2].sma).toBeCloseTo(105, 1);
    // SMA at index 3: (110 + 105 + 120) / 3 ≈ 111.67
    expect(result[3].sma).toBeCloseTo(111.67, 1);
    // SMA at index 4: (105 + 120 + 115) / 3 ≈ 113.33
    expect(result[4].sma).toBeCloseTo(113.33, 1);
  });

  it("preserves original data point fields", () => {
    const result = computeProgressionSMA(dataPoints, 3);
    expect(result[2].date).toBe("2026-07-15");
    expect(result[2].maxWeight).toBe(105);
    expect(result[2].sessionId).toBe("s3");
  });

  it("handles window size of 1", () => {
    const result = computeProgressionSMA(dataPoints, 1);
    // SMA at every point is just the value itself
    result.forEach((point, i) => {
      expect(point.sma).toBeCloseTo(dataPoints[i].maxWeight, 1);
    });
  });

  it("handles empty data", () => {
    const result = computeProgressionSMA([], 3);
    expect(result).toEqual([]);
  });

  it("handles data smaller than window", () => {
    const smallData = dataPoints.slice(0, 2);
    const result = computeProgressionSMA(smallData, 3);
    expect(result).toHaveLength(2);
    expect(result[0].sma).toBeNull();
    expect(result[1].sma).toBeNull();
  });
});
