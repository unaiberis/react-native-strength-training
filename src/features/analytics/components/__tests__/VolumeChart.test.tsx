import React from "react";
import { render } from "@testing-library/react-native";
import { VolumeChart } from "../VolumeChart";

describe("VolumeChart", () => {
  const sampleData = [
    { period: "2026-W01", volume: 4500 },
    { period: "2026-W02", volume: 5200 },
    { period: "2026-W03", volume: 3800 },
  ];

  it("renders empty state when data is empty", () => {
    const { getByText } = render(<VolumeChart data={[]} />);
    expect(getByText("No data yet")).toBeTruthy();
  });

  it("renders with data without crashing", () => {
    const { getByTestId } = render(<VolumeChart data={sampleData} />);
    // VictoryChart is mocked as a View with testID="victory-chart"
    expect(getByTestId("victory-chart")).toBeTruthy();
  });

  it("renders with single data point", () => {
    const { getByTestId } = render(
      <VolumeChart data={[{ period: "2026-W01", volume: 1000 }]} />,
    );
    expect(getByTestId("victory-chart")).toBeTruthy();
  });

  it("renders with custom height", () => {
    const { getByTestId } = render(
      <VolumeChart data={sampleData} height={300} />,
    );
    expect(getByTestId("victory-chart")).toBeTruthy();
  });
});
