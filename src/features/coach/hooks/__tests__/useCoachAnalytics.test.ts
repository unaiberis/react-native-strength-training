import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock the service
const mockGetVolumeHistory = jest.fn();
const mockGetComplianceHistory = jest.fn();
const mockGetPREvolution = jest.fn();
jest.mock("@/lib/pocketbase/services/coach-analytics", () => ({
  getVolumeHistory: (...args: any[]) => mockGetVolumeHistory(...args),
  getComplianceHistory: (...args: any[]) => mockGetComplianceHistory(...args),
  getPREvolution: (...args: any[]) => mockGetPREvolution(...args),
}));

import { useCoachAnalytics, useVolumeHistory, useComplianceHistory, usePREvolution } from "../useCoachAnalytics";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("Coach analytics hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useVolumeHistory", () => {
    it("fetches volume data for an athlete", async () => {
      mockGetVolumeHistory.mockResolvedValueOnce([
        { date: "2026-06-01", totalVolumeKg: 5000, sessionCount: 3 },
      ]);

      const { result } = renderHook(() => useVolumeHistory("a1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetVolumeHistory).toHaveBeenCalledWith("a1", 12);
      expect(result.current.data).toHaveLength(1);
    });

    it("returns empty array when no data", async () => {
      mockGetVolumeHistory.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useVolumeHistory("a1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it("disables when athleteId is undefined", () => {
      const { result } = renderHook(() => useVolumeHistory(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe("useComplianceHistory", () => {
    it("fetches compliance data", async () => {
      mockGetComplianceHistory.mockResolvedValueOnce([
        { weekStart: "2026-06-01", assigned: 3, completed: 2, rate: 0.67 },
      ]);

      const { result } = renderHook(() => useComplianceHistory("a1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetComplianceHistory).toHaveBeenCalledWith("a1", 12);
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].rate).toBe(0.67);
    });
  });

  describe("usePREvolution", () => {
    it("fetches PR evolution data", async () => {
      mockGetPREvolution.mockResolvedValueOnce([
        { date: "2026-06-01", value: 120, exerciseName: "Bench Press" },
      ]);

      const { result } = renderHook(() => usePREvolution("a1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetPREvolution).toHaveBeenCalledWith("a1", 24);
      expect(result.current.data).toHaveLength(1);
    });
  });

  describe("useCoachAnalytics", () => {
    it("aggregates all analytics data", async () => {
      mockGetVolumeHistory.mockResolvedValueOnce([]);
      mockGetComplianceHistory.mockResolvedValueOnce([]);
      mockGetPREvolution.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useCoachAnalytics("a1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.volumeData).toEqual([]);
      expect(result.current.complianceData).toEqual([]);
      expect(result.current.prEvolutionData).toEqual([]);
    });
  });
});
