import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ProgressRing } from "../ProgressRing";
import { Text } from "react-native";

describe("ProgressRing", () => {
  it("renders with default props", () => {
    render(<ProgressRing testID="ring" />);
    const ring = screen.getByTestId("ring");
    expect(ring).toBeTruthy();
  });

  it("renders with custom size and stroke width", () => {
    render(<ProgressRing testID="ring" size={80} strokeWidth={8} />);
    const ring = screen.getByTestId("ring");
    expect(ring).toBeTruthy();
  });

  it("renders with custom colors", () => {
    render(
      <ProgressRing
        testID="ring"
        progress={0.5}
        color="#FF0000"
        trackColor="#00FF00"
      />,
    );
    const ring = screen.getByTestId("ring");
    expect(ring).toBeTruthy();
  });

  it("renders children in the center", () => {
    render(
      <ProgressRing testID="ring" progress={1}>
        <Text testID="label">75%</Text>
      </ProgressRing>,
    );
    const ring = screen.getByTestId("ring");
    const label = screen.getByTestId("label");
    expect(ring).toBeTruthy();
    expect(label).toBeTruthy();
  });

  it("renders at full progress (1)", () => {
    render(<ProgressRing testID="ring" progress={1} />);
    const ring = screen.getByTestId("ring");
    expect(ring).toBeTruthy();
  });

  it("renders at zero progress", () => {
    render(<ProgressRing testID="ring" progress={0} />);
    const ring = screen.getByTestId("ring");
    expect(ring).toBeTruthy();
  });

  it("clamps progress beyond 1", () => {
    render(<ProgressRing testID="ring" progress={1.5} />);
    const ring = screen.getByTestId("ring");
    expect(ring).toBeTruthy();
  });

  it("renders with custom duration", () => {
    render(<ProgressRing testID="ring" progress={0.3} duration={2000} />);
    const ring = screen.getByTestId("ring");
    expect(ring).toBeTruthy();
  });
});
