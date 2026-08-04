export type ServerEnvironmentKey =
  | "DATABASE_URL"
  | "GEMINI_API_KEY"
  | "GEMINI_MODEL"
  | "NEXT_PUBLIC_BASE_URL"
  | "STRIPE_PRICE_MONTHLY"
  | "STRIPE_PRICE_WEEKLY"
  | "STRIPE_PRICE_YEARLY"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET";

export function requireServerEnvironment(key: ServerEnvironmentKey): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is not configured.`);
  }

  return value;
}
