import { z } from "zod";

const runtimeConfigSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_ENCRYPTION_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_PRICE_WEEKLY: z.string().min(1),
  STRIPE_PRICE_MONTHLY: z.string().min(1),
  STRIPE_PRICE_YEARLY: z.string().min(1),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  PINECONE_API_KEY: z.string().min(1),
  PINECONE_INDEX_NAME: z.string().min(1),
  PINECONE_INDEX_HOST: z.string().url(),
  PINECONE_NAMESPACE: z.string().min(1),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

let cachedConfig: RuntimeConfig | undefined;

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedConfig) return cachedConfig;

  const rawConfig = process.env.FITSPARK_RUNTIME_CONFIG_JSON?.trim();
  if (!rawConfig) {
    throw new Error("FITSPARK_RUNTIME_CONFIG_JSON is not configured.");
  }

  let parsedConfig: unknown;
  try {
    parsedConfig = JSON.parse(rawConfig);
  } catch {
    throw new Error("FITSPARK_RUNTIME_CONFIG_JSON must contain valid JSON.");
  }

  const result = runtimeConfigSchema.safeParse(parsedConfig);
  if (!result.success) {
    throw new Error(
      `FITSPARK_RUNTIME_CONFIG_JSON is invalid: ${result.error.message}`,
    );
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function requireRuntimeConfigValue(key: keyof RuntimeConfig): string {
  return getRuntimeConfig()[key];
}

export function clearRuntimeConfigCacheForTests(): void {
  cachedConfig = undefined;
}
