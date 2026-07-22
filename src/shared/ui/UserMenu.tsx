import { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";

// ─── Component ───────────────────────────────────────────────────────────────

/** Professional user dropdown — avatar initial → menu card with user info + logout. */
function UserMenu() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const reset = useAuthStore((s) => s.reset);
  const displayName = user?.displayName ?? "";
  const email = user?.email ?? "";
  const initial = (displayName || email || "?").charAt(0).toUpperCase();

  return (
    <View className="relative">
      {/* Avatar button */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-card border border-border items-center justify-center active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={`${displayName || "User"} menu`}
      >
        <Text className="text-surface-50 text-sm font-bold">{initial}</Text>
      </Pressable>

      {/* Dropdown backdrop + menu */}
      {open && (
        <>
          {/* Backdrop — closes menu on tap outside */}
          <Pressable
            onPress={() => setOpen(false)}
            className="absolute inset-0 z-40"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
            accessibilityLabel="Close menu"
          />

          {/* Dropdown card */}
          <View className="absolute right-0 top-10 min-w-[200px] bg-card border border-border rounded-2xl shadow-elevated overflow-hidden"
            style={{ position: "absolute", right: 0, top: 40, zIndex: 50 }}
          >
            {/* User info header */}
            <View className="px-4 py-3 border-b border-border">
              {displayName ? (
                <Text className="text-surface-50 text-sm font-semibold" numberOfLines={1}>
                  {displayName}
                </Text>
              ) : null}
              <Text className="text-surface-400 text-xs" numberOfLines={1}>
                {email}
              </Text>
            </View>

            {/* Logout action */}
            <Pressable
              onPress={() => {
                setOpen(false);
                reset();
              }}
              className="flex-row items-center gap-2 px-4 py-3 active:bg-card-soft hover:bg-card-soft"
              accessibilityRole="button"
              accessibilityLabel="Logout"
            >
              <Ionicons name="log-out-outline" size={18} color="#D65F5F" />
              <Text className="text-danger text-sm font-medium">Logout</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

export { UserMenu };
export default UserMenu;
