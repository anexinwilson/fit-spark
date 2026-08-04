import { NextRequest, NextResponse } from "next/server";

import { processStripeEvent } from "@/features/billing/stripe-webhook";
import { getErrorMessage } from "@/lib/errors";
import { requireServerEnvironment } from "@/lib/server-env";
import { getStripeClient } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Stripe signature is missing" },
      { status: 400 },
    );
  }

  const webhookSecret = requireServerEnvironment("STRIPE_WEBHOOK_SECRET");

  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Stripe webhook verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await processStripeEvent(event);
    return NextResponse.json({ received: true, ...result });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Stripe webhook processing failed:", message);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
