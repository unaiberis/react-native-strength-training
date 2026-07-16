import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// ─── Types ─────────────────────────────────────────────────────────────────

interface BackButtonProps {
  fallbackRoute?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

function BackButton({ fallbackRoute }: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (fallbackRoute) {
      router.replace(fallbackRoute as any);
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="mr-3"
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={24} color="#B9B9B6" />
    </TouchableOpacity>
  );
}

export { BackButton };
export default BackButton;
