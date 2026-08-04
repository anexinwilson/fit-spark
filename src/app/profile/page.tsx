"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { availablePlans } from "@/features/billing/plans";

type SubscriptionStatus = {
  subscription: {
    subscriptionTier: string | null;
    subscriptionActive: boolean;
    cancelAtPeriodEnd: boolean;
  };
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data;
}

export default function ProfilePage() {
  const [selectedPlan, setSelectedPlan] = useState("");
  const { isLoaded, isSignedIn, user } = useUser();
  const queryClient = useQueryClient();
  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () =>
      requestJson<SubscriptionStatus>("/api/profile/subscription-status"),
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000,
  });

  const refreshSubscription = () =>
    queryClient.invalidateQueries({ queryKey: ["subscription"] });

  const changePlan = useMutation({
    mutationFn: (newPlan: string) =>
      requestJson("/api/profile/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPlan }),
      }),
    onSuccess: async () => {
      await refreshSubscription();
      setSelectedPlan("");
      toast.success("Subscription plan updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancelSubscription = useMutation({
    mutationFn: () =>
      requestJson("/api/profile/unsubscribe", { method: "POST" }),
    onSuccess: async () => {
      await refreshSubscription();
      toast.success("Cancellation scheduled");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto size-10 text-amber-600" />
        <h1 className="mt-4 text-2xl font-semibold">
          Sign in to view your profile
        </h1>
        <Button
          className="mt-6"
          nativeButton={false}
          render={<Link href="/sign-up" />}
        >
          Continue
        </Button>
      </div>
    );
  }

  const subscription = subscriptionQuery.data?.subscription;
  const currentPlan = availablePlans.find(
    (plan) => plan.interval === subscription?.subscriptionTier,
  );
  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((name) => name?.[0])
      .join("") || "FS";

  return (
    <section className="min-h-[calc(100svh-4rem)] bg-slate-50 py-12">
      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
            <Avatar className="size-20">
              <AvatarImage src={user.imageUrl} alt="" />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                  "Your profile"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptionQuery.isPending ? (
              <div className="text-muted-foreground flex items-center gap-3">
                <Loader2 className="animate-spin" aria-hidden="true" />
                Loading subscription details
              </div>
            ) : subscriptionQuery.isError ? (
              <div
                role="alert"
                className="rounded-lg bg-red-50 p-4 text-red-800"
              >
                {subscriptionQuery.error.message}
              </div>
            ) : currentPlan ? (
              <div className="grid gap-8 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">
                      {currentPlan.name}
                    </h2>
                    <Badge
                      variant={
                        subscription?.subscriptionActive
                          ? "default"
                          : "secondary"
                      }
                    >
                      {subscription?.subscriptionActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {subscription?.cancelAtPeriodEnd && (
                    <p className="mt-3 text-sm text-amber-700">
                      Cancellation is scheduled. Access remains active until
                      Stripe ends the paid period.
                    </p>
                  )}
                  <p className="mt-3 text-2xl font-bold text-blue-700">
                    {new Intl.NumberFormat("en-CA", {
                      style: "currency",
                      currency: currentPlan.currency,
                    }).format(currentPlan.amount)}
                    <span className="text-muted-foreground text-sm font-normal">
                      /{currentPlan.interval}
                    </span>
                  </p>
                </div>

                <div>
                  <label htmlFor="plan-select" className="text-sm font-medium">
                    Change plan
                  </label>
                  <Select
                    value={selectedPlan}
                    onValueChange={(value) => setSelectedPlan(value ?? "")}
                  >
                    <SelectTrigger
                      id="plan-select"
                      className="mt-2 h-10 w-full"
                    >
                      <SelectValue placeholder="Select a new plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlans
                        .filter(
                          (plan) => plan.interval !== currentPlan.interval,
                        )
                        .map((plan) => (
                          <SelectItem key={plan.interval} value={plan.interval}>
                            {plan.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="mt-3 h-10 w-full bg-blue-600 hover:bg-blue-700"
                    disabled={!selectedPlan || changePlan.isPending}
                    onClick={() => changePlan.mutate(selectedPlan)}
                  >
                    {changePlan.isPending && (
                      <Loader2 className="animate-spin" />
                    )}
                    Save change
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-5">
                <p className="text-muted-foreground">No active subscription.</p>
                <Button
                  className="mt-4"
                  nativeButton={false}
                  render={<Link href="/subscribe" />}
                >
                  View plans
                </Button>
              </div>
            )}

            {subscription?.subscriptionActive &&
              !subscription.cancelAtPeriodEnd && (
                <div className="mt-8 border-t pt-6">
                  <h2 className="font-semibold">Cancel subscription</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Your billing will stop according to the cancellation terms
                    of your current plan.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={<Button variant="destructive" className="mt-4" />}
                    >
                      Cancel subscription
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Cancel your subscription?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This schedules cancellation with Stripe. You can keep
                          using FitSpark until your paid access ends.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          disabled={cancelSubscription.isPending}
                          onClick={() => cancelSubscription.mutate()}
                        >
                          Confirm cancellation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
