import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Text, View } from "react-native";
import { ScreenLayout } from "../ScreenLayout";

describe("ScreenLayout", () => {
  it("renders with children", () => {
    render(
      <ScreenLayout testID="layout">
        <Text testID="child">Hello</Text>
      </ScreenLayout>,
    );
    expect(screen.getByTestId("layout")).toBeTruthy();
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("renders multiple children", () => {
    render(
      <ScreenLayout testID="layout">
        <Text testID="a">A</Text>
        <Text testID="b">B</Text>
        <Text testID="c">C</Text>
      </ScreenLayout>,
    );
    expect(screen.getByTestId("a")).toBeTruthy();
    expect(screen.getByTestId("b")).toBeTruthy();
    expect(screen.getByTestId("c")).toBeTruthy();
  });

  it("renders with custom stagger delay and duration", () => {
    render(
      <ScreenLayout testID="layout" staggerDelay={100} duration={500}>
        <Text testID="child">Staggered</Text>
      </ScreenLayout>,
    );
    expect(screen.getByTestId("layout")).toBeTruthy();
    expect(screen.getByText("Staggered")).toBeTruthy();
  });

  it("filters out null and undefined children", () => {
    render(
      <ScreenLayout testID="layout">
        <Text testID="a">A</Text>
        {null}
        {undefined}
        <Text testID="d">D</Text>
      </ScreenLayout>,
    );
    expect(screen.getByTestId("a")).toBeTruthy();
    expect(screen.getByTestId("d")).toBeTruthy();
  });

  it("renders with no children", () => {
    const { toJSON } = render(<ScreenLayout testID="layout" />);
    const tree = toJSON();
    // Should render the container View without crashing
    expect(tree).toBeTruthy();
  });

  it("forwards View props to the container", () => {
    render(
      <ScreenLayout testID="layout" style={{ padding: 16 }}>
        <Text>Styled</Text>
      </ScreenLayout>,
    );
    expect(screen.getByTestId("layout")).toBeTruthy();
  });

  it("renders React Fragment children correctly", () => {
    render(
      <ScreenLayout testID="layout">
        <>
          <Text testID="frag-a">FragA</Text>
          <Text testID="frag-b">FragB</Text>
        </>
      </ScreenLayout>,
    );
    expect(screen.getByTestId("frag-a")).toBeTruthy();
    expect(screen.getByTestId("frag-b")).toBeTruthy();
  });
});
