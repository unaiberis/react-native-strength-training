import { useLocalSearchParams, useRouter } from "expo-router";
import { WorkoutPreviewScreen } from "../../../../src/features/programs/screens/WorkoutPreviewScreen";

export default function WorkoutPreviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const handleStartWorkout = () => {
    router.push(`/train`);
  };

  return (
    <WorkoutPreviewScreen
      workoutId={id}
      onStartWorkout={handleStartWorkout}
    />
  );
}
