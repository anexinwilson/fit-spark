import { spawn } from "node:child_process";
import process from "node:process";

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const rawConfig = process.env.FITSPARK_RUNTIME_CONFIG_JSON;
if (!rawConfig) {
  throw new Error(
    "FITSPARK_RUNTIME_CONFIG_JSON is required in .env.local for local development.",
  );
}

let config;
try {
  config = JSON.parse(rawConfig);
} catch {
  throw new Error("FITSPARK_RUNTIME_CONFIG_JSON must contain valid JSON.");
}

for (const key of [
  "CLERK_SECRET_KEY",
  "CLERK_ENCRYPTION_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
]) {
  if (typeof config[key] !== "string" || config[key].length === 0) {
    throw new Error(`${key} is required in FITSPARK_RUNTIME_CONFIG_JSON.`);
  }
  process.env[key] = config[key];
}

const isWindows = process.platform === "win32";
const command = isWindows ? process.env.ComSpec : "npm";
const args = isWindows
  ? ["/d", "/s", "/c", "npm run dev -- --hostname localhost"]
  : ["run", "dev", "--", "--hostname", "localhost"];
const child = spawn(command, args, {
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
