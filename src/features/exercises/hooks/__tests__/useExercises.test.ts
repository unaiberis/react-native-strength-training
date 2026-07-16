import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the service
const mockListExercises = jest.fn();
const mockGetExercise = jest.fn();
const mockSearchExercises = jest.fn();
const mockGetCategories = jest.fn();

jest.mock("@/lib/pocketbase/services/exercises", () => ({
  listExercises: (...args: any[]) => mockListExercises(...args),
  getExercise: (...args: any[]) => mockGetExercise(...args),
  searchExercises: (...args: any[]) => mockSearchExercises(...args),
  getCategories: (...args: any[]) => mockGetCategories(...args),
}));

import { useExercises, useExercise, useExerciseSearch, useCategories } from "../useExercises";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockExercises = [
  { id: "ex-1", name: "Bench Press", category: "strength" },
  { id: "ex-2", name: "Squat", category: "strength" },
  { id: "ex-3", name: "Pull Up", category: "bodyweight" },
];

describe("useExercises", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches exercises with default pagination", async () => {
    mockListExercises.mockResolvedValueOnce({ data: mockExercises, count: 3 });

    const { result } = renderHook(() => useExercises(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListExercises).toHaveBeenCalledWith(undefined, 0, 20);
    expect(result.current.data?.data).toHaveLength(3);
  });

  it("passes category filter to service", async () => {
    mockListExercises.mockResolvedValueOnce({
      data: [mockExercises[0]],
      count: 1,
    });

    const { result } = renderHook(() => useExercises("strength"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListExercises).toHaveBeenCalledWith("strength", 0, 20);
    expect(result.current.data?.data).toHaveLength(1);
  });

  it("passes page and pageSize correctly", async () => {
    mockListExercises.mockResolvedValueOnce({
      data: [mockExercises[0]],
      count: 1,
    });

    const { result } = renderHook(() => useExercises(null, 2, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListExercises).toHaveBeenCalledWith(null, 2, 10);
  });

  it("handles empty result", async () => {
    mockListExercises.mockResolvedValueOnce({ data: [], count: 0 });

    const { result } = renderHook(() => useExercises(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toEqual([]);
    expect(result.current.data?.count).toBe(0);
  });

  it("handles service error", async () => {
    mockListExercises.mockRejectedValueOnce(new Error("Fetch failed"));

    const { result } = renderHook(() => useExercises(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe("useExercise", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches single exercise by id", async () => {
    mockGetExercise.mockResolvedValueOnce(mockExercises[0]);

    const { result } = renderHook(() => useExercise("ex-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetExercise).toHaveBeenCalledWith("ex-1");
    expect(result.current.data?.name).toBe("Bench Press");
  });

  it("is disabled when id is undefined", () => {
    const { result } = renderHook(() => useExercise(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockGetExercise).not.toHaveBeenCalled();
  });

  it("handles exercise not found (null)", async () => {
    mockGetExercise.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useExercise("ex-missing"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });
});

describe("useExerciseSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("is disabled when query is too short", () => {
    const { result } = renderHook(() => useExerciseSearch("a"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockSearchExercises).not.toHaveBeenCalled();
  });

  it("calls searchExercises when query is 2+ chars", async () => {
    mockSearchExercises.mockResolvedValueOnce([mockExercises[0]]);

    const { result } = renderHook(() => useExerciseSearch("be"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSearchExercises).toHaveBeenCalledWith("be");
    expect(result.current.data).toHaveLength(1);
  });

  it("returns empty array when no results", async () => {
    mockSearchExercises.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useExerciseSearch("xyz"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});

describe("useCategories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches categories from service", async () => {
    mockGetCategories.mockResolvedValueOnce(["bodyweight", "strength"]);

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetCategories).toHaveBeenCalled();
    expect(result.current.data).toEqual(["bodyweight", "strength"]);
  });

  it("handles empty categories", async () => {
    mockGetCategories.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});
