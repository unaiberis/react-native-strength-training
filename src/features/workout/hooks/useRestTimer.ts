import { useEffect, useRef } from "react";
import { useSessionStore } from "../../../stores/session-store";

/**
 * Rest timer hook.
 *
 * Drives the countdown by calling `tickRest()` every second while the
 * timer is running. Returns the current timer state so UI components can
 * display remaining time.
 *
 * Usage:
 * ```tsx
 * const { remainingSeconds, totalSeconds, isRunning, stopRest } = useRestTimer();
 * ```
 */
export function useRestTimer() {
  const restTimer = useSessionStore((s) => s.restTimer);
  const tickRest = useSessionStore((s) => s.tickRest);
  const stopRest = useSessionStore((s) => s.stopRest);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (restTimer.isRunning) {
      intervalRef.current = setInterval(() => {
        tickRest();
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [restTimer.isRunning, tickRest]);

  return {
    remainingSeconds: restTimer.remainingSeconds,
    totalSeconds: restTimer.totalSeconds,
    isRunning: restTimer.isRunning,
    stopRest,
  };
}

/**
 * Format seconds into MM:SS display string.
 */
export function formatRestTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
