import { useLocalSearchParams } from 'expo-router';
import { ActiveWorkoutScreen } from '../../src/features/workout/screens/ActiveWorkoutScreen';
import { WorkoutCompleteScreen } from '../../src/features/workout/screens/WorkoutCompleteScreen';

/**
 * Active workout route.
 *
 * When `?completed=true` is in the URL, renders the workout complete summary.
 * Otherwise renders the active workout interface.
 *
 * This route sits in the `(workout)` stack group and presents full-screen
 * (no tab bar, no header).
 */
export default function WorkoutRoute() {
  const { completed } = useLocalSearchParams<{ completed?: string }>();

  if (completed === 'true') {
    return <WorkoutCompleteScreen />;
  }

  return <ActiveWorkoutScreen />;
}
