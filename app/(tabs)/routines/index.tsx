import { ErrorBoundary } from "../../../src/shared/ui/ErrorBoundary";
import { RoutineListScreen } from "../../../src/features/routines/screens/RoutineListScreen";

export default function RoutineListRoute() {
  return (
    <ErrorBoundary>
      <RoutineListScreen />
    </ErrorBoundary>
  );
}
