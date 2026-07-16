import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { AnimatedEmptyState } from "../AnimatedEmptyState";

describe("AnimatedEmptyState", () => {
  it("renders title and subtitle", () => {
    const { getByText } = render(
      <AnimatedEmptyState
        title="Workout Complete!"
        subtitle="Great job today!"
      />,
    );
    expect(getByText("Workout Complete!")).toBeTruthy();
    expect(getByText("Great job today!")).toBeTruthy();
  });

  it("renders action button when provided", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <AnimatedEmptyState
        title="No data"
        action={{ label: "Start Workout", onPress }}
      />,
    );
    const button = getByText("Start Workout");
    expect(button).toBeTruthy();
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("falls back to EmptyState when no Lottie source provided", () => {
    const { getByText } = render(
      <AnimatedEmptyState
        title="Fallback Title"
        subtitle="Fallback subtitle"
      />,
    );
    expect(getByText("Fallback Title")).toBeTruthy();
    expect(getByText("Fallback subtitle")).toBeTruthy();
  });

  it("renders without subtitle", () => {
    const { getByText, queryByText } = render(
      <AnimatedEmptyState title="Only Title" />,
    );
    expect(getByText("Only Title")).toBeTruthy();
    expect(queryByText("undefined")).toBeNull();
  });
});
