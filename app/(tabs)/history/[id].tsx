import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { HistoryDetailScreen } from "@/features/history/screens/HistoryDetailScreen";

export default function HistoryDetailRoute() {
  return (
    <ErrorBoundary>
      <HistoryDetailScreen />
    </ErrorBoundary>
  );
}
