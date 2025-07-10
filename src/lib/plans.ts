export interface Plan {
  name: string;
  amount: number;
  currency: string;
  interval: string;
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

const priceIDMap: Record<string, string> = {
  week: process.env.STRIPE_PRICE_WEEKLY!,
  month: process.env.STRIPE_PRICE_MONTHLY!,
  year: process.env.STRIPE_PRICE_YEARLY!,
};

export const getPriceIDFromType = (planType: string) => priceIDMap[planType];
