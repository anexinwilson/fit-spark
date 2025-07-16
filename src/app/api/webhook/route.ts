import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Handles incoming webhook events from Stripe for subscription management.
// Events include checkout.session.completed, invoice.payment_failed, and customer.subscription.deleted.
export const POST = async (request: NextRequest) => {
  // Reads the raw body and Stripe signature from the incoming request.
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    // Create the Stripe client for this request.
    const stripe = getStripeClient();
    // Verifies the request using Stripe's signing secret.
    event = stripe.webhooks.constructEvent(
      body,
      signature || "",
      webhookSecret
    );
  } catch (error: any) {
    // Responds with error if signature validation fails.
    console.error("Webhook signature verification failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.log("Processing webhook event:", event.type);

  try {
    // Processes relevant webhook events for subscriptions.
    switch (event.type) {
      case "checkout.session.completed": {
        // Called after a successful checkout and subscription purchase.
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Processing checkout.session.completed:", session.id);
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case "invoice.payment_failed": {
        // Called when a payment fails (e.g., declined card).
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Processing invoice.payment_failed:", invoice.id);
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      case "customer.subscription.deleted": {
        // Called when a subscription is canceled or deleted.
        const subscription = event.data.object as Stripe.Subscription;
        console.log(
          "Processing customer.subscription.deleted:",
          subscription.id
        );
        await handleCustomerSubscriptionDeleted(subscription);
        break;
      }
      default:
        // Logs unhandled event types for monitoring.
        console.log("Unhandled event type:", event.type);
    }
  } catch (error: any) {
    // Logs and reports errors during webhook processing.
    console.error("Error processing webhook:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Acknowledges receipt of the webhook event to Stripe.
  return NextResponse.json({ received: true });
};

/**
 * Handles successful completion of a Stripe Checkout session for a subscription.
 * Updates the user's profile in the database to reflect active subscription status.
 */
const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session
) => {
  const userId = session.metadata?.clerkUserId;
  const planType = session.metadata?.planType;

  console.log("Checkout session metadata:", { userId, planType });

  if (!userId) {
    console.error("No user id found in session metadata");
    return;
  }

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.error("No subscription id found in session");
    return;
  }

  try {
    // Updates the profile with Stripe subscription ID, plan, and active status.
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        stripeSubscriptionId: subscriptionId,
        subscriptionActive: true,
        subscriptionTier: planType || null,
      },
    });
    console.log("Profile updated successfully:", updatedProfile);
  } catch (error: any) {
    console.error("Error updating profile:", error.message);
    // Throws to signal that the webhook should be retried.
    throw error;
  }
};

/**
 * Handles Stripe payment failure events by marking the user's subscription as inactive.
 */
const handleInvoicePaymentFailed = async (invoice: Stripe.Invoice) => {
  const subId = (invoice as any).subscription as string;

  if (!subId) {
    console.error("No subscription id found in invoice");
    return;
  }

  let userId: string | undefined;

  try {
    // Finds the user profile by the Stripe subscription ID.
    const profile = await prisma.profile.findUnique({
      where: { stripeSubscriptionId: subId },
      select: { userId: true },
    });

    if (!profile?.userId) {
      console.error("No profile found for subscription:", subId);
      return;
    }
    userId = profile.userId;
  } catch (error: any) {
    console.error("Error finding profile:", error.message);
    return;
  }

  try {
    // Updates the user's profile to set subscription as inactive.
    await prisma.profile.update({
      where: { userId: userId },
      data: {
        subscriptionActive: false,
      },
    });
    console.log("Profile updated for failed payment:", userId);
  } catch (error: any) {
    console.error("Error updating profile for failed payment:", error.message);
  }
};

/**
 * Handles the event when a Stripe subscription is deleted.
 * Clears subscription details from the user's profile in the database.
 */
const handleCustomerSubscriptionDeleted = async (
  subscription: Stripe.Subscription
) => {
  const subId = subscription.id;

  let userId: string | undefined;

  try {
    // Looks up the user profile with the Stripe subscription ID.
    const profile = await prisma.profile.findUnique({
      where: { stripeSubscriptionId: subId },
      select: { userId: true },
    });

    if (!profile?.userId) {
      console.error("No profile found for subscription:", subId);
      return;
    }
    userId = profile.userId;
  } catch (error: any) {
    console.error("Error finding profile:", error.message);
    return;
  }

  try {
    // Clears all subscription-related fields on the profile.
    await prisma.profile.update({
      where: { userId: userId },
      data: {
        subscriptionActive: false,
        stripeSubscriptionId: null,
        subscriptionTier: null,
      },
    });
    console.log("Profile updated for deleted subscription:", userId);
  } catch (error: any) {
    console.error(
      "Error updating profile for deleted subscription:",
      error.message
    );
  }
};