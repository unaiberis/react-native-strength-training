import { renderHook } from "@testing-library/react-native";

// ─── Mock Zustand stores ─────────────────────────────────────────────────────

const mockStopRest = jest.fn();
const mockTickRest = jest.fn();
let mockRestTimer = { isRunning: false, remainingSeconds: 90, totalSeconds: 90 };

jest.mock("@/stores/session-store", () => ({
  useSessionStore: jest.fn((selector: any) => {
    const state = {
      restTimer: mockRestTimer,
      tickRest: mockTickRest,
      stopRest: mockStopRest,
    };
    return selector ? selector(state) : state;
  }),
}));

import { useRestTimer, formatRestTime } from "../useRestTimer";

describe("useRestTimer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockRestTimer = { isRunning: false, remainingSeconds: 90, totalSeconds: 90 };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns initial timer state when not running", () => {
    const { result } = renderHook(() => useRestTimer());

    expect(result.current.remainingSeconds).toBe(90);
    expect(result.current.totalSeconds).toBe(90);
    expect(result.current.isRunning).toBe(false);
  });

  it("does not set interval when timer is not running", () => {
    renderHook(() => useRestTimer());

    expect(mockTickRest).not.toHaveBeenCalled();
  });

  it("sets interval when timer is running", () => {
    mockRestTimer = { isRunning: true, remainingSeconds: 90, totalSeconds: 90 };

    renderHook(() => useRestTimer());

    expect(mockTickRest).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    expect(mockTickRest).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2000);
    expect(mockTickRest).toHaveBeenCalledTimes(3);
  });

  it("clears interval when isRunning changes to false", () => {
    mockRestTimer = { isRunning: true, remainingSeconds: 90, totalSeconds: 90 };

    const { rerender } = renderHook(() => useRestTimer());

    jest.advanceTimersByTime(1000);
    expect(mockTickRest).toHaveBeenCalledTimes(1);

    // Change to not running
    mockRestTimer = { isRunning: false, remainingSeconds: 89, totalSeconds: 90 };
    rerender({});

    jest.advanceTimersByTime(3000);
    // tickRest should NOT have been called again (interval cleared)
    expect(mockTickRest).toHaveBeenCalledTimes(1);
  });

  it("exposes stopRest function", () => {
    const { result } = renderHook(() => useRestTimer());

    result.current.stopRest();
    expect(mockStopRest).toHaveBeenCalled();
  });
});

describe("formatRestTime", () => {
  it("formats seconds into MM:SS", () => {
    expect(formatRestTime(0)).toBe("00:00");
    expect(formatRestTime(90)).toBe("01:30");
    expect(formatRestTime(60)).toBe("01:00");
    expect(formatRestTime(30)).toBe("00:30");
    expect(formatRestTime(3600)).toBe("60:00");
    expect(formatRestTime(5)).toBe("00:05");
  });

  it("pads single digit minutes and seconds", () => {
    expect(formatRestTime(65)).toBe("01:05");
    expect(formatRestTime(7)).toBe("00:07");
    expect(formatRestTime(600)).toBe("10:00");
  });
});
