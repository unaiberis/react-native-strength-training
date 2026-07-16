import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PRCelebrationScreen } from "../PRCelebrationScreen";

const mockBack = jest.fn();

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: mockBack,
  }),
  useLocalSearchParams: () => ({
    exerciseName: "Bench Press",
    newPR: "120",
    previousPR: "110",
    unit: "kg",
  }),
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
});
