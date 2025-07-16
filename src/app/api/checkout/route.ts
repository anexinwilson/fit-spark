import { getPriceIDFromType } from "@/lib/plans";
import { getStripeClient } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

// Initiates a Stripe Checkout session for subscription.
// Requires planType, userId, and email in the request body.
export const POST = async (request: NextRequest) => {
  try {
    // Extracts subscription plan type, user ID, and email from the request.
    const { planType, userId, email } = await request.json();

    // Validates that all required fields are present.
    if (!planType || !userId || !email) {
      return NextResponse.json(
        { error: "Plan type, user id, and email are required" },
        { status: 400 }
      );
    }

    // Validates allowed plan types.
    const allowedPlanTypes = ["week", "month", "year"];
    if (!allowedPlanTypes.includes(planType)) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }

    // Retrieves the Stripe price ID for the chosen plan.
    const priceID = getPriceIDFromType(planType);
    if (!priceID) {
      return NextResponse.json({ error: "Invalid price id" }, { status: 400 });
    }

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
      metadata: { clerkUserId: userId, planType },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/workoutplan?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscribe`,
    });

    // Returns the Stripe Checkout session URL for client-side redirection.
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    // Handles errors during Stripe session creation.
    return NextResponse.json({ error: error }, { status: 500 });
  }
};