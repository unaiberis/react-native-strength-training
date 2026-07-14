import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { ExerciseDetailScreen } from "@/features/exercises/screens/ExerciseDetailScreen";

export default function ExerciseDetailRoute() {
  return (
    <ErrorBoundary>
      <ExerciseDetailScreen />
    </ErrorBoundary>
  );
}
