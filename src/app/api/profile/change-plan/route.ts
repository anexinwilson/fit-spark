import { getPriceId, isPlanInterval } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

// Changes the subscription plan for the authenticated user.
// Updates both Stripe and the user's profile in the local database.
export const POST = async (request: NextRequest) => {
  try {
    // Create the Stripe client for this request.
    const stripe = getStripeClient();

    // Retrieves the currently authenticated user.
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extracts the new desired plan from the request body.
    const { newPlan } = await request.json();

    if (!newPlan) {
      return NextResponse.json(
        { error: "New plan is required" },
        { status: 400 },
      );
    }

    if (!isPlanInterval(newPlan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const priceId = getPriceId(newPlan);
    if (!priceId) {
      return NextResponse.json(
        { error: "Plan is not configured" },
        { status: 503 },
      );
    }

    // Looks up the user's profile, including their Stripe subscription.
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json({ error: "No profile found" }, { status: 404 });
    }

    if (!profile.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 409 },
      );
    }

    // Fetches the active Stripe subscription for this user.
    const subscriptionId = profile.stripeSubscriptionId;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItemId = subscription.items.data[0].id;

    if (!subscriptionItemId) {
      return NextResponse.json({ error: "No Active Subscription Found" });
    }

    // Updates the Stripe subscription with the new price ID and creates proration if necessary.
    const canceledSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: false,
        items: [
          {
            id: subscriptionItemId,
            price: priceId,
          },
        ],
        proration_behavior: "create_prorations",
      },
    );

    // Updates the user's profile with new plan info and subscription ID.
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        subscriptionTier: newPlan,
        stripeSubscriptionId: canceledSubscription.id,
        subscriptionActive: ["active", "trialing"].includes(
          canceledSubscription.status,
        ),
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      },
    });

    // Returns the updated subscription details.
    return NextResponse.json({ subscription: updatedProfile });
  } catch {
    // Handles errors from Stripe or database updates.
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
};
import { getAuthenticatedUserId } from "@/lib/auth";
