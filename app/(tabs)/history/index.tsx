import { ErrorBoundary } from "../../../src/shared/ui/ErrorBoundary";
import { HistoryListScreen } from "../../../src/features/history/screens/HistoryListScreen";

export default function HistoryRoute() {
  return (
    <ErrorBoundary>
      <HistoryListScreen />
    </ErrorBoundary>
  );
}
