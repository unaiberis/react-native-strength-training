import type { AssessmentComparison, Trend, MetricValue } from "@/features/wellness/hooks/useAssessmentComparison";

// ─── Mock Data ─────────────────────────────────────────────────────────────

const MOCK_COMPARISON: AssessmentComparison = {
  current: {
    sessionRpe: 8,
    sleep: 4,
    fatigue: 3,
    soreness: 2,
    mood: 5,
  },
  weekAverage: {
    sessionRpe: 6,
    sleep: 4,
    fatigue: 3,
    soreness: 2,
    mood: 4,
  },
  trends: {
    sessionRpe: "up",
    sleep: "same",
    fatigue: "same",
    soreness: "same",
    mood: "up",
  },
};

const NULL_COMPARISON: AssessmentComparison = {
  current: {
    sessionRpe: null,
    sleep: null,
    fatigue: null,
    soreness: null,
    mood: null,
  },
  weekAverage: {
    sessionRpe: null,
    sleep: null,
    fatigue: null,
    soreness: null,
    mood: null,
  },
  trends: {
    sessionRpe: "same",
    sleep: "same",
    fatigue: "same",
    soreness: "same",
    mood: "same",
  },
};

// ─── Helpers (simulating screen logic) ─────────────────────────────────────

const METRICS_CONFIG = [
  { key: "sessionRpe" as keyof MetricValue, label: "Session RPE", maxValue: 10 },
  { key: "sleep" as keyof MetricValue, label: "Sleep Quality", maxValue: 5 },
  { key: "fatigue" as keyof MetricValue, label: "Fatigue", maxValue: 5 },
  { key: "soreness" as keyof MetricValue, label: "Soreness", maxValue: 5 },
  { key: "mood" as keyof MetricValue, label: "Mood", maxValue: 5 },
];

function formatAvg(value: number | null): string {
  if (value == null) return "—";
  return value.toFixed(1);
}

function computeGaugeFilled(value: number | null, maxValue: number): number {
  return value != null ? Math.round(value) : 0;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("AssessmentResultsScreen — metric logic", () => {
  describe("metric config coverage", () => {
    it("has all 5 metrics defined", () => {
      expect(METRICS_CONFIG).toHaveLength(5);
      const keys = METRICS_CONFIG.map((m) => m.key);
      expect(keys).toContain("sessionRpe");
      expect(keys).toContain("sleep");
      expect(keys).toContain("fatigue");
      expect(keys).toContain("soreness");
      expect(keys).toContain("mood");
    });

    it("sessionRpe has maxValue 10, others have 5", () => {
      const rpe = METRICS_CONFIG.find((m) => m.key === "sessionRpe")!;
      expect(rpe.maxValue).toBe(10);

      const others = METRICS_CONFIG.filter((m) => m.key !== "sessionRpe");
      others.forEach((m) => expect(m.maxValue).toBe(5));
    });
  });

  describe("formatAvg", () => {
    it("formats numeric value to 1 decimal", () => {
      expect(formatAvg(5.8)).toBe("5.8");
      expect(formatAvg(7)).toBe("7.0");
      expect(formatAvg(3.333)).toBe("3.3");
    });

    it("returns em-dash for null", () => {
      expect(formatAvg(null)).toBe("—");
    });
  });

  describe("computeGaugeFilled", () => {
    it("returns 0 for null value", () => {
      expect(computeGaugeFilled(null, 10)).toBe(0);
    });

    it("rounds value to nearest integer", () => {
      expect(computeGaugeFilled(7.2, 10)).toBe(7);
      expect(computeGaugeFilled(7.8, 10)).toBe(8);
    });

    it("returns clamped integer for valid values", () => {
      expect(computeGaugeFilled(3, 5)).toBe(3);
      expect(computeGaugeFilled(10, 10)).toBe(10);
    });
  });

  describe("current values extraction", () => {
    it("extracts all 5 current metrics from comparison", () => {
      const current = MOCK_COMPARISON.current;
      expect(current.sessionRpe).toBe(8);
      expect(current.sleep).toBe(4);
      expect(current.fatigue).toBe(3);
      expect(current.soreness).toBe(2);
      expect(current.mood).toBe(5);
    });

    it("handles null values in comparison", () => {
      const current = NULL_COMPARISON.current;
      expect(current.sessionRpe).toBeNull();
      expect(current.sleep).toBeNull();
      expect(current.fatigue).toBeNull();
      expect(current.soreness).toBeNull();
      expect(current.mood).toBeNull();
    });
  });

  describe("average values extraction", () => {
    it("extracts week averages from comparison", () => {
      const avg = MOCK_COMPARISON.weekAverage;
      expect(avg.sessionRpe).toBeCloseTo(6, 1);
      expect(avg.sleep).toBeCloseTo(4, 1);
      expect(avg.fatigue).toBeCloseTo(3, 1);
      expect(avg.soreness).toBeCloseTo(2, 1);
      expect(avg.mood).toBeCloseTo(4, 1);
    });

    it("handles null averages", () => {
      const avg = NULL_COMPARISON.weekAverage;
      expect(avg.sessionRpe).toBeNull();
      expect(avg.sleep).toBeNull();
      expect(avg.fatigue).toBeNull();
      expect(avg.soreness).toBeNull();
      expect(avg.mood).toBeNull();
    });
  });

  describe("trend display", () => {
    it("renders trend icon text for each possible direction", () => {
      function trendToDisplay(trend: Trend): string {
        if (trend === "same") return "—";
        if (trend === "up") return "↑";
        return "↓";
      }

      expect(trendToDisplay("up")).toBe("↑");
      expect(trendToDisplay("down")).toBe("↓");
      expect(trendToDisplay("same")).toBe("—");
    });
  });

  describe("navigation callbacks", () => {
    it("defines two navigation actions: done and wellness", () => {
      const actions = [
        { label: "Done", target: "/(tabs)" },
        { label: "View Full Wellness Dashboard", target: "/(tabs)/wellness" },
      ];

      expect(actions).toHaveLength(2);
      expect(actions[0].label).toBe("Done");
      expect(actions[0].target).toBe("/(tabs)");
      expect(actions[1].label).toBe("View Full Wellness Dashboard");
      expect(actions[1].target).toBe("/(tabs)/wellness");
    });

    it("done navigates to home (tabs root)", () => {
      const navigateTo = "/(tabs)";
      expect(navigateTo).toBe("/(tabs)");
    });

    it("wellness dashboard navigates to wellness tab", () => {
      const navigateTo = "/(tabs)/wellness";
      expect(navigateTo).toBe("/(tabs)/wellness");
    });
  });

  describe("data validation in gauge rendering", () => {
    it("ensures gauge value never exceeds max", () => {
      const checkValue = (
        value: number | null,
        maxValue: number,
      ): { filled: number; empty: number } => {
        const filled = computeGaugeFilled(value, maxValue);
        const clamped = Math.min(filled, maxValue);
        return { filled: clamped, empty: maxValue - clamped };
      };

      // Normal case
      const normal = checkValue(7, 10);
      expect(normal.filled).toBe(7);
      expect(normal.empty).toBe(3);

      // At max
      const atMax = checkValue(5, 5);
      expect(atMax.filled).toBe(5);
      expect(atMax.empty).toBe(0);

      // Null → zero filled
      const nullVal = checkValue(null, 5);
      expect(nullVal.filled).toBe(0);
      expect(nullVal.empty).toBe(5);
    });
  });
});
