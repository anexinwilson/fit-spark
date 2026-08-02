import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Cancels the active Stripe subscription for the authenticated user.
// Updates the local profile to reflect the cancellation.
export const POST = async () => {
  try {
    // Create the Stripe client for this request.
    const stripe = getStripeClient();
    // Retrieves the authenticated user's info.
    const clerkUser = await currentUser();
    if (!clerkUser?.id) {
      return NextResponse.json({ error: "Unauthorized" });
    }

    // Looks up the user's profile and subscription ID.
    const profile = await prisma.profile.findUnique({
      where: { userId: clerkUser.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "No Profile Found" });
    }

    if (!profile.stripeSubscriptionId) {
      return NextResponse.json({ error: "No Active Subscription Found" });
    }

    // Requests Stripe to cancel the subscription at the end of the billing period.
    const subscriptionId = profile.stripeSubscriptionId;
    await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    // Updates the user's profile to remove subscription info.
    const updatedProfile = await prisma.profile.update({
      where: { userId: clerkUser.id },
      data: {
        subscriptionTier: null,
        stripeSubscriptionId: null,
        subscriptionActive: false,
      },
    });

    // Returns updated subscription details.
    return NextResponse.json({ subscription: updatedProfile });
  } catch {
    // Handles errors from Stripe or the database.
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
};
