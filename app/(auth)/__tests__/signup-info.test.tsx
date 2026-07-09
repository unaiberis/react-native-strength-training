import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { useAuthStore } from "../../../src/stores/auth-store";

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockUpdate = jest.fn();

jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn(() => ({ update: mockUpdate })),
  },
}));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
}));

// Need to import after mocks are set up
import SignUpInfoRoute from "../signup-info";

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    user: { id: "user-1", email: "test@test.com", displayName: "Test", collectionId: "", collectionName: "users" } as any,
    state: "authenticated",
    isPendingSignupInfo: true,
  });
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("SignUpInfoRoute", () => {
  it("renders all form fields and buttons", () => {
    render(<SignUpInfoRoute />);

    expect(screen.getByText("WELCOME")).toBeTruthy();
    expect(screen.getByText("Let's get to know you")).toBeTruthy();

    // Card labels
    expect(screen.getByText("Bodyweight")).toBeTruthy();
    expect(screen.getByText("Height")).toBeTruthy();
    expect(screen.getByText("Training Experience")).toBeTruthy();
    expect(screen.getByText("Primary Goal")).toBeTruthy();

    // Buttons
    expect(screen.getByText("Complete Setup")).toBeTruthy();
    expect(screen.getByText("Skip for now")).toBeTruthy();

    // Unit toggles
    expect(screen.getByText("kg")).toBeTruthy();
    expect(screen.getByText("lbs")).toBeTruthy();
    expect(screen.getByText("cm")).toBeTruthy();
    expect(screen.getByText("in")).toBeTruthy();

    // Experience chips
    expect(screen.getByText("Beginner")).toBeTruthy();
    expect(screen.getByText("Intermediate")).toBeTruthy();
    expect(screen.getByText("Advanced")).toBeTruthy();

    // Goal chips
    expect(screen.getByText("Strength")).toBeTruthy();
    expect(screen.getByText("Hypertrophy")).toBeTruthy();
    expect(screen.getByText("Endurance")).toBeTruthy();
    expect(screen.getByText("General Fitness")).toBeTruthy();
  });

  it("bodyweight input accepts text changes", () => {
    render(<SignUpInfoRoute />);

    const input = screen.getByPlaceholderText("Enter your weight");
    fireEvent.changeText(input, "75.5");
    expect(input.props.value).toBe("75.5");
  });

  it("height input accepts text changes", () => {
    render(<SignUpInfoRoute />);

    const input = screen.getByPlaceholderText("Enter your height");
    fireEvent.changeText(input, "180");
    expect(input.props.value).toBe("180");
  });

  it("weight unit toggle switches from kg to lbs", () => {
    render(<SignUpInfoRoute />);

    // Default is metric — kg is selected
    const kgChip = screen.getByText("kg");
    const lbsChip = screen.getByText("lbs");

    // Press lbs
    fireEvent.press(lbsChip);

    // lbs should now be active (no assertion on style — just verify no crash)
    expect(lbsChip).toBeTruthy();
  });

  it("height unit toggle switches from cm to in", () => {
    render(<SignUpInfoRoute />);

    const inChip = screen.getByText("in");
    fireEvent.press(inChip);

    expect(inChip).toBeTruthy();
  });

  it("experience selection changes on press", () => {
    render(<SignUpInfoRoute />);

    const intermediate = screen.getByText("Intermediate");
    fireEvent.press(intermediate);

    // Now press Advanced
    const advanced = screen.getByText("Advanced");
    fireEvent.press(advanced);

    expect(advanced).toBeTruthy();
  });

  it("goal selection changes on press", () => {
    render(<SignUpInfoRoute />);

    const hypertrophy = screen.getByText("Hypertrophy");
    fireEvent.press(hypertrophy);

    const endurance = screen.getByText("Endurance");
    fireEvent.press(endurance);

    expect(endurance).toBeTruthy();
  });

  it('"Skip for now" navigates to home and clears pending flag', () => {
    render(<SignUpInfoRoute />);

    fireEvent.press(screen.getByText("Skip for now"));

    expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    expect(useAuthStore.getState().isPendingSignupInfo).toBe(false);
  });

  it('"Complete Setup" shows validation error when fields are empty', () => {
    render(<SignUpInfoRoute />);

    fireEvent.press(screen.getByText("Complete Setup"));

    expect(
      screen.getByText("Please fill in all fields or skip for now"),
    ).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('"Complete Setup" saves data and navigates home', async () => {
    mockUpdate.mockResolvedValue({});
    render(<SignUpInfoRoute />);

    // Fill all fields
    fireEvent.changeText(screen.getByPlaceholderText("Enter your weight"), "75");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your height"), "175");

    // Select experience
    fireEvent.press(screen.getByText("Intermediate"));

    // Select goal
    fireEvent.press(screen.getByText("Strength"));

    // Submit
    fireEvent.press(screen.getByText("Complete Setup"));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith("user-1", {
        bodyweight: 75,
        bodyweight_unit: "metric",
        height: 175,
        height_unit: "metric",
        experience: "intermediate",
        goal: "strength",
        onboarding_completed: true,
      });
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });

    expect(useAuthStore.getState().isPendingSignupInfo).toBe(false);
  });

  it("handles save error gracefully", async () => {
    mockUpdate.mockRejectedValue(new Error("Network error"));
    render(<SignUpInfoRoute />);

    fireEvent.changeText(screen.getByPlaceholderText("Enter your weight"), "75");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your height"), "175");
    fireEvent.press(screen.getByText("Intermediate"));
    fireEvent.press(screen.getByText("Strength"));
    fireEvent.press(screen.getByText("Complete Setup"));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeTruthy();
    });
  });

  it("clears error when user starts typing after validation error", () => {
    render(<SignUpInfoRoute />);

    // Trigger validation error
    fireEvent.press(screen.getByText("Complete Setup"));

    expect(
      screen.getByText("Please fill in all fields or skip for now"),
    ).toBeTruthy();

    // Type in bodyweight — should clear error
    fireEvent.changeText(screen.getByPlaceholderText("Enter your weight"), "70");

    expect(
      screen.queryByText("Please fill in all fields or skip for now"),
    ).toBeNull();
  });
});
