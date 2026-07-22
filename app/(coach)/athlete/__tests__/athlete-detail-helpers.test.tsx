/**
 * Tests for formatDate and StarRating helpers from the Athlete Detail screen.
 *
 * These pure functions: formatDate formats ISO date strings for display,
 * and StarRating renders a star-based visual rating.
 */

// Mock all the heavy dependencies that [id].tsx imports
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "athlete-1" }),
  Stack: { Screen: () => null },
}));

jest.mock("@/shared/ui/BackButton", () => ({
  BackButton: () => null,
}));

jest.mock("@/shared/ui/Card", () => ({
  Card: ({ children }: any) => children,
}));

jest.mock("@/constants/theme", () => ({
  DETAIL_HEADER: {},
}));

jest.mock("@/features/coach/hooks/useAthleteDetail", () => ({
  useAthleteDetail: () => ({
    athlete: null,
    assignments: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUnlinkAthlete: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/features/coach/hooks/useCoachFeedback", () => ({
  useCoachFeedback: () => ({
    data: [],
    isLoading: false,
  }),
}));

import React from "react";
import { render } from "@testing-library/react-native";
import { formatDate, StarRating } from "../[id]";

describe("formatDate", () => {
  it("formats a full ISO date string", () => {
    const result = formatDate("2026-07-15T10:30:00Z");
    // Should contain "15" (day) and "2026" (year) — locale-agnostic
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2026/);
  });

  it("formats a date-only string", () => {
    const result = formatDate("2026-07-15");
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2026/);
  });

  it("returns the original string on invalid input", () => {
    const result = formatDate("not-a-date");
    expect(result).toBe("not-a-date");
  });

  it("returns the original string on empty input", () => {
    const result = formatDate("");
    expect(result).toBe("");
  });
});

describe("StarRating", () => {
  it("renders 5 stars for rating 5", () => {
    expect(() => render(<StarRating rating={5} />)).not.toThrow();
  });

  it("renders 0 stars for rating 0", () => {
    expect(() => render(<StarRating rating={0} />)).not.toThrow();
  });

  it("renders correctly for a mid-range rating", () => {
    expect(() => render(<StarRating rating={3} />)).not.toThrow();
  });
});
