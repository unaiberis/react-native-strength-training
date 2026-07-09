import { View, Text, ScrollView } from "react-native";
import { ScreenTitle } from "../../../shared/ui/ScreenTitle";
import { KickerLabel } from "../../../shared/ui/KickerLabel";
import { PhaseCard } from "../components/PhaseCard";
import { useProgramDetail } from "../hooks/useProgramDetail";
import { ErrorBoundary } from "../../../shared/ui/ErrorBoundary";
import { GradientBackground } from "../../../shared/ui/GradientBackground";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ProgramDetailScreenProps {
  programId: string;
  onWorkoutPress?: (workoutId: string) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Program detail screen showing program info, progress bar,
 * and expandable phase list with workouts.
 */
export function ProgramDetailScreen({
  programId,
  onWorkoutPress,
}: ProgramDetailScreenProps) {
  const { program, isLoading } = useProgramDetail(programId);

  return (
    <ErrorBoundary>
      <GradientBackground>
        <ScrollView className="flex-1 px-4 pt-6">
          {isLoading ? (
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-surface-400">Loading program...</Text>
            </View>
          ) : !program ? (
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-surface-400">Program not found.</Text>
            </View>
          ) : (
            <>
              {/* Title */}
              <ScreenTitle title={program.name} className="mb-6" />

              {/* Description */}
              {program.description ? (
                <Text className="text-surface-400 text-sm mb-6 leading-5">
                  {program.description}
                </Text>
              ) : null}

              {/* Progress section */}
              <View className="bg-card rounded-xl p-4 border border-border mb-6">
                <KickerLabel className="mb-2">Progress</KickerLabel>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-surface-50 text-[28px] font-extrabold">
                    {program.progressPercent}%
                  </Text>
                  <Text className="text-surface-400 text-sm">
                    Week {program.weeksCompleted} of {program.totalWeeks}
                  </Text>
                </View>
                <View className="h-2.5 bg-graphite rounded-full overflow-hidden">
                  <View
                    className="h-full bg-titanium rounded-full"
                    style={{ width: `${program.progressPercent}%` }}
                  />
                </View>
                <Text className="text-surface-500 text-xs mt-2">
                  {formatDateRange(program.startDate, program.endDate)}
                </Text>
              </View>

              {/* Phases */}
              {program.phases.length > 0 ? (
                <View className="mb-6">
                  <KickerLabel className="mb-3">Phases</KickerLabel>
                  {program.phases.map((phase, idx) => (
                    <PhaseCard
                      key={phase.id}
                      phase={phase}
                      isActive={idx === 0}
                      onWorkoutPress={onWorkoutPress}
                    />
                  ))}
                </View>
              ) : (
                <View className="bg-cardSoft rounded-xl p-6 border border-border items-center mb-6">
                  <Text className="text-surface-500 text-sm italic text-center">
                    Program phases and workouts will appear once your coach
                    assigns workouts.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </GradientBackground>
    </ErrorBoundary>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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
