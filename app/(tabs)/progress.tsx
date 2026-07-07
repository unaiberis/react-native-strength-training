import { ErrorBoundary } from "../../src/shared/ui/ErrorBoundary";
import { ProgressScreen } from "../../src/features/records/screens/ProgressScreen";

export default function ProgressRoute() {
  return (
    <ErrorBoundary>
      <ProgressScreen />
    </ErrorBoundary>
  );
}
