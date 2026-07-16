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
    expect(getByText("Tap to open")).toBeTruthy();
  });

  it("renders a 'Watch Tutorial' card for non-YouTube URLs on native", () => {
    const { getByText } = render(
      <VideoPlayer videoUrl="https://vimeo.com/123456" />,
    );
    expect(getByText("Watch Tutorial")).toBeTruthy();
  });

  it("calls Linking.openURL when YouTube URL tapped", () => {
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

  it("renders 'Tap to play inline' for direct video URLs", () => {
    const { getByText } = render(
      <VideoPlayer videoUrl="https://example.com/video.mp4" />,
    );
    expect(getByText("Watch Tutorial")).toBeTruthy();
    expect(getByText("Tap to play inline")).toBeTruthy();
  });

  // ─── New: inline expo-video playback ─────────────────────────────────────

  it("transitions to inline video view when pressing a direct video URL", () => {
    const { getByText, getByTestId } = render(
      <VideoPlayer videoUrl="https://example.com/video.mp4" />,
    );
    fireEvent.press(getByText("Watch Tutorial"));
    // Should now render the VideoView (mocked as testID "video-view")
    expect(getByTestId("video-view")).toBeTruthy();
  });

  it("shows error UI when Linking.openURL fails for YouTube URL", async () => {
    mockOpenURL.mockRejectedValueOnce(new Error("No app found"));
    const { getByText, findByText } = render(
      <VideoPlayer videoUrl="https://www.youtube.com/watch?v=abc123" />,
    );
    fireEvent.press(getByText("Watch on YouTube"));
    // Error state is set asynchronously (inside .catch handler)
    expect(await findByText("Video unavailable")).toBeTruthy();
  });

  // ─── Edge cases ──────────────────────────────────────────────────────────

  it("renders with HLS direct video URL", () => {
    const { getByText } = render(
      <VideoPlayer videoUrl="https://example.com/stream.m3u8" />,
    );
    expect(getByText("Watch Tutorial")).toBeTruthy();
    expect(getByText("Tap to play inline")).toBeTruthy();
  });

  it("renders with .mov direct video URL", () => {
    const { getByText } = render(
      <VideoPlayer videoUrl="https://example.com/clip.mov" />,
    );
    expect(getByText("Tap to play inline")).toBeTruthy();
  });

  it("renders YouTube embed URL", () => {
    const { getByText } = render(
      <VideoPlayer videoUrl="https://www.youtube.com/embed/abc123" />,
    );
    expect(getByText("Watch on YouTube")).toBeTruthy();
  });

  it("calls handleOpenUrl correctly for non-direct URLs", () => {
    const url = "https://vimeo.com/654321";
    const { getByText } = render(<VideoPlayer videoUrl={url} />);
    fireEvent.press(getByText("Watch Tutorial"));
    expect(mockOpenURL).toHaveBeenCalledWith(url);
  });
});
