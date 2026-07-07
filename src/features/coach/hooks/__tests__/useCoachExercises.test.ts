import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock auth store
jest.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: any) =>
    selector({ user: { id: "coach-1" } }),
}));

// Mock the service
const mockCreateExercise = jest.fn();
const mockUpdateExercise = jest.fn();
const mockArchiveExercise = jest.fn();
const mockUnarchiveExercise = jest.fn();
const mockListExercises = jest.fn();
const mockGetExercise = jest.fn();
jest.mock("@/lib/pocketbase/services/exercises", () => ({
  createExercise: (...args: any[]) => mockCreateExercise(...args),
  updateExercise: (...args: any[]) => mockUpdateExercise(...args),
  archiveExercise: (...args: any[]) => mockArchiveExercise(...args),
  unarchiveExercise: (...args: any[]) => mockUnarchiveExercise(...args),
  listExercises: (...args: any[]) => mockListExercises(...args),
  getExercise: (...args: any[]) => mockGetExercise(...args),
  getCategories: jest.fn().mockResolvedValue([]),
}));

import {
  useCoachExercises,
  useCoachExercise,
  useCreateExercise,
  useUpdateExercise,
  useArchiveExercise,
  useUnarchiveExercise,
} from "../useCoachExercises";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("Coach exercise hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useCoachExercises", () => {
    it("fetches exercise list", async () => {
      mockListExercises.mockResolvedValueOnce({ data: [], count: 0 });

      const { result } = renderHook(() => useCoachExercises(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Default category is undefined (not null) when not provided
      expect(mockListExercises).toHaveBeenCalledWith(undefined, 0, 50);
    });
  });

  describe("useCoachExercise", () => {
    it("fetches a single exercise", async () => {
      mockGetExercise.mockResolvedValueOnce({ id: "ex-1", name: "Bench Press" });

      const { result } = renderHook(() => useCoachExercise("ex-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetExercise).toHaveBeenCalledWith("ex-1");
    });

    it("disables query when id is undefined", async () => {
      const { result } = renderHook(() => useCoachExercise(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe("useCreateExercise", () => {
    it("calls createExercise with coach ID", async () => {
      mockCreateExercise.mockResolvedValueOnce({ id: "ex-new" });

      const { result } = renderHook(() => useCreateExercise(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        name: "New Exercise",
        category: "Strength",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockCreateExercise).toHaveBeenCalledWith(
        { name: "New Exercise", category: "Strength" },
        "coach-1",
      );
    });
  });

  describe("useUpdateExercise", () => {
    it("calls updateExercise with id and input", async () => {
      mockUpdateExercise.mockResolvedValueOnce({ id: "ex-1", name: "Updated" });

      const { result } = renderHook(() => useUpdateExercise(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: "ex-1", name: "Updated" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockUpdateExercise).toHaveBeenCalledWith("ex-1", { name: "Updated" });
    });
  });

  describe("useArchiveExercise", () => {
    it("calls archiveExercise with id", async () => {
      mockArchiveExercise.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useArchiveExercise(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("ex-1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockArchiveExercise).toHaveBeenCalledWith("ex-1");
    });
  });

  describe("useUnarchiveExercise", () => {
    it("calls unarchiveExercise with id", async () => {
      mockUnarchiveExercise.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useUnarchiveExercise(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("ex-1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockUnarchiveExercise).toHaveBeenCalledWith("ex-1");
    });
  });
});
