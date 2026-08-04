import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { NextResponse } from "next/server";

// Cancels the active Stripe subscription for the authenticated user.
// Updates the local profile to reflect the cancellation.
export const POST = async () => {
  try {
    // Create the Stripe client for this request.
    const stripe = getStripeClient();
    // Retrieves the authenticated user's info.
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Looks up the user's profile and subscription ID.
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

    // Requests Stripe to cancel the subscription at the end of the billing period.
    const subscriptionId = profile.stripeSubscriptionId;
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Keep entitlement and the Stripe ID until the paid period actually ends.
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    // Returns updated subscription details.
    return NextResponse.json({ subscription: updatedProfile });
  } catch {
    // Handles errors from Stripe or the database.
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
};
import { getAuthenticatedUserId } from "@/lib/auth";
