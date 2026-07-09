import { Stack } from "expo-router";

/**
 * Layout for the (workout) stack group.
 *
 * Workout routes are presented full-screen (no tab bar, no header).
 */
export default function WorkoutLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="active" />
      <Stack.Screen name="self-assessment" />
      <Stack.Screen name="assessment-results" />
      <Stack.Screen name="notes" />
    </Stack>
  );
}
