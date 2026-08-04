export const planIntervals = ["week", "month", "year"] as const;
export type PlanInterval = (typeof planIntervals)[number];

export interface Plan {
  name: string;
  amount: number;
  currency: string;
  interval: PlanInterval;
  isPopular?: boolean;
  description: string;
  features: string[];
}

export const availablePlans: Plan[] = [
  {
    name: "Weekly Plan",
    amount: 0.99,
    currency: "CAD",
    interval: "week",
    description: "Perfect for getting started with personalized fitness",
    features: [
      "Unlimited AI Workout Plans",
      "Personalized Weekly Schedules",
      "Cancel Anytime",
    ],
  },
  {
    name: "Monthly Plan",
    amount: 2.99,
    currency: "CAD",
    interval: "month",
    isPopular: true,
    description: "Great for building consistent habits",
    features: [
      "Unlimited AI Workout Plans",
      "Personalized Monthly Schedules",
      "Daily Workout Structure",
      "Cancel Anytime",
    ],
  },
  {
    name: "Yearly Plan",
    amount: 19.99,
    currency: "CAD",
    interval: "year",
    description: "Best value for serious fitness enthusiasts pushing limits",
    features: [
      "Unlimited AI Workout Plans",
      "Personalized Monthly Schedules",
      "Daily Workout Structure",
      "Cancel Anytime",
    ],
  },
];

const priceEnvironmentKey: Record<
  PlanInterval,
  Parameters<typeof requireServerEnvironment>[0]
> = {
  week: "STRIPE_PRICE_WEEKLY",
  month: "STRIPE_PRICE_MONTHLY",
  year: "STRIPE_PRICE_YEARLY",
};

export const isPlanInterval = (value: unknown): value is PlanInterval =>
  typeof value === "string" && planIntervals.includes(value as PlanInterval);

export const getPriceId = (planType: PlanInterval) =>
  requireServerEnvironment(priceEnvironmentKey[planType]);
import { requireServerEnvironment } from "@/lib/server-env";
