import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

// Mock the auth service module
const mockRequestPasswordReset = jest.fn();
jest.mock("@/lib/pocketbase/services/auth", () => ({
  requestPasswordReset: (...args: any[]) => mockRequestPasswordReset(...args),
}));

const mockRouterBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockRouterBack, push: jest.fn(), replace: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Tabs: () => null,
}));

import { ForgotPasswordScreen } from "../ForgotPasswordScreen";

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the form with email input and submit button", () => {
    render(<ForgotPasswordScreen />);

    expect(screen.getByText("Reset password")).toBeTruthy();
    expect(screen.getByText("Send Reset Link")).toBeTruthy();
    expect(screen.getByText("Back to login")).toBeTruthy();
  });

  it("shows error when submitting with empty email", () => {
    render(<ForgotPasswordScreen />);

    fireEvent.press(screen.getByText("Send Reset Link"));

    expect(screen.getByText("Enter your email address")).toBeTruthy();
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it("shows success message on successful password reset request", async () => {
    mockRequestPasswordReset.mockResolvedValue({ error: null });

    render(<ForgotPasswordScreen />);

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.press(screen.getByText("Send Reset Link"));

    await waitFor(() => {
      expect(screen.getByText("Check your email for the reset link")).toBeTruthy();
    });

    expect(mockRequestPasswordReset).toHaveBeenCalledWith("test@example.com");
  });

  it("shows error message on failed password reset request", async () => {
    mockRequestPasswordReset.mockResolvedValue({
      error: "Invalid email address",
    });

    render(<ForgotPasswordScreen />);

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.changeText(emailInput, "invalid@example.com");
    fireEvent.press(screen.getByText("Send Reset Link"));

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeTruthy();
    });

    expect(mockRequestPasswordReset).toHaveBeenCalledWith("invalid@example.com");
  });

  it("navigates back when 'Back to login' is pressed", () => {
    render(<ForgotPasswordScreen />);

    fireEvent.press(screen.getByText("Back to login"));

    expect(mockRouterBack).toHaveBeenCalled();
  });

  it("shows success message and disables inputs after successful request", async () => {
    mockRequestPasswordReset.mockResolvedValue({ error: null });

    render(<ForgotPasswordScreen />);

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.press(screen.getByText("Send Reset Link"));

    await waitFor(() => {
      expect(screen.getByText("Check your email for the reset link")).toBeTruthy();
    });

    // Input should be non-editable after success
    expect(emailInput.props.editable).toBe(false);
    expect(mockRequestPasswordReset).toHaveBeenCalledWith("test@example.com");
  });
});
