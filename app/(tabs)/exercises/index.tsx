import { ErrorBoundary } from "../../../src/shared/ui/ErrorBoundary";
import { ExerciseListScreen } from "../../../src/features/exercises/screens/ExerciseListScreen";

export default function ExerciseListRoute() {
  return (
    <ErrorBoundary>
      <ExerciseListScreen />
    </ErrorBoundary>
  );
}
