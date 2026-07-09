import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { AssessmentResultsScreen } from "@/features/workout/screens/AssessmentResultsScreen";

/**
 * Assessment Results route within the (workout) stack group.
 *
 * Shows the user's self-assessment values compared against their
 * rolling 7-day average with trend indicators. Navigated to
 * automatically after completing the self-assessment survey.
 */
export default function AssessmentResultsRoute() {
  return (
    <ErrorBoundary>
      <AssessmentResultsScreen />
    </ErrorBoundary>
  );
}
