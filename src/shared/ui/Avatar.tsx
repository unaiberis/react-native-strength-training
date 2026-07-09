import { View, Text, Image } from "react-native";

// ─── Types ─────────────────────────────────────────────────────────────────

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  name?: string;
  size?: AvatarSize;
  imageUrl?: string | null;
  className?: string;
}

// ─── Size Map ──────────────────────────────────────────────────────────────

const sizeMap: Record<AvatarSize, { dimension: number; fontSize: number }> = {
  sm: { dimension: 32, fontSize: 12 },
  md: { dimension: 40, fontSize: 16 },
  lg: { dimension: 56, fontSize: 22 },
  xl: { dimension: 80, fontSize: 32 },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ─── Component ─────────────────────────────────────────────────────────────

function Avatar({ name, size = "md", imageUrl, className }: AvatarProps) {
  const { dimension, fontSize } = sizeMap[size];

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        className={`rounded-full ${className ?? ""}`}
        style={{ width: dimension, height: dimension }}
      />
    );
  }

  return (
    <View
      className={`rounded-full bg-graphite items-center justify-center ${className ?? ""}`}
      style={{ width: dimension, height: dimension }}
    >
      <Text
        className="text-titanium font-extrabold"
        style={{ fontSize }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

export { Avatar };
export default Avatar;
