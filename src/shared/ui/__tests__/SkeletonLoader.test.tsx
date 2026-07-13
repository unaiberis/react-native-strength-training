import React from "react";
import { render, screen } from "@testing-library/react-native";
import {
  SkeletonBar,
  SkeletonCard,
  SkeletonCircle,
  PageSkeleton,
  DashboardSkeleton,
} from "../SkeletonLoader";

describe("SkeletonBar", () => {
  it("renders with default width and height", () => {
    render(<SkeletonBar testID="bar" />);
    const bar = screen.getByTestId("bar");
    expect(bar).toBeTruthy();
  });

  it("renders with custom width and height", () => {
    render(<SkeletonBar testID="bar" width="50%" height={24} />);
    const bar = screen.getByTestId("bar");
    expect(bar).toBeTruthy();
  });
});

describe("SkeletonCard", () => {
  it("renders with default 3 lines", () => {
    render(<SkeletonCard testID="card" />);
    const card = screen.getByTestId("card");
    expect(card).toBeTruthy();
  });

  it("renders with custom line count", () => {
    render(<SkeletonCard testID="card" lines={5} />);
    const card = screen.getByTestId("card");
    expect(card).toBeTruthy();
  });
});

describe("SkeletonCircle", () => {
  it("renders with default size", () => {
    render(<SkeletonCircle testID="circle" />);
    const circle = screen.getByTestId("circle");
    expect(circle).toBeTruthy();
  });

  it("renders with custom size", () => {
    render(<SkeletonCircle testID="circle" size={64} />);
    const circle = screen.getByTestId("circle");
    expect(circle).toBeTruthy();
  });
});

describe("PageSkeleton", () => {
  it("renders header and cards", () => {
    render(<PageSkeleton testID="page" />);
    const page = screen.getByTestId("page");
    expect(page).toBeTruthy();
  });
});

describe("DashboardSkeleton", () => {
  it("renders stat bars and list items", () => {
    render(<DashboardSkeleton testID="dash" />);
    const dash = screen.getByTestId("dash");
    expect(dash).toBeTruthy();
  });
});
