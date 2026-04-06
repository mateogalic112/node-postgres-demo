/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  projects: [
    {
      displayName: "unit",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["**/*.service.test.ts"],
      modulePaths: ["<rootDir>/src"],
    },
    {
      displayName: "integration",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["**/*.controller.test.ts", "**/*.socket.test.ts"],
      globalSetup: "<rootDir>/src/__tests__/globalSetup.ts",
      globalTeardown: "<rootDir>/src/__tests__/globalTeardown.ts",
      setupFilesAfterEnv: ["<rootDir>/src/__tests__/jestSetup.ts"],
      modulePaths: ["<rootDir>/src"],
    },
  ],
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
