import { View, Text } from "react-native";

/**
 * Coach tab placeholder.
 * The actual navigation is handled by the submenu in the main tabs layout.
 * This screen is never shown — tapping the Coach tab toggles the submenu.
 */
export default function CoachTabScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#050505" }}>
      <Text style={{ color: "#707074" }}>Select a coach option from the menu above</Text>
    </View>
  );
}
