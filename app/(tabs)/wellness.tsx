import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { WellnessDashboardScreen } from "@/features/wellness/screens/WellnessDashboardScreen";

export default function WellnessRoute() {
  return (
    <ErrorBoundary>
      <WellnessDashboardScreen />
    </ErrorBoundary>
  );
}
