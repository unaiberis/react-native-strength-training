import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text } from "react-native";
import { useLingui } from "@lingui/react/macro";

export type TimerMode = "countdown" | "interval";

interface BlockTimerProps {
  /** Total duration in seconds (for countdown mode) */
  totalSeconds: number;
  /** Timer mode: countdown (AMRAP) or interval (EMOM) */
  mode: TimerMode;
  /** Interval in seconds between rounds (for EMOM — default 120) */
  intervalSeconds?: number;
  /** Called when countdown reaches 0 */
  onTimeUp?: () => void;
  /** Called at each interval tick (for EMOM beeps) */
  onIntervalTick?: (round: number) => void;
  /** Whether the timer is running */
  running: boolean;
  /** Optional label override */
  label?: string;
  /** Round counter to display (EMOM/Circuit) */
  currentRound?: number;
}

/**
 * BlockTimer component for AMRAP/EMOM workout blocks.
 *
 * AMRAP: Full countdown from `totalSeconds` to 0.
 * EMOM: Shows current interval countdown, ticks at each interval boundary.
 */
export function BlockTimer({
  totalSeconds,
  mode,
  intervalSeconds = 120,
  onTimeUp,
  onIntervalTick,
  running,
  label,
  currentRound,
}: BlockTimerProps) {
  const { t } = useLingui();
  const [remaining, setRemaining] = useState(totalSeconds);
  const [intervalRemaining, setIntervalRemaining] = useState(intervalSeconds);
  const [intervalNumber, setIntervalNumber] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when total changes
  useEffect(() => {
    setRemaining(totalSeconds);
    setIntervalRemaining(intervalSeconds);
    setIntervalNumber(1);
  }, [totalSeconds, intervalSeconds]);

  const tick = useCallback(() => {
    setRemaining((prev) => {
      if (prev <= 1) {
        onTimeUp?.();
        return 0;
      }
      return prev - 1;
    });

    if (mode === "interval") {
      setIntervalRemaining((prev) => {
        if (prev <= 1) {
          const nextInterval = intervalNumber + 1;
          setIntervalNumber(nextInterval);
          onIntervalTick?.(nextInterval);
          return intervalSeconds;
        }
        return prev - 1;
      });
    }
  }, [mode, intervalSeconds, intervalNumber, onTimeUp, onIntervalTick]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, tick]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const displayTime = mode === "interval" ? intervalRemaining : remaining;
  const isTimeUp = remaining <= 0;

  return (
    <View className="bg-card rounded-2xl border border-border p-4 items-center mb-4">
      {label && (
        <Text className="text-surface-400 text-xs font-semibold uppercase tracking-wider mb-1">
          {label}
        </Text>
      )}

      <Text
        className={`text-5xl font-extrabold tracking-widest ${
          isTimeUp ? "text-danger" : remaining <= 10 ? "text-[#D65F5F]" : "text-surface-50"
        }`}
      >
        {formatTime(displayTime)}
      </Text>

      {mode === "countdown" && (
        <Text className="text-surface-500 text-xs mt-1">
          {t`Total: ${formatTime(remaining)}`}
        </Text>
      )}

      {mode === "interval" && (
        <Text className="text-surface-500 text-xs mt-1">
          {t`Interval ${intervalNumber}`}
        </Text>
      )}

      {currentRound != null && (
        <View className="mt-2 bg-surface-800 rounded-full px-4 py-1">
          <Text className="text-surface-100 text-sm font-bold">
            {mode === "countdown" ? t`Round ${currentRound}` : t`Round ${currentRound}`}
          </Text>
        </View>
      )}

      {isTimeUp && (
        <View className="mt-2 bg-danger/20 rounded-lg px-3 py-1">
          <Text className="text-danger text-sm font-bold">{t`TIME`}</Text>
        </View>
      )}
    </View>
  );
}
