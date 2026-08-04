import { POST } from "@/app/api/profile/change-plan/route";
import { createRequest, readResponse } from "./test-utils";

jest.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { profile: { findUnique: jest.fn(), update: jest.fn() } },
}));
const mockStripe = {
  subscriptions: { retrieve: jest.fn(), update: jest.fn() },
};
jest.mock("@/lib/stripe", () => ({
  getStripeClient: () => mockStripe,
}));
jest.mock("@/features/billing/plans", () => ({
  isPlanInterval: (value: string) => ["week", "month", "year"].includes(value),
  getPriceId: () => "price_month",
}));

import { getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("change-plan", () => {
  beforeEach(() => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue("u1");
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
      userId: "u1",
      stripeSubscriptionId: "sub_123",
    });
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      items: { data: [{ id: "si_1" }] },
    });
    mockStripe.subscriptions.update.mockResolvedValue({
      id: "sub_new",
      status: "active",
      cancel_at_period_end: false,
    });
    (prisma.profile.update as jest.Mock).mockResolvedValue({
      subscriptionTier: "month",
    });
  });

  it("updates plan", async () => {
    const res = await POST(
      createRequest("http://test.local/change", "POST", { newPlan: "month" }),
    );
    const response = await readResponse(res);

    expect(response.body).toMatchObject({
      subscription: { subscriptionTier: "month" },
    });
  });
});
