/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^config/(.*)$": "<rootDir>/src/config/$1",
    "^errors/(.*)$": "<rootDir>/src/errors/$1",
    "^users/(.*)$": "<rootDir>/src/users/$1",
    "^middleware/(.*)$": "<rootDir>/src/middleware/$1",
    "^services/(.*)$": "<rootDir>/src/services/$1",
    "^db/(.*)$": "<rootDir>/src/db/$1",
    "^interfaces/(.*)$": "<rootDir>/src/interfaces/$1",
    "^app$": "<rootDir>/src/app"
  },
  roots: ["<rootDir>/src"]
};
