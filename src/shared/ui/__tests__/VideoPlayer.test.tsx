import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Linking, Platform } from "react-native";
import { VideoPlayer } from "../VideoPlayer";

// Mock Linking.openURL
const mockOpenURL = jest.fn().mockResolvedValue(undefined);
(Linking.openURL as jest.Mock) = mockOpenURL;

describe("VideoPlayer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = "ios";
  });

  it("renders nothing when videoUrl is null", () => {
    const { queryByText } = render(<VideoPlayer videoUrl={null} />);
    expect(queryByText("Watch on YouTube")).toBeNull();
    expect(queryByText("Watch Tutorial")).toBeNull();
  });

  it("renders nothing when videoUrl is empty string", () => {
    const { queryByText } = render(<VideoPlayer videoUrl="" />);
    expect(queryByText("Watch on YouTube")).toBeNull();
    expect(queryByText("Watch Tutorial")).toBeNull();
  });

  it("renders a 'Watch on YouTube' card for YouTube URLs on native", () => {
    const { getByText } = render(
      <VideoPlayer videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />,
    );
    expect(getByText("Watch on YouTube")).toBeTruthy();
    expect(getByText("Tap to play")).toBeTruthy();
  });

  it("renders a 'Watch Tutorial' card for non-YouTube URLs on native", () => {
    const { getByText } = render(
      <VideoPlayer videoUrl="https://vimeo.com/123456" />,
    );
    expect(getByText("Watch Tutorial")).toBeTruthy();
  });

  it("calls Linking.openURL when tapped", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const { getByText } = render(<VideoPlayer videoUrl={url} />);
    fireEvent.press(getByText("Watch on YouTube"));
    expect(mockOpenURL).toHaveBeenCalledWith(url);
  });

  it("renders a 'Watch on YouTube' card for youtu.be shortened URLs", () => {
    const { getByText } = render(
      <VideoPlayer videoUrl="https://youtu.be/dQw4w9WgXcQ" />,
    );
    expect(getByText("Watch on YouTube")).toBeTruthy();
  });
});
