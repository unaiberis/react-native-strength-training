import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/shared/ui/Button";

const mockUpdateProfile = jest.fn();
jest.mock("@/lib/pocketbase/users", () => ({
  updateProfile: (...args: any[]) => mockUpdateProfile(...args),
}));

const mockRouterBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: mockRouterBack,
  }),
}));

jest.mock("@/shared/ui/ScreenLayout", () => ({
  ScreenLayout: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

import { EditProfileScreen } from "../EditProfileScreen";

const user = {
  id: "u1",
  email: "test@example.com",
  displayName: "Test User",
};

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditProfileScreen />
    </QueryClientProvider>,
  );
}

describe("EditProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: user as any, isOnline: true });
  });

  it("renders fields pre-filled from the user and a read-only email", () => {
    renderScreen();

    expect(screen.getByDisplayValue("Test User")).toBeTruthy();
    const emailInput = screen.getByDisplayValue("test@example.com");
    expect(emailInput).toBeTruthy();
    expect(emailInput.props.editable).toBe(false);
  });

  it("shows a validation error and does not call updateProfile on empty displayName", async () => {
    renderScreen();

    fireEvent.changeText(screen.getByDisplayValue("Test User"), "");
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(screen.getByText("Display name is required")).toBeTruthy(),
    );
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("disables Save and shows the offline note when offline", () => {
    useAuthStore.setState({ isOnline: false });
    renderScreen();

    expect(
      screen.getByText("You're offline — profile changes need a connection"),
    ).toBeTruthy();
    const saveButton = screen
      .UNSAFE_getAllByType(Button)
      .find((b: any) => b.props.title === "Save");
    expect(saveButton?.props.disabled).toBe(true);
  });

  it("submits valid data, refreshes the store, and navigates back", async () => {
    const updated = { ...user, displayName: "Test User" };
    mockUpdateProfile.mockResolvedValue(updated);

    renderScreen();

    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalled());
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ displayName: "Test User" }),
    );
    const payload = mockUpdateProfile.mock.calls[0][1];
    expect(payload).not.toHaveProperty("email");

    expect(mockRouterBack).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toEqual(updated);
  });
});
