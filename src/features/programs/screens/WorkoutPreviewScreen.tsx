import { View, Text } from "react-native";
import {
  WorkoutPreview,
  type WorkoutPreviewData,
} from "../components/WorkoutPreview";
import { ScreenTitle } from "../../../shared/ui/ScreenTitle";
import { ErrorBoundary } from "../../../shared/ui/ErrorBoundary";
import { GradientBackground } from "../../../shared/ui/GradientBackground";

// ─── Types ─────────────────────────────────────────────────────────────────

interface WorkoutPreviewScreenProps {
  workoutId: string;
  onStartWorkout?: () => void;
}

// ─── Placeholder View ──────────────────────────────────────────────────────

/**
 * Placeholder shown when the workout data hasn't been loaded yet.
 */
function PlaceholderView() {
  return (
    <ErrorBoundary>
      <GradientBackground>
        <View className="flex-1 px-4 pt-6">
          <ScreenTitle title="Workout Preview" className="mb-6" />
          <View className="flex-1 items-center justify-center">
            <Text className="text-surface-500 text-sm italic text-center">
              Workout details will appear here once the program is fully loaded.
            </Text>
          </View>
        </View>
      </GradientBackground>
    </ErrorBoundary>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Screen showing a read-only preview of a workout template.
 * Displays blocks, exercises, sets/reps/prescription, with a "Start Workout" button.
 *
 * For now shows a placeholder — ready for when the workout preview
 * backend is wired with template data.
 */
export function WorkoutPreviewScreen({
  workoutId: _workoutId,
  onStartWorkout,
}: WorkoutPreviewScreenProps) {
  // TODO: Fetch workout template data by workoutId
  //   const { data: template } = useTemplate(workoutId);
  //   → map TemplateWithExercises to WorkoutPreviewData
  //

  // For now, always show placeholder — remove this early return
  // when the real fetch is implemented.
  return <PlaceholderView />;

  // ─── Real View (when data is available) ────────────────────────────────
  // Unreachable until fetch is wired:
  // const workout: WorkoutPreviewData = { ... };
  // return (
  //   <ErrorBoundary>
  //     <GradientBackground>
  //       <View className="flex-1 px-4 pt-6">
  //         <ScreenTitle title={workout.name} className="mb-4" />
  //         <WorkoutPreview
  //           workout={workout}
  //           onStartWorkout={onStartWorkout}
  //         />
  //       </View>
  //     </GradientBackground>
  //   </ErrorBoundary>
  // );
}
