import Stripe from "stripe";

/**
 * Returns a new Stripe client using the current environment variable.
 * Ensures secret is loaded at function call, not at import.
 */
export function getStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}