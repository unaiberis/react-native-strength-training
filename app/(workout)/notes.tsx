import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { NotesScreen } from "@/features/workout/screens/NotesScreen";

/**
 * Notes route within the (workout) stack group.
 *
 * Full-screen notes editor for an exercise or session.
 * Receives mode, exerciseId, exerciseName via search params.
 */
export default function NotesRoute() {
  return (
    <ErrorBoundary>
      <NotesScreen />
    </ErrorBoundary>
  );
}
