import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Screen } from "@/components/layout/Screen";
import { Colors } from "@/constants/Colors";
import { PrimaryButton } from "@/components/buttons/PrimaryButton";
import { MetricCard } from "@/components/cards/MetricCard";

export default function CoachDashboardScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View>
          <Text style={styles.kicker}>Panel entrenador</Text>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Aquí se gestionarán atletas, entrenamientos y evolución.</Text>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard label="Atletas" value="12" />
          <MetricCard label="Sesiones" value="28" />
        </View>

        <View style={styles.actions}>
          <PrimaryButton title="Crear entrenamiento" icon="add-circle-outline" />
          <PrimaryButton title="Ver atletas" icon="people-outline" />
          <PrimaryButton title="Biblioteca ejercicios" icon="videocam-outline" />
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>v0.1</Text>
          <Text style={styles.noteText}>Placeholder inicial. En la siguiente versión se desarrollará el constructor de entrenamientos.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    gap: 24,
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
    fontSize: 36,
    fontWeight: "900",
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actions: {
    gap: 14,
  },
  note: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 22,
    padding: 18,
  },
  noteTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  noteText: {
    color: Colors.textMuted,
    lineHeight: 21,
  },
});
