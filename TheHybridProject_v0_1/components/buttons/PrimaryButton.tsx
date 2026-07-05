import React from "react";
import { Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

type Props = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: ViewStyle;
};

export function PrimaryButton({ title, icon, onPress, style }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={[styles.button, style]}>
      {icon ? <Ionicons name={icon} size={22} color={Colors.text} /> : null}
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: Colors.cardSoft,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  text: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
});
