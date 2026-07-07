import { ErrorBoundary } from "../../../src/shared/ui/ErrorBoundary";
import { HistoryDetailScreen } from "../../../src/features/history/screens/HistoryDetailScreen";

export default function HistoryDetailRoute() {
  return (
    <ErrorBoundary>
      <HistoryDetailScreen />
    </ErrorBoundary>
  );
}
