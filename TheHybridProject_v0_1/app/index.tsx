import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/Screen";
import { PrimaryButton } from "@/components/buttons/PrimaryButton";
import { Colors } from "@/constants/Colors";

export default function WelcomeScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.logoBlock}>
          <View style={styles.mark}>
            <Ionicons name="infinite-outline" size={42} color={Colors.titanium} />
          </View>
          <Text style={styles.logoText}>THE HYBRID PROJECT</Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title="Inicia sesión"
            icon="log-in-outline"
            onPress={() => router.push("/(auth)/login")}
          />
          <PrimaryButton
            title="Regístrate"
            icon="person-add-outline"
            onPress={() => router.push("/(auth)/register")}
          />
        </View>

        <Text style={styles.footer}>Train to greatness</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
    paddingTop: 56,
    paddingBottom: 26,
  },
  logoBlock: {
    alignItems: "center",
  },
  mark: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  logoText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  actions: {
    gap: 18,
  },
  footer: {
    color: Colors.textMuted,
    textAlign: "center",
    fontSize: 13,
    letterSpacing: 1.4,
    fontWeight: "600",
    textTransform: "uppercase",
  },
});
