import { render, screen, fireEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import { ExerciseDetailScreen } from "../ExerciseDetailScreen";

// Mock the useExercise hook with a controllable mock function
const mockUseExercise = jest.fn();
jest.mock("../../hooks/useExercises", () => ({
  useExercise: (...args: any[]) => mockUseExercise(...args),
}));

const baseExercise = {
  id: "ex-1",
  name: "Bench Press",
  category: "strength",
  equipment: ["Barbell"],
  body_region: "chest",
  description: "A classic compound movement",
  default_sets: 4,
  default_reps: 8,
  default_rest_seconds: 90,
  is_public: true,
  created: "2024-01-01T00:00:00Z",
  updated: "2024-01-02T00:00:00Z",
};

describe("ExerciseDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders exercise name and details normally when video_url is absent", () => {
    mockUseExercise.mockReturnValue({
      data: { ...baseExercise },
      isLoading: false,
      error: null,
    });

    render(<ExerciseDetailScreen />);

    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.getByText("Strength")).toBeTruthy();
    expect(screen.getByText("Default Settings")).toBeTruthy();
  });

  it("renders 'Watch on YouTube' player when video_url is present", () => {
    mockUseExercise.mockReturnValue({
      data: {
        ...baseExercise,
        video_url: "https://youtube.com/watch?v=abc123",
      },
      isLoading: false,
      error: null,
    });

    render(<ExerciseDetailScreen />);

    expect(screen.getByText("Watch on YouTube")).toBeTruthy();
    expect(screen.getByText("Tap to play")).toBeTruthy();
  });

  it("hides video player when video_url is null", () => {
    mockUseExercise.mockReturnValue({
      data: { ...baseExercise, video_url: null },
      isLoading: false,
      error: null,
    });

    render(<ExerciseDetailScreen />);

    expect(screen.queryByText("Watch on YouTube")).toBeNull();
    expect(screen.queryByText("Tap to play")).toBeNull();
  });

  it("tapping video player calls Linking.openURL with correct URL", () => {
    const openURLSpy = jest.spyOn(Linking, "openURL");
    mockUseExercise.mockReturnValue({
      data: {
        ...baseExercise,
        video_url: "https://youtube.com/watch?v=abc123",
      },
      isLoading: false,
      error: null,
    });

    render(<ExerciseDetailScreen />);

    const link = screen.getByText("Watch on YouTube");
    fireEvent.press(link);
    expect(openURLSpy).toHaveBeenCalledWith(
      "https://youtube.com/watch?v=abc123",
    );
  });
});
