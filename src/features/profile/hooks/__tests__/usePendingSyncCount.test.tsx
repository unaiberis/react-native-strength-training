// Mock expo-sqlite before any imports (needed by database.ts via dynamic import)
const mockGetAllAsync = jest.fn();

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    getAllAsync: mockGetAllAsync,
    execAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    closeAsync: jest.fn(),
  }),
}));

import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePendingSyncCount } from "../usePendingSyncCount";
import { resetDb } from "@/lib/db/database";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("usePendingSyncCount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDb();
  });

  it("returns zero counts when change queue is empty", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const { result } = renderHook(() => usePendingSyncCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      pending: 0,
      deadLetters: 0,
      authErrors: 0,
      hasPending: false,
    });
  });

  it("returns pending count from change queue", async () => {
    mockGetAllAsync.mockResolvedValue([
      { status: "pending", count: 3 },
    ]);

    const { result } = renderHook(() => usePendingSyncCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      pending: 3,
      deadLetters: 0,
      authErrors: 0,
      hasPending: true,
    });
  });

  it("returns counts for all error statuses", async () => {
    mockGetAllAsync.mockResolvedValue([
      { status: "pending", count: 5 },
      { status: "dead_letter", count: 2 },
      { status: "auth_error", count: 1 },
    ]);

    const { result } = renderHook(() => usePendingSyncCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      pending: 5,
      deadLetters: 2,
      authErrors: 1,
      hasPending: true,
    });
  });

  it("sets hasPending to false when only in_flight entries exist", async () => {
    mockGetAllAsync.mockResolvedValue([
      { status: "in_flight", count: 2 },
    ]);

    const { result } = renderHook(() => usePendingSyncCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.hasPending).toBe(false);
  });

  it("handles DB query error gracefully", async () => {
    mockGetAllAsync.mockRejectedValue(new Error("DB connection failed"));

    const { result } = renderHook(() => usePendingSyncCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
