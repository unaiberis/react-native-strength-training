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
    "^@lingui/core$": "<rootDir>/__mocks__/@lingui/core/index.ts",
    "^@lingui/core/macro$": "<rootDir>/__mocks__/@lingui/core/macro.ts",
    "^@lingui/react$": "<rootDir>/__mocks__/@lingui/react/index.ts",
    "^@lingui/react/macro$": "<rootDir>/__mocks__/@lingui/react/macro.ts",
  },
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};
