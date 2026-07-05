import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { Workout } from "@/types";
import { PrimaryButton } from "@/components/buttons/PrimaryButton";

type Props = {
  workout: Workout;
  onStart?: () => void;
};

export function WorkoutCard({ workout, onStart }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>Entrenamiento de hoy</Text>
          <Text style={styles.title}>{workout.title}</Text>
        </View>
        <View style={styles.duration}>
          <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.durationText}>{workout.duration}</Text>
        </View>
      </View>

      <View style={styles.exerciseList}>
        {workout.exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseRow}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.prescription}>{exercise.prescription}</Text>
            </View>
          </View>
        ))}
      </View>

      <PrimaryButton title="Abrir entrenamiento" icon="barbell-outline" onPress={onStart} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 20,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    color: Colors.text,
    fontSize: 23,
    fontWeight: "900",
  },
  duration: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  durationText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  exerciseList: {
    gap: 14,
    marginBottom: 20,
  },
  exerciseRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.titanium,
  },
  exerciseName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  prescription: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
