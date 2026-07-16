import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { PRCelebrationScreen } from "@/features/records/screens/PRCelebrationScreen";

/**
 * PR Celebration route — shown as full-screen overlay when user hits a new PR.
 */
export default function PRCelebrationRoute() {
  return (
    <ErrorBoundary>
      <PRCelebrationScreen />
    </ErrorBoundary>
  );
}
