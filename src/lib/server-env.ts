import {
  requireRuntimeConfigValue,
  type RuntimeConfig,
} from "@/lib/runtime-config";

export type ServerEnvironmentKey = Exclude<
  keyof RuntimeConfig,
  "CLERK_SECRET_KEY" | "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
>;

export function requireServerEnvironment(key: ServerEnvironmentKey): string {
  return requireRuntimeConfigValue(key);
}
