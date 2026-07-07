import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text } from "react-native";
import type { BlockType } from "@/types/pocketbase";

interface BlockTimerProps {
  /** Type of block timer */
  blockType: BlockType;
  /** Total minutes for the timer */
  minutes: number;
  /** Called when time runs out */
  onTimeUp: () => void;
  /** Whether the timer is paused */
  paused?: boolean;
}

/**
 * Displays a countdown (AMRAP) or interval (EMOM) timer.
 *
 * AMRAP: continuous countdown from minutes to 0.
 * EMOM: interval timer that resets each minute.
 * Straight Set / Circuit: no timer display (returns null).
 */
export function BlockTimer({
  blockType,
  minutes,
  onTimeUp,
  paused = false,
}: BlockTimerProps) {
  const totalSeconds = minutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  // Reset timer when minutes or blockType changes
  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds, blockType]);

  // Timer tick
  useEffect(() => {
    if (blockType !== "amrap" || paused || remaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Defer to avoid setState during render
          setTimeout(() => onTimeUpRef.current(), 0);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [blockType, paused, remaining <= 0]);

  // Only AMRAP and EMOM show timers
  if (blockType !== "amrap" && blockType !== "emom") {
    return null;
  }

  const minutes_left = Math.floor(remaining / 60);
  const seconds_left = remaining % 60;
  const timeStr = `${minutes_left}:${String(seconds_left).padStart(2, "0")}`;
  const isUrgent = remaining <= 30 && remaining > 0;

  return (
    <View className="items-center py-4">
      <Text className="text-surface-400 text-xs font-semibold uppercase tracking-wider mb-1">
        {blockType === "amrap" ? "AMRAP" : "EMOM"}
      </Text>
      <Text
        className={`text-4xl font-bold ${isUrgent ? "text-danger" : "text-surface-50"}`}
      >
        {timeStr}
      </Text>
      {remaining <= 0 && (
        <Text className="text-surface-400 text-sm mt-1">Time\u2019s up!</Text>
      )}
    </View>
  );
}
