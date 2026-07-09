import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAssessmentComparison, type Trend } from "../useAssessmentComparison";

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockGetOne = jest.fn();
const mockGetAllAsync = jest.fn();

jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn(() => ({
      getOne: mockGetOne,
    })),
  },
}));

jest.mock("@/lib/db/database", () => ({
  getDb: jest.fn(() =>
    Promise.resolve({
      getAllAsync: mockGetAllAsync,
    }),
  ),
}));

// ─── Test Data ─────────────────────────────────────────────────────────────

const MOCK_CURRENT_ENTRY = {
  id: "current-1",
  session_rpe: 8,
  sleep: 4,
  fatigue: 3,
  soreness: 2,
  mood: 5,
  date: "2026-07-09",
};

const MOCK_HISTORY_ENTRIES = [
  {
    id: "hist-1",
    session_rpe: 6,
    sleep: 3,
    fatigue: 4,
    soreness: 3,
    mood: 3,
    date: "2026-07-02",
  },
  {
    id: "hist-2",
    session_rpe: 7,
    sleep: 4,
    fatigue: 3,
    soreness: 2,
    mood: 4,
    date: "2026-07-04",
  },
  {
    id: "hist-3",
    session_rpe: 5,
    sleep: 5,
    fatigue: 2,
    soreness: 1,
    mood: 5,
    date: "2026-07-06",
  },
];

// ─── Wrapper ───────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("useAssessmentComparison", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOne.mockResolvedValue(MOCK_CURRENT_ENTRY);
    mockGetAllAsync.mockResolvedValue(MOCK_HISTORY_ENTRIES);
  });

  it("returns null comparison when no entry ID provided", () => {
    const { result } = renderHook(
      () => useAssessmentComparison(null),
      { wrapper: createWrapper() },
    );

    expect(result.current.comparison).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("fetches entry from PocketBase and history from local SQLite", async () => {
    const { result } = renderHook(
      () => useAssessmentComparison("current-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetOne).toHaveBeenCalledWith("current-1");
    expect(mockGetAllAsync).toHaveBeenCalled();
    expect(result.current.comparison).not.toBeNull();
  });

  it("computes correct current values from entry", async () => {
    const { result } = renderHook(
      () => useAssessmentComparison("current-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { current } = result.current.comparison!;
    expect(current.sessionRpe).toBe(8);
    expect(current.sleep).toBe(4);
    expect(current.fatigue).toBe(3);
    expect(current.soreness).toBe(2);
    expect(current.mood).toBe(5);
  });

  it("computes correct 7-day averages excluding current entry", async () => {
    const { result } = renderHook(
      () => useAssessmentComparison("current-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { weekAverage } = result.current.comparison!;
    // Averages of hist-1, hist-2, hist-3:
    // RPE: (6 + 7 + 5) / 3 = 6
    expect(weekAverage.sessionRpe).toBeCloseTo(6, 1);
    // Sleep: (3 + 4 + 5) / 3 = 4
    expect(weekAverage.sleep).toBeCloseTo(4, 1);
    // Fatigue: (4 + 3 + 2) / 3 = 3
    expect(weekAverage.fatigue).toBeCloseTo(3, 1);
    // Soreness: (3 + 2 + 1) / 3 = 2
    expect(weekAverage.soreness).toBeCloseTo(2, 1);
    // Mood: (3 + 4 + 5) / 3 = 4
    expect(weekAverage.mood).toBeCloseTo(4, 1);
  });

  it("excludes current entry from historical averages", async () => {
    // Add the current entry to history to test exclusion
    mockGetAllAsync.mockResolvedValue([
      ...MOCK_HISTORY_ENTRIES,
      MOCK_CURRENT_ENTRY, // same ID as current → should be excluded
    ]);

    const { result } = renderHook(
      () => useAssessmentComparison("current-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { weekAverage } = result.current.comparison!;
    // Should still only average hist-1, hist-2, hist-3:
    expect(weekAverage.sessionRpe).toBeCloseTo(6, 1);
  });

  it("returns null averages when no historical data", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(
      () => useAssessmentComparison("current-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { weekAverage } = result.current.comparison!;
    expect(weekAverage.sessionRpe).toBeNull();
    expect(weekAverage.sleep).toBeNull();
    expect(weekAverage.fatigue).toBeNull();
    expect(weekAverage.soreness).toBeNull();
    expect(weekAverage.mood).toBeNull();
  });

  describe("trend calculation", () => {
    it("returns 'up' when current > average by 0.5+", async () => {
      // Current: 8, Avg: 6 → diff = 2 >= 0.5 → 'up'
      const { result } = renderHook(
        () => useAssessmentComparison("current-1"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.comparison!.trends.sessionRpe).toBe<Trend>("up");
    });

    it("returns 'down' when current < average by 0.5+", async () => {
      // Mood: current=5, avg=4 → diff = 1 >= 0.5 → 'up'
      // We need a metric where current < avg. Let's set current soreness to 1 vs avg 2
      mockGetOne.mockResolvedValue({
        ...MOCK_CURRENT_ENTRY,
        soreness: 1,
      });

      const { result } = renderHook(
        () => useAssessmentComparison("current-1"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Soreness: current=1, avg=2 → diff = -1 <= -0.5 → 'down'
      expect(result.current.comparison!.trends.soreness).toBe<Trend>("down");
    });

    it("returns 'same' when within 0.5 range", async () => {
      // Current sleep: 4, Avg sleep: 4 → diff = 0 < 0.5 → 'same'
      const { result } = renderHook(
        () => useAssessmentComparison("current-1"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.comparison!.trends.sleep).toBe<Trend>("same");
    });

    it("returns 'same' when current or average is null", async () => {
      mockGetOne.mockResolvedValue({
        ...MOCK_CURRENT_ENTRY,
        session_rpe: null,
      });
      mockGetAllAsync.mockResolvedValue([]);

      const { result } = renderHook(
        () => useAssessmentComparison("current-1"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.comparison!.trends.sessionRpe).toBe<Trend>("same");
    });
  });
});
