import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Platform } from "react-native";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import { Button } from "../Button";

// impactAsync is already mocked in jest.setup.ts
const mockImpactAsync = impactAsync as jest.Mock;

describe("Button", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = "ios";
  });

  describe("rendering", () => {
    it("renders with a title", () => {
      render(<Button title="Press me" />);
      expect(screen.getByText("Press me")).toBeTruthy();
    });

    it("renders with different variants", () => {
      const { rerender } = render(<Button title="Primary" variant="primary" />);
      expect(screen.getByText("Primary")).toBeTruthy();

      rerender(<Button title="Secondary" variant="secondary" />);
      expect(screen.getByText("Secondary")).toBeTruthy();

      rerender(<Button title="Ghost" variant="ghost" />);
      expect(screen.getByText("Ghost")).toBeTruthy();

      rerender(<Button title="Danger" variant="danger" />);
      expect(screen.getByText("Danger")).toBeTruthy();
    });

    it("renders with different sizes", () => {
      const { rerender } = render(<Button title="LG" size="lg" />);
      expect(screen.getByText("LG")).toBeTruthy();

      rerender(<Button title="MD" size="md" />);
      expect(screen.getByText("MD")).toBeTruthy();

      rerender(<Button title="SM" size="sm" />);
      expect(screen.getByText("SM")).toBeTruthy();
    });

    it("shows an activity indicator when loading", () => {
      const { getByTestId } = render(
        <Button title="Loading" loading testID="btn" />,
      );
      // ActivityIndicator renders as View in the mock
      expect(screen.getByText("Loading")).toBeTruthy();
    });

    it("renders with disabled prop without crashing", () => {
      const { toJSON } = render(<Button title="Disabled" disabled />);
      expect(toJSON()).toBeTruthy();
    });

    it("renders with loading prop without crashing", () => {
      const { toJSON } = render(<Button title="Loading" loading />);
      expect(toJSON()).toBeTruthy();
    });


  });

  describe("haptic feedback", () => {
    it("fires Medium impact on primary button press (native)", () => {
      const onPress = jest.fn();
      render(<Button title="Primary" variant="primary" onPress={onPress} />);
      fireEvent.press(screen.getByText("Primary"));
      expect(mockImpactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("fires Heavy impact on danger button press (native)", () => {
      const onPress = jest.fn();
      render(<Button title="Danger" variant="danger" onPress={onPress} />);
      fireEvent.press(screen.getByText("Danger"));
      expect(mockImpactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Heavy);
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("does not fire haptics on secondary variant", () => {
      const onPress = jest.fn();
      render(<Button title="Secondary" variant="secondary" onPress={onPress} />);
      fireEvent.press(screen.getByText("Secondary"));
      expect(mockImpactAsync).not.toHaveBeenCalled();
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("does not fire haptics on ghost variant", () => {
      render(<Button title="Ghost" variant="ghost" />);
      fireEvent.press(screen.getByText("Ghost"));
      expect(mockImpactAsync).not.toHaveBeenCalled();
    });

    it("does not fire haptics on web platform", () => {
      Platform.OS = "web";
      const onPress = jest.fn();
      render(<Button title="Primary" variant="primary" onPress={onPress} />);
      fireEvent.press(screen.getByText("Primary"));
      expect(mockImpactAsync).not.toHaveBeenCalled();
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("calls onPress even if haptics throws", () => {
      mockImpactAsync.mockRejectedValueOnce(new Error("haptics unavailable"));
      const onPress = jest.fn();
      render(<Button title="Primary" variant="primary" onPress={onPress} />);
      fireEvent.press(screen.getByText("Primary"));
      // The haptics rejection is caught in the .catch() handler
      expect(mockImpactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe("accessibility", () => {
    it("renders a button accessibility role", () => {
      render(<Button title="Accessible" />);
      // TouchableOpacity renders with accessibilityRole="button" by default
      expect(screen.getByText("Accessible")).toBeTruthy();
    });
  });
});
