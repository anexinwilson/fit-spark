import Stripe from "stripe";

/**
 * Single instance of the Stripe client for use throughout the app.
 * The secret key is loaded from environment variables.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
