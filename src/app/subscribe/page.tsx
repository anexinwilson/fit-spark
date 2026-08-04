"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { availablePlans } from "@/features/billing/plans";
import { cn } from "@/lib/utils";

type CheckoutResponse = { url: string };

async function startCheckout(planType: string): Promise<CheckoutResponse> {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planType }),
  });
  const data = (await response.json()) as CheckoutResponse & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to start checkout");
  }

  return data;
}

export default function SubscribePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const checkout = useMutation({
    mutationFn: startCheckout,
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const choosePlan = (planType: string) => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/sign-up");
      return;
    }
    checkout.mutate(planType);
  };

  const formatter = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  });

  return (
    <section className="min-h-[calc(100svh-4rem)] bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wider text-blue-700 uppercase">
            Simple pricing
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Choose the pace that fits you
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Every plan includes personalized workouts and a clear weekly
            structure. Change or cancel your plan whenever you need.
          </p>
        </div>

        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
          {availablePlans.map((plan) => {
            const isThisPlanLoading =
              checkout.isPending && checkout.variables === plan.interval;

            return (
              <Card
                key={plan.interval}
                className={cn(
                  "relative flex h-full flex-col overflow-hidden border-slate-200 shadow-sm",
                  plan.isPopular && "border-blue-500 ring-2 ring-blue-500/15",
                )}
              >
                {plan.isPopular && (
                  <div className="flex items-center justify-center gap-1.5 bg-blue-600 py-2 text-xs font-semibold tracking-wide text-white uppercase">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    Most popular
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold tracking-tight text-blue-700">
                      {formatter.format(plan.amount)}
                    </span>
                    <span className="text-muted-foreground">
                      /{plan.interval}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {plan.description}
                  </p>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm"
                      >
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-blue-600"
                          aria-hidden="true"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    size="lg"
                    variant={plan.isPopular ? "default" : "outline"}
                    className={cn(
                      "h-11 w-full",
                      plan.isPopular && "bg-blue-600 hover:bg-blue-700",
                    )}
                    disabled={!isLoaded || checkout.isPending}
                    onClick={() => choosePlan(plan.interval)}
                  >
                    {isThisPlanLoading && (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    )}
                    {isThisPlanLoading ? "Opening checkout" : "Choose plan"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <p className="text-muted-foreground mt-8 text-center text-sm">
          Prices are shown in CAD. Cancel anytime. No hidden fees.
        </p>
      </div>
    </section>
  );
}
