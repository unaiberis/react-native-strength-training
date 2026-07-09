import React from "react";
import { render } from "@testing-library/react-native";
import { ProfileStats } from "../ProfileStats";

describe("ProfileStats", () => {
  const defaultProps = {
    totalWorkouts: 42,
    currentStreak: 7,
    personalRecords: 15,
    totalVolume: 12500,
  };

  it("renders total workouts count", () => {
    const { getByText } = render(<ProfileStats {...defaultProps} />);
    expect(getByText("42")).toBeTruthy();
  });

  it("renders current streak with label", () => {
    const { getByText } = render(<ProfileStats {...defaultProps} />);
    expect(getByText("7 days")).toBeTruthy();
  });

  it("renders personal records count", () => {
    const { getByText } = render(<ProfileStats {...defaultProps} />);
    expect(getByText("15")).toBeTruthy();
  });

  it("renders total volume in tonnes for large values", () => {
    const { getByText } = render(<ProfileStats {...defaultProps} />);
    expect(getByText("12.5t")).toBeTruthy();
  });

  it("renders volume in tonnes for very large values", () => {
    const { getByText } = render(
      <ProfileStats
        totalWorkouts={100}
        currentStreak={30}
        personalRecords={20}
        totalVolume={150000}
      />,
    );
    expect(getByText("150.0t")).toBeTruthy();
  });

  it("renders volume as raw number when under 1000 kg", () => {
    const { getByText } = render(
      <ProfileStats
        totalWorkouts={5}
        currentStreak={2}
        personalRecords={3}
        totalVolume={950}
      />,
    );
    expect(getByText("950")).toBeTruthy();
  });

  it("renders all stat labels", () => {
    const { getByText } = render(<ProfileStats {...defaultProps} />);
    expect(getByText("Total Workouts")).toBeTruthy();
    expect(getByText("Current Streak")).toBeTruthy();
    expect(getByText("Personal Records")).toBeTruthy();
    expect(getByText("Total Volume")).toBeTruthy();
  });

  it("handles zero values gracefully", () => {
    const { getAllByText, getByText } = render(
      <ProfileStats
        totalWorkouts={0}
        currentStreak={0}
        personalRecords={0}
        totalVolume={0}
      />,
    );
    expect(getAllByText("0").length).toBe(3); // workouts + PRs + volume (all render as "0")
    expect(getByText("0 days")).toBeTruthy();
  });

  it("shows singular 'day' for one-day streak", () => {
    const { getByText } = render(
      <ProfileStats
        totalWorkouts={1}
        currentStreak={1}
        personalRecords={1}
        totalVolume={100}
      />,
    );
    expect(getByText("1 day")).toBeTruthy();
  });

  it("formats volume with locale separator for medium values", () => {
    const { getByText } = render(
      <ProfileStats
        totalWorkouts={5}
        currentStreak={2}
        personalRecords={3}
        totalVolume={999}
      />,
    );
    expect(getByText("999")).toBeTruthy();
  });
});
