import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { t } from "@lingui/core/macro";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { GradientBackground } from "@/shared/ui/GradientBackground";
import { EmptyState } from "@/shared/ui/EmptyState";
import {
  useAthleteAssignments,
  findAssignedToday,
} from "@/features/athlete-assignments/hooks/useAthleteAssignments";

export default function TrainScreen() {
  const router = useRouter();
  const { currentProgram, upcomingPrograms, isLoading } =
    useAthleteAssignments();
  const assignedToday = findAssignedToday([currentProgram, ...upcomingPrograms]);

  const handleStartWorkout = useCallback(() => {
    if (!assignedToday) return;
    router.push({
      pathname: "/(workout)/active",
      params: { mode: "assignment", assignmentId: assignedToday.id },
    });
  }, [router, assignedToday]);

  return (
    <ErrorBoundary>
      <GradientBackground>
        <ScrollView className="flex-1 px-4 pt-16">
          <Text className="text-surface-50 text-[34px] font-black tracking-[-0.8] mb-6">
            {t`Train`}
          </Text>

          {isLoading && (
            <View className="items-center pt-8">
              <ActivityIndicator size="large" color="#B9B9B6" />
            </View>
          )}

          {!isLoading && !assignedToday && (
            <EmptyState
              icon="barbell-outline"
              title={t`No training scheduled for today`}
              subtitle={t`Your coach will assign training for today's workout. Check back later or view your calendar for upcoming sessions.`}
            />
          )}

          {!isLoading && assignedToday && (
            <Card className="mb-4">
              <View className="flex-row items-center gap-3 mb-3">
                <View className="w-10 h-10 rounded-full bg-graphite items-center justify-center">
                  <Ionicons name="barbell-outline" size={20} color="#B9B9B6" />
                </View>
                <View className="flex-1">
                  <Text className="text-surface-50 text-lg font-semibold">
                    {assignedToday.name}
                  </Text>
                  <Text className="text-surface-400 text-sm">
                    {t`Today's Assigned Workout`}
                  </Text>
                </View>
              </View>
              <Button
                title={t`Start Workout`}
                variant="primary"
                onPress={handleStartWorkout}
              />
            </Card>
          )}
        </ScrollView>
      </GradientBackground>
    </ErrorBoundary>
  );
}
