import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { HistoryListScreen } from "@/features/history/screens/HistoryListScreen";

export default function HistoryRoute() {
  return (
    <ErrorBoundary>
      <HistoryListScreen />
    </ErrorBoundary>
  );
}
