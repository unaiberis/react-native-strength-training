import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { ExerciseTimelineScreen } from "@/features/analytics/screens/ExerciseTimelineScreen";

export default function ExerciseTimelineRoute() {
  return (
    <ErrorBoundary>
      <ExerciseTimelineScreen />
    </ErrorBoundary>
  );
}
