import { SafeAreaView, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../src/shared/ui/Button";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-surface-950">
      <View
        className="flex-1"
        style={{ paddingTop: 56, paddingBottom: 26, paddingHorizontal: 28 }}
      >
        {/* Top spacer */}
        <View className="flex-1" />

        {/* Logo area */}
        <View className="items-center">
          <View
            className="w-[74px] h-[74px] rounded-full items-center justify-center border border-border"
            style={{ backgroundColor: "rgba(255,255,255,0.045)" }}
          >
            <Ionicons name="infinite-outline" size={42} color="#B9B9B6" />
          </View>
          <Text
            className="text-surface-50 mt-5"
            style={{ fontSize: 18, fontWeight: "900", letterSpacing: 2.2 }}
          >
            THE HYBRID PROJECT
          </Text>
        </View>

        {/* Spacer between logo and buttons */}
        <View className="flex-1" />

        {/* Action buttons */}
        <View className="gap-4">
          <Button
            title="Inicia sesión"
            icon="log-in-outline"
            variant="primary"
            onPress={() => router.push("/(auth)/login")}
          />
          <Button
            title="Regístrate"
            icon="person-add-outline"
            variant="primary"
            onPress={() => router.push("/(auth)/register")}
          />
        </View>

        {/* Spacer between buttons and footer */}
        <View className="flex-1" />

        {/* Footer */}
        <Text
          className="text-surface-400 text-center uppercase"
          style={{ fontSize: 13, letterSpacing: 1.4, fontWeight: "600" }}
        >
          Train to greatness
        </Text>
      </View>
    </SafeAreaView>
  );
}
