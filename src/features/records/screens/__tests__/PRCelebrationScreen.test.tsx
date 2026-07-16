import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PRCelebrationScreen } from "../PRCelebrationScreen";

const mockBack = jest.fn();
let mockParams: Record<string, string> = {
  exerciseName: "Bench Press",
  newPR: "120",
  previousPR: "110",
  unit: "kg",
};

// Mock expo-router with dynamic params
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: mockBack,
  }),
  useLocalSearchParams: () => mockParams,
  Stack: { Screen: () => null },
}));

// Mock GradientBackground
jest.mock("@/shared/ui/GradientBackground", () => ({
  GradientBackground: ({ children }: { children: React.ReactNode }) =>
    React.createElement("View", null, children),
}));

describe("PRCelebrationScreen", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockParams = {
      exerciseName: "Bench Press",
      newPR: "120",
      previousPR: "110",
      unit: "kg",
    };
  });

  it("renders PR celebration title", () => {
    const { getByText } = render(<PRCelebrationScreen />);
    expect(getByText("New Personal Record!")).toBeTruthy();
  });

  it("renders exercise name", () => {
    const { getByText } = render(<PRCelebrationScreen />);
    expect(getByText("Bench Press")).toBeTruthy();
  });

  it("renders PR value", () => {
    const { getByText } = render(<PRCelebrationScreen />);
    expect(getByText("120")).toBeTruthy();
  });

  it("renders previous PR comparison", () => {
    const { getByText } = render(<PRCelebrationScreen />);
    expect(getByText("Previous:")).toBeTruthy();
    expect(getByText("110 kg")).toBeTruthy();
  });

  it("renders Continue and Share buttons", () => {
    const { getByText } = render(<PRCelebrationScreen />);
    expect(getByText("Continue")).toBeTruthy();
    expect(getByText("Share")).toBeTruthy();
  });

  it("triggers navigation on Continue press", () => {
    const { getByText } = render(<PRCelebrationScreen />);
    fireEvent.press(getByText("Continue"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("hides previous PR comparison when previousPR is not provided", () => {
    mockParams = {
      exerciseName: "Squat",
      newPR: "200",
      unit: "kg",
    };
    const { queryByText } = render(<PRCelebrationScreen />);
    expect(queryByText("Previous:")).toBeNull();
  });

  it("renders with default unit and exercise name when params missing", () => {
    mockParams = {
      newPR: "100",
    };
    const { getByText } = render(<PRCelebrationScreen />);
    expect(getByText("Exercise")).toBeTruthy();
    expect(getByText("100")).toBeTruthy();
  });
});
