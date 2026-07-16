import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// ─── Mock useWellnessTrends ──────────────────────────────────────────────────

const mockRefetch = jest.fn();
const mockUseWellnessTrends = jest.fn();

jest.mock("@/features/wellness/hooks/useWellnessTrends", () => ({
  useWellnessTrends: (...args: any[]) => mockUseWellnessTrends(...args),
}));

// Mock LineChart to simplify rendering
jest.mock("@/features/analytics/components/LineChart", () => ({
  LineChart: ({ data, yLabel }: { data: any[]; yLabel?: string }) =>
    React.createElement(React.Fragment, null,
      React.createElement("Text", null, `Chart: ${data?.length ?? 0} points`),
      yLabel ? React.createElement("Text", null, yLabel) : null,
    ),
}));

import { WellnessDashboardScreen } from "../WellnessDashboardScreen";

function trendsWithData() {
  return {
    periods: [
      { period: "7d", avgSessionRpe: 7.0, avgSleep: 4.0, avgFatigue: 3.0, avgSoreness: 2.0, avgMood: 4.5, entryCount: 3 },
      { period: "30d", avgSessionRpe: 6.5, avgSleep: 3.8, avgFatigue: 3.2, avgSoreness: 2.5, avgMood: 4.2, entryCount: 10 },
      { period: "90d", avgSessionRpe: 6.8, avgSleep: 3.9, avgFatigue: 3.1, avgSoreness: 2.3, avgMood: 4.3, entryCount: 25 },
    ],
    timeSeries: [
      { date: "2026-07-01", sessionRpe: 7, sleep: 4, fatigue: 3, soreness: 2, mood: 5 },
      { date: "2026-07-02", sessionRpe: 8, sleep: 3, fatigue: 4, soreness: 3, mood: 4 },
      { date: "2026-07-03", sessionRpe: 6, sleep: 5, fatigue: 2, soreness: 1, mood: 5 },
    ],
    entries: [],
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  };
}

describe("WellnessDashboardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", () => {
    mockUseWellnessTrends.mockReturnValue({
      periods: [],
      timeSeries: [],
      entries: [],
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<WellnessDashboardScreen />);

    expect(screen.getByText("Loading wellness trends...")).toBeTruthy();
  });

  it("renders error state with retry", () => {
    mockUseWellnessTrends.mockReturnValue({
      periods: [],
      timeSeries: [],
      entries: [],
      isLoading: false,
      error: new Error("Network failure"),
      refetch: mockRefetch,
    });

    render(<WellnessDashboardScreen />);

    expect(screen.getByText("Failed to load wellness data")).toBeTruthy();
    fireEvent.press(screen.getByText("Retry"));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("renders empty state when no data", () => {
    mockUseWellnessTrends.mockReturnValue({
      periods: [],
      timeSeries: [],
      entries: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<WellnessDashboardScreen />);

    expect(screen.getByText("No wellness data yet")).toBeTruthy();
  });

  it("renders period cards with trend data", () => {
    mockUseWellnessTrends.mockReturnValue(trendsWithData());

    render(<WellnessDashboardScreen />);

    expect(screen.getByText("Wellness")).toBeTruthy();
    expect(screen.getByText("Rolling Averages")).toBeTruthy();
    expect(screen.getByText("Last 7 Days")).toBeTruthy();
    expect(screen.getByText("Last 30 Days")).toBeTruthy();
    expect(screen.getByText("Last 90 Days")).toBeTruthy();
  });

  it("renders metric trend charts", () => {
    mockUseWellnessTrends.mockReturnValue(trendsWithData());

    render(<WellnessDashboardScreen />);

    expect(screen.getByText("Trends")).toBeTruthy();
    expect(screen.getByText("Session RPE")).toBeTruthy();
    expect(screen.getByText("Sleep Quality")).toBeTruthy();
    // Fatigue, Soreness, Mood appear both in period cards AND trend charts
    expect(screen.getAllByText("Fatigue").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Soreness").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Mood").length).toBeGreaterThanOrEqual(2);
  });

  it("shows metric values in period cards", () => {
    mockUseWellnessTrends.mockReturnValue(trendsWithData());

    render(<WellnessDashboardScreen />);

    // RPE appears in both period card labels and the period chart heading
    expect(screen.getAllByText("RPE").length).toBeGreaterThanOrEqual(1);
    // Sleep is in period cards as metric label
    expect(screen.getAllByText("Sleep").length).toBeGreaterThanOrEqual(1);
  });

  it("shows entry count in period cards", () => {
    mockUseWellnessTrends.mockReturnValue(trendsWithData());

    render(<WellnessDashboardScreen />);

    expect(screen.getByText("3 entries")).toBeTruthy();
  });
});
