import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ProfileMenu } from "../ProfileMenu";

describe("ProfileMenu", () => {
  const defaultHandlers = {
    onEditProfile: jest.fn(),
    onNotifications: jest.fn(),
    onUnitPreferences: jest.fn(),
    onWellness: jest.fn(),
    onHistory: jest.fn(),
    onHelp: jest.fn(),
    onSignOut: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all menu items", () => {
    const { getByText } = render(<ProfileMenu {...defaultHandlers} />);
    expect(getByText("Edit Profile")).toBeTruthy();
    expect(getByText("Notifications")).toBeTruthy();
    expect(getByText("Unit Preferences")).toBeTruthy();
    expect(getByText("Wellness Dashboard")).toBeTruthy();
    expect(getByText("Workout History")).toBeTruthy();
    expect(getByText("Help & Support")).toBeTruthy();
    expect(getByText("Sign Out")).toBeTruthy();
  });

  it("fires onEditProfile when Edit Profile is pressed", () => {
    const onEditProfile = jest.fn();
    const { getByText } = render(
      <ProfileMenu {...defaultHandlers} onEditProfile={onEditProfile} />,
    );
    fireEvent.press(getByText("Edit Profile"));
    expect(onEditProfile).toHaveBeenCalledTimes(1);
  });

  it("fires onUnitPreferences when Unit Preferences is pressed", () => {
    const onUnitPreferences = jest.fn();
    const { getByText } = render(
      <ProfileMenu
        {...defaultHandlers}
        onUnitPreferences={onUnitPreferences}
      />,
    );
    fireEvent.press(getByText("Unit Preferences"));
    expect(onUnitPreferences).toHaveBeenCalledTimes(1);
  });

  it("fires onWellness when Wellness Dashboard is pressed", () => {
    const onWellness = jest.fn();
    const { getByText } = render(
      <ProfileMenu {...defaultHandlers} onWellness={onWellness} />,
    );
    fireEvent.press(getByText("Wellness Dashboard"));
    expect(onWellness).toHaveBeenCalledTimes(1);
  });

  it("fires onHistory when Workout History is pressed", () => {
    const onHistory = jest.fn();
    const { getByText } = render(
      <ProfileMenu {...defaultHandlers} onHistory={onHistory} />,
    );
    fireEvent.press(getByText("Workout History"));
    expect(onHistory).toHaveBeenCalledTimes(1);
  });

  it("fires onHelp when Help & Support is pressed", () => {
    const onHelp = jest.fn();
    const { getByText } = render(
      <ProfileMenu {...defaultHandlers} onHelp={onHelp} />,
    );
    fireEvent.press(getByText("Help & Support"));
    expect(onHelp).toHaveBeenCalledTimes(1);
  });

  it("fires onSignOut when Sign Out is pressed", () => {
    const onSignOut = jest.fn();
    const { getByText } = render(
      <ProfileMenu {...defaultHandlers} onSignOut={onSignOut} />,
    );
    fireEvent.press(getByText("Sign Out"));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("renders Sign Out with correct accessibility label", () => {
    const { getByLabelText } = render(<ProfileMenu {...defaultHandlers} />);
    expect(getByLabelText("Sign Out")).toBeTruthy();
  });

  it("renders all items as accessible buttons", () => {
    const { getByLabelText } = render(<ProfileMenu {...defaultHandlers} />);
    expect(getByLabelText("Edit Profile")).toBeTruthy();
    expect(getByLabelText("Unit Preferences")).toBeTruthy();
    expect(getByLabelText("Wellness Dashboard")).toBeTruthy();
    expect(getByLabelText("Workout History")).toBeTruthy();
    expect(getByLabelText("Help & Support")).toBeTruthy();
    expect(getByLabelText("Sign Out")).toBeTruthy();
  });
});
