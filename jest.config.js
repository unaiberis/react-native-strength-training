/** @type {import('jest').Config} */
module.exports = {
  // No jest-expo preset — pure TypeScript tests that don't need RN environment
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: "jest.tsconfig.json",
      diagnostics: false,
    }],
  },
  setupFiles: ["./jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};
