import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock auth store
const mockUserId = "coach-1";
jest.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: any) =>
    selector({ user: { id: mockUserId } }),
}));

// Mock the service
const mockAssignProgram = jest.fn();
const mockUnassignProgram = jest.fn();
const mockUpdateAssignment = jest.fn();
const mockListAssignments = jest.fn();
jest.mock("@/lib/pocketbase/services/program-assignments", () => ({
  assignProgram: (...args: any[]) => mockAssignProgram(...args),
  unassignProgram: (...args: any[]) => mockUnassignProgram(...args),
  updateAssignment: (...args: any[]) => mockUpdateAssignment(...args),
  listAssignments: (...args: any[]) => mockListAssignments(...args),
}));

import { useAssignProgram, useUnassignProgram, useUpdateAssignment, useAssignments } from "../useProgramAssignment";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("Coach program assignment hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useAssignments", () => {
    it("fetches assignments for an athlete", async () => {
      mockListAssignments.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAssignments("a1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockListAssignments).toHaveBeenCalledWith("a1");
    });
  });

  describe("useAssignProgram", () => {
    it("calls assignProgram with coachId from store", async () => {
      mockAssignProgram.mockResolvedValueOnce({ id: "pa-new" });

      const { result } = renderHook(() => useAssignProgram(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        athleteId: "a1",
        templateId: "tmpl-1",
        startedAt: "2026-07-15",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockAssignProgram).toHaveBeenCalledWith(
        expect.objectContaining({
          athleteId: "a1",
          coachId: "coach-1",
          templateId: "tmpl-1",
          startedAt: "2026-07-15",
          assignedAt: expect.any(String),
        }),
      );
    });
  });

  describe("useUnassignProgram", () => {
    it("calls unassignProgram with assignment ID", async () => {
      mockUnassignProgram.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useUnassignProgram(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("pa-1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockUnassignProgram).toHaveBeenCalledWith("pa-1");
    });
  });

  describe("useUpdateAssignment", () => {
    it("calls updateAssignment with correct params", async () => {
      mockUpdateAssignment.mockResolvedValueOnce({ status: "completed" });

      const { result } = renderHook(() => useUpdateAssignment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        assignmentId: "pa-1",
        status: "completed",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockUpdateAssignment).toHaveBeenCalledWith("pa-1", {
        status: "completed",
        startedAt: undefined,
      });
    });
  });
});
