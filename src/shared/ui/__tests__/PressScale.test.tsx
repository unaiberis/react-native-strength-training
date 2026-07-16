import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import { Text, View } from "react-native";
import { PressScale } from "../PressScale";

describe("PressScale", () => {
  it("renders with children", () => {
    render(
      <PressScale testID="wrapper">
        <Text testID="child">Press me</Text>
      </PressScale>,
    );
    expect(screen.getByTestId("wrapper")).toBeTruthy();
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("renders with default scale props", () => {
    render(
      <PressScale testID="wrapper">
        <Text>Hello</Text>
      </PressScale>,
    );
    expect(screen.getByTestId("wrapper")).toBeTruthy();
  });

  it("renders with custom scaleTo and duration", () => {
    render(
      <PressScale testID="wrapper" scaleTo={0.95} duration={200}>
        <Text>Custom</Text>
      </PressScale>,
    );
    expect(screen.getByTestId("wrapper")).toBeTruthy();
  });

  it("fires onPressIn when pressed", () => {
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();

    render(
      <PressScale
        testID="wrapper"
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Text>Pressable</Text>
      </PressScale>,
    );

    fireEvent(screen.getByTestId("wrapper"), "pressIn");
    expect(onPressIn).toHaveBeenCalledTimes(1);

    fireEvent(screen.getByTestId("wrapper"), "pressOut");
    expect(onPressOut).toHaveBeenCalledTimes(1);
  });

  it("renders without crashing with only children", () => {
    const { toJSON } = render(
      <PressScale>
        <View />
      </PressScale>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it("renders with className prop", () => {
    render(
      <PressScale testID="wrapper" className="flex-1">
        <Text>Classy</Text>
      </PressScale>,
    );
    expect(screen.getByTestId("wrapper")).toBeTruthy();
  });

  it("fires onPress callback", () => {
    const onPress = jest.fn();
    render(
      <PressScale testID="wrapper" onPress={onPress}>
        <Text>Press</Text>
      </PressScale>,
    );

    fireEvent.press(screen.getByTestId("wrapper"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders multiple children", () => {
    render(
      <PressScale testID="wrapper">
        <Text testID="a">A</Text>
        <Text testID="b">B</Text>
      </PressScale>,
    );
    expect(screen.getByTestId("a")).toBeTruthy();
    expect(screen.getByTestId("b")).toBeTruthy();
  });
});
