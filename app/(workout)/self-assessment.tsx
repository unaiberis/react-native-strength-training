import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { SelfAssessmentScreen } from "@/features/workout/screens/SelfAssessmentScreen";

/**
 * Self-assessment route within the (workout) stack group.
 *
 * Renders the post-workout wellness survey with RPE, sleep, fatigue,
 * soreness, and mood questions. After saving, navigates to the
 * Assessment Results screen for trend comparison.
 */
export default function SelfAssessmentRoute() {
  return (
    <ErrorBoundary>
      <SelfAssessmentScreen />
    </ErrorBoundary>
  );
}
