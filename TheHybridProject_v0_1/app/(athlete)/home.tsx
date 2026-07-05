import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Screen } from "@/components/layout/Screen";
import { Colors } from "@/constants/Colors";
import { MetricCard } from "@/components/cards/MetricCard";
import { WorkoutCard } from "@/components/cards/WorkoutCard";
import { todayWorkout, weekDays } from "@/data/mockWorkouts";

export default function AthleteHomeScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>The Hybrid Project</Text>
          <Text style={styles.title}>Tu entrenamiento</Text>
          <Text style={styles.subtitle}>Hoy tienes una sesión programada de fuerza.</Text>
        </View>

        <View style={styles.calendar}>
          {weekDays.map((item) => (
            <View key={item.day} style={[styles.day, item.active && styles.dayActive]}>
              <Text style={[styles.dayName, item.active && styles.dayTextActive]}>{item.day}</Text>
              <Text style={[styles.dayNumber, item.active && styles.dayTextActive]}>{item.number}</Text>
              {item.hasWorkout ? <View style={styles.dot} /> : <View style={styles.dotGhost} />}
            </View>
          ))}
        </View>

        <WorkoutCard workout={todayWorkout} />

        <View style={styles.metricsRow}>
          <MetricCard label="Sueño" value="7.5h" />
          <MetricCard label="Energía" value="8/10" />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard label="Fatiga" value="3/10" />
          <MetricCard label="Racha" value="4 días" />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 40,
    gap: 22,
  },
  header: {
    paddingTop: 24,
  },
  kicker: {
    color: Colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.8,
    fontWeight: "800",
    marginBottom: 10,
  },
  title: {
    color: Colors.text,
    fontSize: 35,
    fontWeight: "900",
    letterSpacing: -1,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 15,
    marginTop: 8,
  },
  calendar: {
    flexDirection: "row",
    gap: 8,
  },
  day: {
    flex: 1,
    height: 78,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayActive: {
    backgroundColor: Colors.titanium,
    borderColor: Colors.titanium,
  },
  dayName: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  dayNumber: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginVertical: 5,
  },
  dayTextActive: {
    color: Colors.background,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.titanium,
  },
  dotGhost: {
    width: 5,
    height: 5,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
});
