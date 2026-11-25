/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  clearMocks: true,
  testMatch: ["**/*.test.ts"],
  globalSetup: "<rootDir>/src/__tests__/globalSetup.ts",
  globalTeardown: "<rootDir>/src/__tests__/globalTeardown.ts",
  setupFiles: ["<rootDir>/src/__tests__/workerDatabase.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/jestSetup.ts"],
  modulePaths: ["<rootDir>/src"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/__tests__/**",
    "!src/database/migrations.ts",
    "!src/database/rollback.ts",
    "!src/database/seed.ts"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "clover"]
};
