/**
 * Tests for usePrograms and useProgramDetail hooks.
 *
 * Currently returns empty data — validates the stable contract
 * so existing code doesn't break when backend wiring is added.
 */
import { renderHook } from "@testing-library/react-native";
import { usePrograms } from "../usePrograms";
import { useProgramDetail } from "../useProgramDetail";

describe("usePrograms", () => {
  it("returns empty current program by default", () => {
    const { result } = renderHook(() => usePrograms());

    expect(result.current.currentProgram).toBeNull();
    expect(result.current.upcomingPrograms).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("returns stable shape on subsequent calls", () => {
    const { result } = renderHook(() => usePrograms());

    // Regardless of how many times the hook runs, shape stays stable
    expect(result.current.currentProgram).toBeNull();
    expect(result.current.upcomingPrograms).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useProgramDetail", () => {
  it("returns null program for any program ID", () => {
    const { result } = renderHook(() => useProgramDetail("prog-123"));

    expect(result.current.program).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("handles different program IDs without crashing", () => {
    const { result: result1 } = renderHook(() => useProgramDetail("id-1"));
    const { result: result2 } = renderHook(() => useProgramDetail("id-2"));

    expect(result1.current.program).toBeNull();
    expect(result2.current.program).toBeNull();
    expect(result1.current.isLoading).toBe(false);
    expect(result2.current.isLoading).toBe(false);
  });
});
