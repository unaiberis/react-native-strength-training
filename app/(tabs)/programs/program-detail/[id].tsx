import { useLocalSearchParams, useRouter } from "expo-router";
import { ProgramDetailScreen } from "../../../../src/features/programs/screens/ProgramDetailScreen";

export default function ProgramDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const handleWorkoutPress = (workoutId: string) => {
    router.push(`/programs/workout-preview/${workoutId}`);
  };

  return (
    <ProgramDetailScreen
      programId={id}
      onWorkoutPress={handleWorkoutPress}
    />
  );
}
