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

const mockUsePersonalRecords = jest.fn();
const mockUsePRTimeline = jest.fn();

jest.mock("@/features/records/hooks/usePersonalRecords", () => ({
  usePersonalRecords: (...args: any[]) => mockUsePersonalRecords(...args),
  usePRTimeline: (...args: any[]) => mockUsePRTimeline(...args),
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

import { PersonalRecordsSection } from "../PersonalRecordsSection";

function makeGroup(exerciseId: string, exerciseName: string, records: any[]) {
  return { exerciseId, exerciseName, records };
}

function makeRecord(id: string, prType: string, value: number) {
  return {
    id,
    exercise_id: "ex-1",
    exerciseName: "Bench Press",
    pr_type: prType,
    value,
    weight_kg: value,
    reps: 1,
    achieved_at: "2026-07-01T10:00:00Z",
  };
}

describe("PersonalRecordsSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockUsePRTimeline.mockReturnValue({
      chartData: [],
      timeline: [],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
    });
  });

  it("renders the 'Personal Records' header", () => {
    mockUsePersonalRecords.mockReturnValue({
      groupedByExercise: [],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      totalPRs: 0,
    });

    render(<PersonalRecordsSection />);

    expect(screen.getByText("Personal Records")).toBeTruthy();
  });

  it("renders grouped PRs per exercise with type, value and date (RED 1.3)", () => {
    const records = [
      makeRecord("r1", "one_rep_max", 100),
      makeRecord("r2", "best_volume_set", 220),
    ];
    mockUsePersonalRecords.mockReturnValue({
      groupedByExercise: [makeGroup("ex-1", "Bench Press", records)],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      totalPRs: 2,
    });

    render(<PersonalRecordsSection />);

    // Exercise header + count always visible
    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.getByText("2 PRs")).toBeTruthy();

    // Expand the group to reveal the PR cards
    fireEvent.press(screen.getByLabelText(/Bench Press.*Tap to expand/));

    // PR type label + formatted value
    expect(screen.getByText("1RM")).toBeTruthy();
    expect(screen.getByText("100 one_rep_max")).toBeTruthy();
    expect(screen.getByText("Best Volume Set")).toBeTruthy();
    expect(screen.getByText("220 best_volume_set")).toBeTruthy();
  });

  it("renders the empty state with a Start Workout CTA when there are no PRs (RED 1.3)", () => {
    mockUsePersonalRecords.mockReturnValue({
      groupedByExercise: [],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      totalPRs: 0,
    });

    render(<PersonalRecordsSection />);

    expect(screen.getByText("No records yet")).toBeTruthy();
    const cta = screen.getByText("Start a Workout");
    expect(cta).toBeTruthy();
    fireEvent.press(cta);
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/train");
  });

  it("shows a loading spinner while PRs are loading (RED 1.3)", () => {
    mockUsePersonalRecords.mockReturnValue({
      groupedByExercise: [],
      isLoading: true,
      isRefetching: false,
      refetch: jest.fn(),
      totalPRs: 0,
    });

    const { UNSAFE_getByType } = render(<PersonalRecordsSection />);
    const { ActivityIndicator } = require("react-native");
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    // Header still renders, but no grouped records and no empty CTA yet
    expect(screen.getByText("Personal Records")).toBeTruthy();
    expect(screen.queryByText("No records yet")).toBeNull();
  });

  it("toggles an exercise group expanded/collapsed (RED 1.3)", () => {
    const records = [makeRecord("r1", "one_rep_max", 100)];
    mockUsePersonalRecords.mockReturnValue({
      groupedByExercise: [makeGroup("ex-1", "Bench Press", records)],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      totalPRs: 1,
    });

    render(<PersonalRecordsSection />);

    // Collapsed by default → PR card value hidden
    expect(screen.queryByText("100 one_rep_max")).toBeNull();

    const toggle = screen.getByLabelText(/Bench Press.*Tap to expand/);
    fireEvent.press(toggle);

    expect(screen.getByText("100 one_rep_max")).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/Bench Press.*Tap to collapse/));
    expect(screen.queryByText("100 one_rep_max")).toBeNull();
  });

  // ─── Progress chart tests ──────────────────────────────────────────────

  it("shows progress chart when exercise is expanded with timeline data", () => {
    const records = [makeRecord("r1", "one_rep_max", 100)];
    mockUsePersonalRecords.mockReturnValue({
      groupedByExercise: [makeGroup("ex-1", "Bench Press", records)],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      totalPRs: 1,
    });

    mockUsePRTimeline.mockReturnValue({
      chartData: [
        { date: "2026-06-01", value: 90 },
        { date: "2026-06-15", value: 95 },
        { date: "2026-07-01", value: 100 },
      ],
      timeline: [],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
    });

    render(<PersonalRecordsSection />);

    // Collapsed by default
    expect(screen.queryByText("Progress")).toBeNull();

    // Expand
    const toggle = screen.getByLabelText(/Bench Press.*Tap to expand/);
    fireEvent.press(toggle);

    // Progress heading should render
    expect(screen.getByText("Progress")).toBeTruthy();
    // Chart Y-axis labels for data range 90-100
    expect(screen.getByText("90")).toBeTruthy();
    expect(screen.getByText("100")).toBeTruthy();
  });

  it("does not show progress chart when there is only one data point", () => {
    const records = [makeRecord("r1", "one_rep_max", 100)];
    mockUsePersonalRecords.mockReturnValue({
      groupedByExercise: [makeGroup("ex-1", "Bench Press", records)],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      totalPRs: 1,
    });

    mockUsePRTimeline.mockReturnValue({
      chartData: [{ date: "2026-07-01", value: 100 }],
      timeline: [],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
    });

    render(<PersonalRecordsSection />);

    const toggle = screen.getByLabelText(/Bench Press.*Tap to expand/);
    fireEvent.press(toggle);

    // Progress section should NOT render with only 1 data point
    expect(screen.queryByText("Progress")).toBeNull();
  });

  it("shows loading indicator in progress section while timeline loads", () => {
    const records = [makeRecord("r1", "one_rep_max", 100)];
    mockUsePersonalRecords.mockReturnValue({
      groupedByExercise: [makeGroup("ex-1", "Bench Press", records)],
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      totalPRs: 1,
    });

    mockUsePRTimeline.mockReturnValue({
      chartData: [
        { date: "2026-06-01", value: 90 },
        { date: "2026-06-15", value: 95 },
        { date: "2026-07-01", value: 100 },
      ],
      timeline: [],
      isLoading: true,
      isRefetching: false,
      refetch: jest.fn(),
    });

    render(<PersonalRecordsSection />);

    const toggle = screen.getByLabelText(/Bench Press.*Tap to expand/);
    fireEvent.press(toggle);

    expect(screen.getByText("Progress")).toBeTruthy();
    // Should show ActivityIndicator during loading
    const { ActivityIndicator } = require("react-native");
    const indicators = screen.UNSAFE_getAllByType(ActivityIndicator);
    // There should be at least 2 indicators (one from PR loading if applicable, one from timeline)
    expect(indicators.length).toBeGreaterThanOrEqual(1);
  });
});
