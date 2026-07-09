import { View, Text, TouchableOpacity } from "react-native";
import { Card } from "../../../shared/ui/Card";
import { Badge } from "../../../shared/ui/Badge";
import type { ProgramSummary } from "../program-types";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ProgramCardProps {
  program: ProgramSummary;
  onPress?: () => void;
}

// ─── Status Badge Mapping ───────────────────────────────────────────────────

const statusConfig: Record<
  ProgramSummary["status"],
  { label: string; variant: "success" | "default" | "warning" }
> = {
  active: { label: "Active", variant: "success" },
  completed: { label: "Completed", variant: "default" },
  upcoming: { label: "Upcoming", variant: "warning" },
};

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Card showing a program summary — name, date range, progress bar,
 * weeks progress, and status badge. Tappable to navigate to detail.
 */
export function ProgramCard({ program, onPress }: ProgramCardProps) {
  const status = statusConfig[program.status];

  return (
    <Card onPress={onPress} className="mb-4">
      {/* Header row: name + badge */}
      <View className="flex-row items-start justify-between mb-3">
        <Text className="text-surface-50 text-[17px] font-bold flex-1 mr-3">
          {program.name}
        </Text>
        <Badge label={status.label} variant={status.variant} />
      </View>

      {/* Description */}
      {program.description ? (
        <Text className="text-surface-400 text-sm mb-3" numberOfLines={2}>
          {program.description}
        </Text>
      ) : null}

      {/* Date range */}
      <Text className="text-surface-400 text-xs mb-4">
        {formatDateRange(program.startDate, program.endDate)}
      </Text>

      {/* Progress bar */}
      <View className="h-2 bg-graphite rounded-full mb-2 overflow-hidden">
        <View
          className="h-full bg-titanium rounded-full"
          style={{ width: `${program.progressPercent}%` }}
        />
      </View>

      {/* Week progress text */}
      <View className="flex-row items-center justify-between">
        <Text className="text-surface-400 text-xs font-medium">
          Week {program.weeksCompleted} of {program.totalWeeks}
        </Text>
        <Text className="text-surface-500 text-xs">
          {program.progressPercent}%
        </Text>
      </View>
    </Card>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format a date range string like "Jul 7 — Aug 25, 2026".
 */
function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const fmt: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const startStr = startDate.toLocaleDateString("en-US", fmt);
  const endStr = endDate.toLocaleDateString("en-US", {
    ...fmt,
    year:
      startDate.getFullYear() !== endDate.getFullYear()
        ? "numeric"
        : undefined,
  });

  if (startDate.getFullYear() !== endDate.getFullYear()) {
    const startFull = startDate.toLocaleDateString("en-US", {
      ...fmt,
      year: "numeric",
    });
    return `${startFull} — ${endStr}`;
  }

  return `${startStr} — ${endStr}`;
}
