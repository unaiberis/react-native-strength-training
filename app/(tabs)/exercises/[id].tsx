import { ErrorBoundary } from "../../../src/shared/ui/ErrorBoundary";
import { ExerciseDetailScreen } from "../../../src/features/exercises/screens/ExerciseDetailScreen";

export default function ExerciseDetailRoute() {
  return (
    <ErrorBoundary>
      <ExerciseDetailScreen />
    </ErrorBoundary>
  );
}
