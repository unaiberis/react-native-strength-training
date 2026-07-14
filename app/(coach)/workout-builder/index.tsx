/**
 * Workout Builder — Create new workout template
 */
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { WorkoutBuilderScreen } from "@/features/coach/screens/WorkoutBuilderScreen";

export default function WorkoutBuilderRoute() {
  return (
    <ErrorBoundary>
      <WorkoutBuilderScreen />
    </ErrorBoundary>
  );
}
