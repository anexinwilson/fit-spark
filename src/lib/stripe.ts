import Stripe from "stripe";

import { requireServerEnvironment } from "@/lib/server-env";

/**
 * Returns a new Stripe client using the current environment variable.
 * Ensures secret is loaded at function call, not at import.
 */
export function getStripeClient() {
  return new Stripe(requireServerEnvironment("STRIPE_SECRET_KEY"));
}
