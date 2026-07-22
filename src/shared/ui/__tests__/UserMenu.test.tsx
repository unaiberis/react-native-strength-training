/**
 * Tests for UserMenu component.
 *
 * Validates rendering, dropdown toggle, user info display, and logout action.
 */

import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";

// Mock auth store with mutable state for per-test control
let mockUser = { id: "user-1", email: "coach@test.com", displayName: "Coach One" };
const mockReset = jest.fn();
jest.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: any) => {
    const state = { user: mockUser, reset: mockReset };
    return selector ? selector(state) : state;
  },
}));

import { UserMenu } from "../UserMenu";

describe("UserMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: "user-1", email: "coach@test.com", displayName: "Coach One" };
  });

  it("renders the avatar button with user initial", () => {
    render(<UserMenu />);
    expect(screen.getByText("C")).toBeTruthy(); // "Coach One" → "C"
  });

  it("shows dropdown with user info and logout button when pressed", () => {
    render(<UserMenu />);

    // Initial state: dropdown hidden
    expect(screen.queryByText("Coach One")).toBeNull();
    expect(screen.queryByText("coach@test.com")).toBeNull();
    expect(screen.queryByText("Logout")).toBeNull();

    // Press avatar to open dropdown
    fireEvent.press(screen.getByText("C"));
    expect(screen.getByText("Coach One")).toBeTruthy();
    expect(screen.getByText("coach@test.com")).toBeTruthy();
    expect(screen.getByText("Logout")).toBeTruthy();
  });

  it("closes the dropdown when backdrop is pressed", () => {
    render(<UserMenu />);

    // Open dropdown
    fireEvent.press(screen.getByText("C"));
    expect(screen.getByText("Logout")).toBeTruthy();

    // Close via backdrop
    fireEvent.press(screen.getByLabelText("Close menu"));
    expect(screen.queryByText("Logout")).toBeNull();
  });

  it("calls reset() when logout is pressed", () => {
    render(<UserMenu />);

    fireEvent.press(screen.getByText("C"));
    fireEvent.press(screen.getByText("Logout"));

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("handles user with no displayName gracefully", () => {
    mockUser = { id: "user-1", email: "test@test.com", displayName: "" };

    render(<UserMenu />);
    // First letter of email: "t"
    expect(screen.getByText("T")).toBeTruthy();

    fireEvent.press(screen.getByText("T"));
    // displayName should not render when empty
    expect(screen.queryByText("Coach One")).toBeNull();
    expect(screen.getByText("test@test.com")).toBeTruthy();
  });

  it("handles user with no email or displayName gracefully", () => {
    mockUser = { id: "user-1", email: "", displayName: "" };

    render(<UserMenu />);
    // Fallback initial is "?"
    expect(screen.getByText("?")).toBeTruthy();
  });
});
