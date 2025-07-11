import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const POST = async (request: NextRequest) => {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature || "",
      webhookSecret
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleCustomerSubscriptionDeleted(subscription);
        break;
      }
      default:
        console.log("Unhandled event type" + event.type);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({});
};

const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session
) => {
  const userId = session.metadata?.clerkUserId;

  if (!userId) {
    console.log("No user id");
    return;
  }

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.log("No subscription id");
    return;
  }

  try {
    await prisma.profile.update({
      where: { userId },
      data: {
        stripeSubscriptionId: subscriptionId,
        subscriptionActive: true,
        subscriptionTier: session.metadata?.planType || null,
      },
    });
  } catch (error: any) {
    console.log(error.message);
  }
};

const handleInvoicePaymentFailed = async (invoice: Stripe.Invoice) => {
  const subId = typeof invoice.subscription === 'string' 
  ? invoice.subscription 
  : invoice.subscription?.id;

  if (!subId) {
    return;
  }

  let userId: string | undefined;

  try {
    const profile = await prisma.profile.findUnique({
      where: { stripeSubscriptionId: subId },
      select: { userId: true },
    });

    if (!profile?.userId) {
      console.log("No profile found");
      return;
    }
    userId = profile.userId;
  } catch (error: any) {
    console.log(error.message);
    return;
  }

  try {
    await prisma.profile.update({
      where: { userId: userId },
      data: {
        subscriptionActive: false,
      },
    });
  } catch (error: any) {
    console.log(error.message);
  }
};

const handleCustomerSubscriptionDeleted = async (
  subscription: Stripe.Subscription
) => {
   const subId = subscription.id;

  let userId: string | undefined;

  try {
    const profile = await prisma.profile.findUnique({
      where: { stripeSubscriptionId: subId },
      select: { userId: true },
    });

    if (!profile?.userId) {
      console.log("No profile found");
      return;
    }
    userId = profile.userId;
  } catch (error: any) {
    console.log(error.message);
    return;
  }

  try {
    await prisma.profile.update({
      where: { userId: userId },
      data: {
        subscriptionActive: false,
        stripeSubscriptionId: null,
        subscriptionTier: null,
      },
    });
  } catch (error: any) {
    console.log(error.message);
  }
};
