import { getPriceId, isPlanInterval } from "@/features/billing/plans";
import { getAuthenticatedUser } from "@/lib/auth";
import { requireServerEnvironment } from "@/lib/server-env";
import { getStripeClient } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

// Initiates a Stripe Checkout session for subscription.
// Requires planType, userId, and email in the request body.
export const POST = async (request: NextRequest) => {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planType } = await request.json();
    const email = user.emailAddresses[0]?.emailAddress;

    if (!planType || !email) {
      return NextResponse.json(
        { error: "Plan type and account email are required" },
        { status: 400 },
      );
    }

    // Validates allowed plan types.
    if (!isPlanInterval(planType)) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }

    // Retrieves the Stripe price ID for the chosen plan.
    const priceID = getPriceId(planType);
    const baseUrl = requireServerEnvironment("NEXT_PUBLIC_BASE_URL");

    // Creates a Stripe Checkout session for a subscription.
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceID,
          quantity: 1,
        },
      ],
      customer_email: email,
      mode: "subscription",
      // Stores user and plan info in Stripe metadata for later webhook processing.
      metadata: { clerkUserId: user.id, planType },
      success_url: `${baseUrl}/workoutplan?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscribe`,
    });

    // Returns the Stripe Checkout session URL for client-side redirection.
    return NextResponse.json({ url: session.url });
  } catch {
    // Handles errors during Stripe session creation.
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
};
