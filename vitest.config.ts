import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  define: {
    __DEV__: "true",
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    deps: {
      inline: [/@lingui/, /react-native/, /pocketbase/, /expo-modules-core/],
    },
  },
});
