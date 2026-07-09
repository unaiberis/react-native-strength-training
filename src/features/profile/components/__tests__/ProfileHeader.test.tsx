import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ProfileHeader } from "../ProfileHeader";

describe("ProfileHeader", () => {
  const defaultProps = {
    name: "John Doe",
    email: "john@example.com",
    onEdit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the user's name", () => {
    const { getByText } = render(<ProfileHeader {...defaultProps} />);
    expect(getByText("John Doe")).toBeTruthy();
  });

  it("renders the user's email", () => {
    const { getByText } = render(<ProfileHeader {...defaultProps} />);
    expect(getByText("john@example.com")).toBeTruthy();
  });

  it("shows initials in avatar", () => {
    const { getByText } = render(<ProfileHeader {...defaultProps} />);
    expect(getByText("JD")).toBeTruthy();
  });

  it("renders the edit profile button", () => {
    const { getByText } = render(<ProfileHeader {...defaultProps} />);
    expect(getByText("Edit Profile")).toBeTruthy();
  });

  it("calls onEdit when the edit button is pressed", () => {
    const onEdit = jest.fn();
    const { getByText } = render(
      <ProfileHeader {...defaultProps} onEdit={onEdit} />,
    );

    fireEvent.press(getByText("Edit Profile"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("handles single-word names for initials", () => {
    const { getByText } = render(
      <ProfileHeader
        name="James"
        email="james@example.com"
        onEdit={jest.fn()}
      />,
    );
    expect(getByText("JA")).toBeTruthy();
  });

  it("renders with a very long name without crashing", () => {
    const longName = "Alexander Benjamin Christopher David";
    const { getByText } = render(
      <ProfileHeader
        name={longName}
        email="alex@example.com"
        onEdit={jest.fn()}
      />,
    );
    expect(getByText(longName)).toBeTruthy();
  });
});
