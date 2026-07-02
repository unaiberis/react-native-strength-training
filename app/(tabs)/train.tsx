import { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../src/shared/ui/Card';
import { Button } from '../../src/shared/ui/Button';
import { useTemplates } from '../../src/features/routines/hooks/useTemplates';

export default function TrainScreen() {
  const router = useRouter();
  const { data: templates, isLoading } = useTemplates();

  const handleBlankWorkout = useCallback(() => {
    router.push('/(workout)/active?mode=blank');
  }, [router]);

  const handleStartRoutine = useCallback(
    (templateId: string) => {
      router.push({
        pathname: '/(workout)/active',
        params: { mode: 'routine', templateId },
      });
    },
    [router]
  );

  return (
    <ScrollView className="flex-1 bg-surface-950 px-4 pt-16">
      <Text className="text-surface-50 text-2xl font-bold mb-6">Train</Text>

      {/* Start workout */}
      <Card className="mb-4">
        <Text className="text-surface-100 text-lg font-semibold mb-2">
          Start Workout
        </Text>
        <Text className="text-surface-400 mb-4">
          Choose a routine or start a blank workout.
        </Text>
        <View className="flex-row gap-3">
          <Button
            title="Blank Workout"
            variant="secondary"
            className="flex-1"
            onPress={handleBlankWorkout}
          />
          <Button
            title="Browse Exercises"
            variant="primary"
            className="flex-1"
            onPress={() => router.push('/exercises')}
          />
        </View>
      </Card>

      {/* Quick links */}
      <View className="flex-row gap-3 mb-4">
        <TouchableOpacity
          onPress={() => router.push('/routines')}
          accessibilityRole="button"
          accessibilityLabel="My Routines, View and manage"
          className="flex-1 bg-surface-900 rounded-2xl p-4 border border-surface-800 active:opacity-80"
        >
          <Text className="text-2xl mb-1">📋</Text>
          <Text className="text-surface-100 text-sm font-semibold">
            My Routines
          </Text>
          <Text className="text-surface-500 text-xs mt-0.5">
            View and manage
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/routines/new')}
          accessibilityRole="button"
          accessibilityLabel="New Routine, Create template"
          className="flex-1 bg-surface-900 rounded-2xl p-4 border border-surface-800 active:opacity-80"
        >
          <Text className="text-2xl mb-1">➕</Text>
          <Text className="text-surface-100 text-sm font-semibold">
            New Routine
          </Text>
          <Text className="text-surface-500 text-xs mt-0.5">
            Create template
          </Text>
        </TouchableOpacity>
      </View>

      {/* Routines list */}
      <Text className="text-surface-100 text-lg font-semibold mb-3">
        Start from Routine
      </Text>

      {isLoading && (
        <View className="py-8">
          <ActivityIndicator size="small" color="#22c55e" />
        </View>
      )}

      {!isLoading && (!templates || templates.length === 0) && (
        <Card className="mb-4">
          <Text className="text-surface-400 text-center py-4">
            Create a routine first to start a guided workout.
          </Text>
        </Card>
      )}

      {templates?.map((template) => (
        <TouchableOpacity
          key={template.id}
          onPress={() => handleStartRoutine(template.id)}
          accessibilityRole="button"
          accessibilityLabel={`${template.name}, Start routine`}
          className="bg-surface-900 rounded-xl p-4 mb-3 border border-surface-800 active:opacity-80"
        >
          <Text className="text-surface-100 text-base font-semibold mb-1">
            {template.name}
          </Text>
          {template.description && (
            <Text className="text-surface-400 text-sm mb-1" numberOfLines={1}>
              {template.description}
            </Text>
          )}
          <Text className="text-surface-500 text-xs">
            {template.exercises.length} exercise
            {template.exercises.length !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
