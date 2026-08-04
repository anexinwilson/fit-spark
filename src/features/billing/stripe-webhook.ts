import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const subscription = invoice.parent?.subscription_details?.subscription;
  return typeof subscription === "string" ? subscription : subscription?.id;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.clerkUserId;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  if (!userId || !subscriptionId) {
    throw new Error(
      "Checkout session is missing required subscription metadata",
    );
  }

  await prisma.profile.update({
    where: { userId },
    data: {
      stripeSubscriptionId: subscriptionId,
      subscriptionActive: true,
      subscriptionTier: session.metadata?.planType ?? null,
      cancelAtPeriodEnd: false,
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  await prisma.profile.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: { subscriptionActive: true },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  await prisma.profile.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: { subscriptionActive: false },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await prisma.profile.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      subscriptionActive: ["active", "trialing"].includes(subscription.status),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.profile.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      subscriptionActive: false,
      stripeSubscriptionId: null,
      subscriptionTier: null,
      cancelAtPeriodEnd: false,
    },
  });
}

export async function processStripeEvent(event: Stripe.Event) {
  const processedEvent = await prisma.stripeEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });

  if (processedEvent) return { duplicate: true };

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object);
      break;
  }

  await prisma.stripeEvent.create({
    data: { id: event.id, type: event.type },
  });

  return { duplicate: false };
}
