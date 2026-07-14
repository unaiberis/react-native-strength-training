import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { ExerciseListScreen } from "@/features/exercises/screens/ExerciseListScreen";

export default function ExerciseListRoute() {
  return (
    <ErrorBoundary>
      <ExerciseListScreen />
    </ErrorBoundary>
  );
}
