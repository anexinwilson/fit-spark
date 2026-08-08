import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  rootDir: "../",
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/__tests__/**/*.test.{ts,tsx}"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@langchain/langgraph$":
      "<rootDir>/node_modules/@langchain/langgraph/dist/index.cjs",
    "^@clerk/nextjs/server$": "<rootDir>/__tests__/__mocks__/clerk-nextjs-server.ts"
  },
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/jest.setup.ts"],
  transformIgnorePatterns: ["/node_modules/(?!(@langchain|langchain|@clerk)/)"],
};

export default createJestConfig(config);
