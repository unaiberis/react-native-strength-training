import React from "react";
import { render } from "@testing-library/react-native";
import { ConsistencyHeatmap } from "../ConsistencyHeatmap";

describe("ConsistencyHeatmap", () => {
  const sampleData = [
    { date: "2026-07-01", count: 1 },
    { date: "2026-07-02", count: 2 },
    { date: "2026-07-03", count: 0 },
  ];

  it("renders without crashing", () => {
    const { getByText } = render(
      <ConsistencyHeatmap data={sampleData} weeks={4} />,
    );
    // Day labels should be present
    expect(getByText("M")).toBeTruthy();
    expect(getByText("W")).toBeTruthy();
    expect(getByText("F")).toBeTruthy();
  });

  it("renders with empty data", () => {
    const { getByText } = render(<ConsistencyHeatmap data={[]} weeks={4} />);
    expect(getByText("M")).toBeTruthy();
  });

  it("renders with custom weeks count", () => {
    const { getByText } = render(
      <ConsistencyHeatmap data={sampleData} weeks={8} />,
    );
    expect(getByText("M")).toBeTruthy();
  });

  it("renders legend labels", () => {
    const { getByText } = render(
      <ConsistencyHeatmap data={sampleData} weeks={4} />,
    );
    expect(getByText("Less")).toBeTruthy();
    expect(getByText("More")).toBeTruthy();
  });

  it("renders with default weeks (12)", () => {
    const { getByText } = render(<ConsistencyHeatmap data={sampleData} />);
    expect(getByText("M")).toBeTruthy();
  });
});
