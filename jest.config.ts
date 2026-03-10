import type { Config } from "jest";

const config: Config = {
  testTimeout: 15000, // global timeout for integration tests hitting a real server
  projects: [
    {
      // ── API / server-side tests ──────────────────────────────────────────
      displayName: "api",
      preset: "ts-jest",
      testEnvironment: "node",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      testMatch: ["**/*.test.ts"],
      testTimeout: 15000, // integration tests hit a real server
      // Load .env so BASE_URL and other vars are available in api tests
      setupFiles: ["<rootDir>/jest.setup.env.ts"],
    },
    {
      // ── Frontend / component tests ───────────────────────────────────────
      displayName: "ui",
      preset: "ts-jest",
      testEnvironment: "jsdom",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      testMatch: ["**/*.test.tsx"],
      testTimeout: 10000,
      // setupFiles run before module imports — sets env vars read at module
      // evaluation time (e.g. NEXT_PUBLIC_KONG_BASE_URL in page.tsx).
      setupFiles: ["<rootDir>/jest.setup.env.ts"],
      // setupFilesAfterEnv run after the testing framework is installed —
      // safe place for @testing-library/jest-dom matcher registration.
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      transform: {
        "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
      },
    },
  ],
};

export default config;
