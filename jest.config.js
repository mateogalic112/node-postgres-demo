/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^config/(.*)$": "<rootDir>/src/config/$1",
    "^api/(.*)$": "<rootDir>/src/api/$1",
    "^users/(.*)$": "<rootDir>/src/users/$1",
    "^middleware/(.*)$": "<rootDir>/src/middleware/$1",
    "^services/(.*)$": "<rootDir>/src/services/$1",
    "^database/(.*)$": "<rootDir>/src/database/$1",
    "^app$": "<rootDir>/src/app",
    "^auth/(.*)$": "<rootDir>/src/auth/$1",
    "^interfaces/(.*)$": "<rootDir>/src/interfaces/$1",
    "^products/(.*)$": "<rootDir>/src/products/$1",
    "^auctions/(.*)$": "<rootDir>/src/auctions/$1",
    "^bids/(.*)$": "<rootDir>/src/bids/$1"
  }
};
