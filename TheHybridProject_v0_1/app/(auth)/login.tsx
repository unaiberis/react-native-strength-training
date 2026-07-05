import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/layout/Screen";
import { PrimaryButton } from "@/components/buttons/PrimaryButton";
import { Colors } from "@/constants/Colors";

export default function LoginScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <View>
          <Text style={styles.title}>Accede a tu cuenta</Text>
          <Text style={styles.subtitle}>Introduce tus credenciales para ver tu planificación.</Text>
        </View>

        <View style={styles.form}>
          <TextInput placeholder="Email" placeholderTextColor={Colors.textSubtle} style={styles.input} />
          <TextInput placeholder="Contraseña" placeholderTextColor={Colors.textSubtle} secureTextEntry style={styles.input} />
          <PrimaryButton title="Entrar como atleta" icon="arrow-forward-outline" onPress={() => router.replace("/(athlete)/home")} />
          <PrimaryButton title="Entrar como entrenador" icon="shield-checkmark-outline" onPress={() => router.replace("/(coach)/dashboard")} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 28, justifyContent: "center", gap: 34 },
  title: { color: Colors.text, fontSize: 32, fontWeight: "900", marginBottom: 10 },
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
