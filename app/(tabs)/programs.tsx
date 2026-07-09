import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "../../src/shared/ui/Card";
import { Button } from "../../src/shared/ui/Button";
import { ScreenTitle } from "../../src/shared/ui/ScreenTitle";
import { EmptyState } from "../../src/shared/ui/EmptyState";
import { ProgramCard } from "../../src/features/programs/components/ProgramCard";
import { usePrograms } from "../../src/features/programs/hooks/usePrograms";
import { ErrorBoundary } from "../../src/shared/ui/ErrorBoundary";
import { PageSkeleton } from "../../src/shared/ui/SkeletonLoader";
import { GradientBackground } from "../../src/shared/ui/GradientBackground";

export default function ProgramsScreen() {
  const router = useRouter();
  const { currentProgram, upcomingPrograms, isLoading, refetch } = usePrograms();

  if (isLoading) {
    return (
      <ErrorBoundary>
        <GradientBackground>
          <PageSkeleton />
        </GradientBackground>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <GradientBackground>
        <ScrollView
          className="flex-1 px-4 pt-16"
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => refetch()}
              tintColor="#B9B9B6"
            />
          }
        >
          <ScreenTitle title="Programs" className="mb-6" />

          {/* Current/Active Program */}
          {currentProgram ? (
            <View className="mb-6">
              <ProgramCard
                program={currentProgram}
                onPress={() =>
                  router.push(`/programs/program-detail/${currentProgram.id}`)
                }
              />
              <Button
                title="View Full Program"
                variant="secondary"
                icon="document-text-outline"
                onPress={() =>
                  router.push(`/programs/program-detail/${currentProgram.id}`)
                }
              />
            </View>
          ) : (
            <Card className="mb-6">
              <EmptyState
                icon="calendar-outline"
                title="No Program Assigned"
                subtitle="Your coach will assign a program to guide your training."
              />
            </Card>
          )}

          {/* Upcoming Programs */}
          {upcomingPrograms.length > 0 && (
            <View className="mb-6">
              <Text className="text-surface-50 text-lg font-bold mb-3">
                Upcoming
              </Text>
              {upcomingPrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onPress={() =>
                    router.push(`/programs/program-detail/${program.id}`)
                  }
                />
              ))}
            </View>
          )}

          {/* Routines Section */}
          <Card className="mb-4">
            <Text className="text-surface-100 text-lg font-semibold mb-2">
              Workout Routines
            </Text>
            <Text className="text-surface-400 mb-4">
              Create and manage your workout templates with exercises, sets, reps,
              and rest intervals.
            </Text>
            <View className="flex-row gap-3">
              <Button
                title="View Routines"
                variant="secondary"
                className="flex-1"
                onPress={() => router.push("/routines")}
              />
              <Button
                title="Create New"
                variant="primary"
                className="flex-1"
                onPress={() => router.push("/routines/new")}
              />
            </View>
          </Card>
        </ScrollView>
      </GradientBackground>
    </ErrorBoundary>
  );
}
