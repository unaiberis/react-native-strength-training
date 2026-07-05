import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Screen } from "@/components/layout/Screen";
import { PrimaryButton } from "@/components/buttons/PrimaryButton";
import { Colors } from "@/constants/Colors";

export default function RegisterScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Registro de atleta</Text>
        <Text style={styles.subtitle}>Pantalla base para crear cuenta. Se conectará posteriormente al backend.</Text>

        <View style={styles.form}>
          <TextInput placeholder="Nombre" placeholderTextColor={Colors.textSubtle} style={styles.input} />
          <TextInput placeholder="Email" placeholderTextColor={Colors.textSubtle} style={styles.input} />
          <TextInput placeholder="Contraseña" placeholderTextColor={Colors.textSubtle} secureTextEntry style={styles.input} />
          <PrimaryButton title="Crear cuenta" icon="person-add-outline" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 28, justifyContent: "center", gap: 22 },
  title: { color: Colors.text, fontSize: 32, fontWeight: "900" },
  subtitle: { color: Colors.textMuted, fontSize: 15, lineHeight: 22 },
  form: { gap: 14 },
  input: {
    height: 58,
    borderRadius: 18,
    paddingHorizontal: 18,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: 16,
  },
});
