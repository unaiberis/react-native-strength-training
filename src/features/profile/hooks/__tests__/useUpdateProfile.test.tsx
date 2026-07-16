import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useUpdateProfile } from "../useUpdateProfile";

const mockUpdateProfile = jest.fn();
jest.mock("@/lib/pocketbase/users", () => ({
  updateProfile: (...args: any[]) => mockUpdateProfile(...args),
}));

const mockRouterBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: mockRouterBack,
  }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useUpdateProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { id: "u1", email: "a@b.com" } as any,
      isOnline: true,
    });
  });

  it("calls updateProfile, refreshes the store, invalidates, and navigates back on success", async () => {
    const updated = { id: "u1", displayName: "Jane", email: "a@b.com" };
    mockUpdateProfile.mockResolvedValue(updated);

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ displayName: "Jane" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdateProfile).toHaveBeenCalledWith("u1", {
      displayName: "Jane",
    });
    expect(useAuthStore.getState().user).toEqual(updated);
    expect(mockRouterBack).toHaveBeenCalled();
  });

  it("throws when offline and never calls updateProfile", async () => {
    useAuthStore.setState({ isOnline: false });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ displayName: "Jane" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it("propagates service errors without refreshing the store or navigating", async () => {
    mockUpdateProfile.mockRejectedValue(new Error("nope"));

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    const before = useAuthStore.getState().user;
    result.current.mutate({ displayName: "Jane" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useAuthStore.getState().user).toBe(before);
    expect(mockRouterBack).not.toHaveBeenCalled();
  });
});
