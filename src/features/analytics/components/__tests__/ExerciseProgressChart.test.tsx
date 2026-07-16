import React from "react";
import { render } from "@testing-library/react-native";
import { ExerciseProgressChart } from "../ExerciseProgressChart";

describe("ExerciseProgressChart", () => {
  const sampleData = [
    { date: "2026-07-01", value: 100 },
    { date: "2026-07-08", value: 110 },
    { date: "2026-07-15", value: 105 },
  ];

  it("renders empty state when data is empty", () => {
    const { getByText } = render(<ExerciseProgressChart data={[]} />);
    expect(getByText("No data yet")).toBeTruthy();
  });

  it("renders with data without crashing", () => {
    const { getByTestId } = render(
      <ExerciseProgressChart data={sampleData} />,
    );
    expect(getByTestId("victory-chart")).toBeTruthy();
  });

  it("renders with custom height", () => {
    const { getByTestId } = render(
      <ExerciseProgressChart data={sampleData} height={300} />,
    );
    expect(getByTestId("victory-chart")).toBeTruthy();
  });

  it("renders with custom color", () => {
    const { getByTestId } = render(
      <ExerciseProgressChart data={sampleData} lineColor="#D65F5F" />,
    );
    expect(getByTestId("victory-chart")).toBeTruthy();
  });

  it("renders with yLabel", () => {
    const { getByTestId } = render(
      <ExerciseProgressChart data={sampleData} yLabel="Weight (kg)" />,
    );
    expect(getByTestId("victory-chart")).toBeTruthy();
  });

  it("renders single data point without crashing", () => {
    const singleData = [{ date: "2026-07-01", value: 100 }];
    const { getByTestId } = render(
      <ExerciseProgressChart data={singleData} />,
    );
    expect(getByTestId("victory-chart")).toBeTruthy();
  });
});
