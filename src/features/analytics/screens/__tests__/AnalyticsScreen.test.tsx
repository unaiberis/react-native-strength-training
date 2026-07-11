import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Tabs: () => null,
}));

const mockUseAnalytics = jest.fn();
jest.mock("@/features/analytics/hooks/useAnalytics", () => ({
  useAnalytics: (...args: any[]) => mockUseAnalytics(...args),
  type: { AnalyticsPeriod: {} },
}));

const mockUsePersonalRecords = jest.fn();
jest.mock("@/features/records/hooks/usePersonalRecords", () => ({
  usePersonalRecords: (...args: any[]) => mockUsePersonalRecords(...args),
  getPRTypeLabel: (prType: string) => {
    const map: Record<string, string> = {
      one_rep_max: "1RM",
      estimated_one_rep_max: "Estimated 1RM",
      best_volume_set: "Best Volume Set",
    };
    return map[prType] ?? prType;
  },
  formatPRValue: (pr: any) => `${pr.value} ${pr.pr_type}`,
}));

import { AnalyticsScreen } from "../AnalyticsScreen";

function analyticsWithData() {
  return {
    volumeByPeriod: [{ period: "2026-W01", volume: 1000, sessionCount: 2 }],
    exercises: [{ id: "ex-1", name: "Bench Press" }],
    isLoading: false,
    isRefetching: false,
    error: null,
    refetch: jest.fn(),
  };
}

function recordsFor(exerciseId: string, exerciseName: string) {
  return [
    {
      id: `${exerciseId}-1rm`,
      exercise_id: exerciseId,
      exerciseName,
      pr_type: "one_rep_max",
      value: 100,
      weight_kg: 100,
      reps: 1,
      achieved_at: "2026-07-01T10:00:00Z",
    },
  ];
}

describe("AnalyticsScreen Personal Records section", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockUseAnalytics.mockReturnValue(analyticsWithData());
  });

  it("renders the Personal Records section with grouped PRs (RED 2.1)", () => {
    mockUsePersonalRecords.mockReturnValue({
      groupedByExercise: [
        {
          exerciseId: "ex-1",
          exerciseName: "Bench Press",
          records: recordsFor("ex-1", "Bench Press"),
        },
      ],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      totalPRs: 1,
    });

    render(<AnalyticsScreen />);

    expect(screen.getByText("Personal Records")).toBeTruthy();
    // Expand the PR group to reveal the per-PR value (unique to the PR section)
    fireEvent.press(screen.getByLabelText(/Bench Press.*Tap to expand/));
    expect(screen.getByText("100 one_rep_max")).toBeTruthy();
  });

  it("renders the empty PR state inside Analytics when there are no PRs (RED 2.1)", () => {
    mockUsePersonalRecords.mockReturnValue({
      groupedByExercise: [],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      totalPRs: 0,
    });

    render(<AnalyticsScreen />);

    expect(screen.getByText("Personal Records")).toBeTruthy();
    expect(screen.getByText("No records yet")).toBeTruthy();
  });

  it("renders Personal Records even when the chart has no analytics data (RED 2.1)", () => {
    mockUseAnalytics.mockReturnValue({
      volumeByPeriod: [],
      exercises: [],
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePersonalRecords.mockReturnValue({
      groupedByExercise: [
        {
          exerciseId: "ex-2",
          exerciseName: "Squat",
          records: recordsFor("ex-2", "Squat"),
        },
      ],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      totalPRs: 1,
    });

    render(<AnalyticsScreen />);

    expect(screen.getByText("No Analytics Data")).toBeTruthy();
    // PR section still present regardless of chart data
    expect(screen.getByText("Personal Records")).toBeTruthy();
    expect(screen.getByText("Squat")).toBeTruthy();
  });

  it("navigates to /(tabs)/train from the empty PR CTA (RED 2.1)", () => {
    mockUsePersonalRecords.mockReturnValue({
      groupedByExercise: [],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      totalPRs: 0,
    });

    render(<AnalyticsScreen />);
    fireEvent.press(screen.getByText("Start a Workout"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/train");
  });
});
