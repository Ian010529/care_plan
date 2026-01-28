/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  collectCoverageFrom: ["src/services/duplicateDetection.ts"],
  coverageThreshold: {
    "src/services/duplicateDetection.ts": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
