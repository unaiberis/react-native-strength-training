import { type ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";

export function GradientBackground({ children }: { children: ReactNode }) {
  return (
    <LinearGradient
      colors={["#030303", "#101012", "#050505"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="flex-1"
    >
      {children}
    </LinearGradient>
  );
}
