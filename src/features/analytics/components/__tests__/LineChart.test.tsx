import React from "react";
import { render } from "@testing-library/react-native";
import { LineChart } from "../LineChart";

describe("LineChart", () => {
  const sampleData = [
    { date: "2026-07-01", value: 100 },
    { date: "2026-07-08", value: 110 },
    { date: "2026-07-15", value: 105 },
    { date: "2026-07-22", value: 120 },
  ];

  it("renders empty state when data is empty", () => {
    const { getByText } = render(<LineChart data={[]} />);
    expect(getByText("No data yet")).toBeTruthy();
  });

  it("renders data points", () => {
    const { getByText } = render(<LineChart data={sampleData} />);
    // Y-axis labels should show
    expect(getByText("100")).toBeTruthy();
    expect(getByText("120")).toBeTruthy();
  });

  it("renders with custom colors", () => {
    const { getByText } = render(
      <LineChart
        data={sampleData}
        lineColor="#D65F5F"
        trendColor="#D7D7D2"
      />,
    );
    expect(getByText("100")).toBeTruthy();
    expect(getByText("120")).toBeTruthy();
  });

  it("renders with trend line enabled", () => {
    const { getByText } = render(
      <LineChart data={sampleData} showTrend trendWindow={3} />,
    );
    expect(getByText("100")).toBeTruthy();
    expect(getByText("120")).toBeTruthy();
  });

  it("renders with custom height", () => {
    const { getByText } = render(<LineChart data={sampleData} height={300} />);
    expect(getByText("100")).toBeTruthy();
  });

  it("renders with Y axis label", () => {
    const { getByText } = render(
      <LineChart data={sampleData} yLabel="Weight (kg)" />,
    );
    expect(getByText("Weight (kg)")).toBeTruthy();
    expect(getByText("100")).toBeTruthy();
  });

  it("renders single data point without crashing", () => {
    const singleData = [{ date: "2026-07-01", value: 100 }];
    const { getAllByText } = render(<LineChart data={singleData} />);
    // "100" appears as both Y axis label and potentially in the chart area
    expect(getAllByText("100").length).toBeGreaterThanOrEqual(1);
  });

  it("renders with explicit min/max values", () => {
    const { getByText } = render(
      <LineChart data={sampleData} minValue={0} maxValue={200} />,
    );
    expect(getByText("0")).toBeTruthy();
    expect(getByText("200")).toBeTruthy();
  });
});
